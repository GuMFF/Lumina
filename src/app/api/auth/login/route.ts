import { NextResponse } from "next/server"

import { authenticateUser } from "@/lib/security/auth-service"
import { setAuthCookies } from "@/lib/security/cookies"
import {
  checkRateLimit,
  extractRequestContext,
  resetRateLimit,
} from "@/lib/security/rate-limit"
import { loginSchema } from "@/lib/security/validation"

export async function POST(request: Request) {
  const { ip, userAgent } = extractRequestContext(request)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Credenciais inválidas." },
      { status: 422 }
    )
  }

  // Rate limiting duplo: por IP e por conta
  const [ipLimit, accountLimit] = await Promise.all([
    checkRateLimit(`login:ip:${ip}`, {
      maxAttempts: 12,
      windowMs: 15 * 60 * 1000,
      blockDurationMs: 15 * 60 * 1000,
    }),
    checkRateLimit(`login:acct:${parsed.data.email}`, {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000,
      blockDurationMs: 15 * 60 * 1000,
    }),
  ])

  if (!ipLimit.allowed || !accountLimit.allowed) {
    const retryAfter = Math.max(
      ipLimit.retryAfterSeconds,
      accountLimit.retryAfterSeconds
    )
    return NextResponse.json(
      {
        error: `Muitas tentativas de login consecutivas. Conta/IP bloqueado temporariamente por ${Math.ceil(retryAfter / 60)} min.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    )
  }

  const result = await authenticateUser({
    email: parsed.data.email,
    password: parsed.data.password,
    totpCode: parsed.data.totpCode,
    ipAddress: ip,
    userAgent,
  })

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        code: "code" in result ? result.code : undefined,
        email: "email" in result ? result.email : undefined,
      },
      { status: result.status }
    )
  }

  await resetRateLimit(`login:acct:${parsed.data.email}`)

  const response = NextResponse.json({
    message: "Autenticação realizada com sucesso.",
    user: result.user,
  })

  // Armazena Access Token (15m) e Refresh Token (7d) exclusivamente em cookies HttpOnly + SameSite=Strict
  setAuthCookies(response, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  })

  return response
}

