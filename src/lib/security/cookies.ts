import { cookies } from "next/headers"
import type { NextResponse } from "next/server"

import {
  ACCESS_TOKEN_TTL_SECONDS,
  generateSecureToken,
  REFRESH_TOKEN_TTL_SECONDS,
  safeCompareHash,
} from "./crypto"

export const ACCESS_COOKIE_NAME = "lumina_access_token"
export const REFRESH_COOKIE_NAME = "lumina_refresh_token"
export const CSRF_COOKIE_NAME = "lumina_csrf_token"

const isProduction = process.env.NODE_ENV === "production"

/**
 * Define os cookies de Access Token e Refresh Token com flags estritas:
 * - HttpOnly: true (inacessível via JavaScript/XSS; nunca exposto no localStorage)
 * - Secure: true em produção (HTTPS)
 * - SameSite: "strict" (proteção contra CSRF)
 */
export function setAuthCookies(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken: string }
) {
  response.cookies.set(ACCESS_COOKIE_NAME, tokens.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  })

  response.cookies.set(REFRESH_COOKIE_NAME, tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
  })
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  })

  response.cookies.set(REFRESH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  })
}

export function issueCsrfCookie(response: NextResponse): string {
  const token = generateSecureToken(24)
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Double-submit cookie pattern: lido pelo cliente para enviar no header x-csrf-token
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 12,
  })
  return token
}

export async function verifyCsrfFromRequest(request: Request): Promise<boolean> {
  const headerToken = request.headers.get("x-csrf-token")
  if (!headerToken) return false
  const cookieStore = await cookies()
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value
  if (!cookieToken) return false
  return safeCompareHash(headerToken, cookieToken)
}

