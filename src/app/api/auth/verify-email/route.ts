import { NextResponse } from "next/server"

import { verifyUserEmail } from "@/lib/security/auth-service"
import { checkRateLimit, extractRequestContext } from "@/lib/security/rate-limit"
import { verifyEmailSchema } from "@/lib/security/validation"

export async function POST(request: Request) {
  const { ip, userAgent } = extractRequestContext(request)

  const ipLimit = await checkRateLimit(`verify:ip:${ip}`, {
    maxAttempts: 10,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 15 * 60 * 1000,
  })

  if (!ipLimit.allowed) {
    return NextResponse.json(
      {
        error: `Limite de tentativas excedido. Aguarde ${ipLimit.retryAfterSeconds}s.`,
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

  const parsed = verifyEmailSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      },
      { status: 422 }
    )
  }

  const result = await verifyUserEmail({
    email: parsed.data.email,
    code: parsed.data.code,
    ipAddress: ip,
    userAgent,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    message: "E-mail verificado com sucesso! Sua conta está ativa.",
    alreadyVerified: result.alreadyVerified,
  })
}

