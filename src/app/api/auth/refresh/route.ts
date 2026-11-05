import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { rotateRefreshToken } from "@/lib/security/auth-service"
import {
  clearAuthCookies,
  REFRESH_COOKIE_NAME,
  setAuthCookies,
} from "@/lib/security/cookies"
import { extractRequestContext } from "@/lib/security/rate-limit"

export async function POST(request: Request) {
  const { ip, userAgent } = extractRequestContext(request)
  const cookieStore = await cookies()
  const rawRefreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value

  if (!rawRefreshToken) {
    return NextResponse.json(
      { error: "Refresh token ausente." },
      { status: 401 }
    )
  }

  const result = await rotateRefreshToken({
    rawRefreshToken,
    ipAddress: ip,
    userAgent,
  })

  if (!result.ok) {
    const errorResponse = NextResponse.json(
      { error: result.error },
      { status: 401 }
    )
    clearAuthCookies(errorResponse)
    return errorResponse
  }

  const response = NextResponse.json({
    message: "Sessão renovada com rotação automática de Refresh Token.",
    user: result.user,
  })

  setAuthCookies(response, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  })

  return response
}

