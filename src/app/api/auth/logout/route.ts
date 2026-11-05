import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { logoutUserSession } from "@/lib/security/auth-service"
import {
  ACCESS_COOKIE_NAME,
  clearAuthCookies,
  REFRESH_COOKIE_NAME,
} from "@/lib/security/cookies"
import { verifyJwtToken, type AccessTokenPayload } from "@/lib/security/crypto"
import { extractRequestContext } from "@/lib/security/rate-limit"

export async function POST(request: Request) {
  const { ip, userAgent } = extractRequestContext(request)
  const cookieStore = await cookies()
  const rawRefresh = cookieStore.get(REFRESH_COOKIE_NAME)?.value
  const rawAccess = cookieStore.get(ACCESS_COOKIE_NAME)?.value

  const accessPayload = rawAccess
    ? verifyJwtToken<AccessTokenPayload>(rawAccess, "access")
    : null

  await logoutUserSession({
    rawRefreshToken: rawRefresh,
    userId: accessPayload?.sub,
    ipAddress: ip,
    userAgent,
  })

  const response = NextResponse.json({
    message: "Sessão encerrada com segurança.",
  })

  clearAuthCookies(response)
  return response
}

