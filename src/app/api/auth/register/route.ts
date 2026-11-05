import { NextResponse } from "next/server"

import { registerUser } from "@/lib/security/auth-service"
import { checkRateLimit, extractRequestContext } from "@/lib/security/rate-limit"
import { registerSchema } from "@/lib/security/validation"

export async function POST(request: Request) {
  const { ip, userAgent } = extractRequestContext(request)

  // Rate limit por IP para evitar criação automatizada em massa de contas
  const ipLimit = await checkRateLimit(`register:ip:${ip}`, {
    maxAttempts: 10,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 15 * 60 * 1000,
  })

  if (!ipLimit.allowed) {
    return NextResponse.json(
      {
        error: `Muitas tentativas de cadastro. Aguarde ${ipLimit.retryAfterSeconds}s.`,
      },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return NextResponse.json(
      {
        error: firstIssue?.message ?? "Dados de cadastro inválidos.",
        issues: parsed.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 422 }
    )
  }

  const result = await registerUser({
    name: parsed.data.name,
    email: parsed.data.email,
    password: parsed.data.password,
    role: parsed.data.role,
    ipAddress: ip,
    userAgent,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(
    {
      message:
        "Conta criada com status isVerified: false. Confirme seu código de 6 dígitos para ativar o acesso.",
      email: result.email,
      requiresVerification: true,
      // Exibido em ambiente de demonstração para teste imediato sem servidor SMTP externo
      demoOtp: result.verificationOtpPreview,
    },
    { status: 201 }
  )
}

