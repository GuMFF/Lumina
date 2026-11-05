import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { getRecentAuditLogs } from "@/lib/security/audit"
import { findUserById, setupUserTotp } from "@/lib/security/auth-service"
import { ACCESS_COOKIE_NAME } from "@/lib/security/cookies"
import { verifyJwtToken, type AccessTokenPayload } from "@/lib/security/crypto"
import { extractRequestContext } from "@/lib/security/rate-limit"

export async function GET() {
  const cookieStore = await cookies()
  const rawAccess = cookieStore.get(ACCESS_COOKIE_NAME)?.value
  const payload = rawAccess
    ? verifyJwtToken<AccessTokenPayload>(rawAccess, "access")
    : null

  if (!payload) {
    const auditLogs = await getRecentAuditLogs()
    return NextResponse.json({
      authenticated: false,
      user: null,
      auditLogs,
    })
  }

  const user = await findUserById(payload.sub)
  const auditLogs = await getRecentAuditLogs(payload.sub)

  return NextResponse.json({
    authenticated: true,
    user: {
      id: payload.sub,
      name: user?.name ?? payload.name,
      email: payload.email,
      role: user?.role ?? payload.role,
      salonId: payload.salonId,
      totpEnabled: Boolean(user?.totpEnabled),
    },
    auditLogs,
  })
}

export async function POST(request: Request) {
  const { ip, userAgent } = extractRequestContext(request)
  const cookieStore = await cookies()
  const rawAccess = cookieStore.get(ACCESS_COOKIE_NAME)?.value
  const payload = rawAccess
    ? verifyJwtToken<AccessTokenPayload>(rawAccess, "access")
    : null

  if (!payload) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
  }

  const result = await setupUserTotp({
    userId: payload.sub,
    ipAddress: ip,
    userAgent,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({
    message: "Autenticação de Dois Fatores (2FA / TOTP) ativada na conta.",
    secret: result.secret,
    otpauthUrl: result.otpauthUrl,
  })
}

