import { NextResponse } from "next/server"

import { requestPasswordReset } from "@/lib/security/auth-service"
import { checkRateLimit, extractRequestContext } from "@/lib/security/rate-limit"
import { forgotPasswordSchema } from "@/lib/security/validation"

export async function POST(request: Request) {
  const { ip, userAgent } = extractRequestContext(request)

  const ipLimit = await checkRateLimit(`forgot:ip:${ip}`, {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 15 * 60 * 1000,
  })

  if (!ipLimit.allowed) {
    return NextResponse.json(
      {
        error: `Muitas solicitações de recuperação. Aguarde ${ipLimit.retryAfterSeconds}s.`,
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

  const parsed = forgotPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "E-mail inválido." },
      { status: 422 }
    )
  }

  const result = await requestPasswordReset({
    email: parsed.data.email,
    ipAddress: ip,
    userAgent,
  })

  return NextResponse.json({
    message:
      "Se o e-mail informado estiver cadastrado, um código de redefinição (válido por 15 minutos) foi enviado.",
    demoResetOtp: result.resetOtpPreview,
    demoResetToken: result.resetTokenPreview,
  })
}

