import { NextResponse } from "next/server"

import { resetUserPassword } from "@/lib/security/auth-service"
import { clearAuthCookies } from "@/lib/security/cookies"
import { checkRateLimit, extractRequestContext } from "@/lib/security/rate-limit"
import { resetPasswordSchema } from "@/lib/security/validation"

export async function POST(request: Request) {
  const { ip, userAgent } = extractRequestContext(request)

  const ipLimit = await checkRateLimit(`reset:ip:${ip}`, {
    maxAttempts: 6,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 15 * 60 * 1000,
  })

  if (!ipLimit.allowed) {
    return NextResponse.json(
      {
        error: `Muitas tentativas de redefinição. Aguarde ${ipLimit.retryAfterSeconds}s.`,
      },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 })
  }

  const parsed = resetPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      },
      { status: 422 }
    )
  }

  const result = await resetUserPassword({
    email: parsed.data.email,
    token: parsed.data.token,
    newPassword: parsed.data.newPassword,
    ipAddress: ip,
    userAgent,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  const response = NextResponse.json({
    message:
      "Senha redefinida com sucesso! Todas as sessões ativas foram revogadas por segurança.",
  })

  // Limpa cookies da sessão atual além da revogação no banco
  clearAuthCookies(response)
  return response
}

