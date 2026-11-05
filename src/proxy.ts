import { NextResponse, type NextRequest } from "next/server"

import {
  ACCESS_COOKIE_NAME,
  CSRF_COOKIE_NAME,
} from "@/lib/security/cookies"
import { generateSecureToken, safeCompareHash } from "@/lib/security/crypto"

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-DNS-Prefetch-Control": "off",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }
  return response
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method.toUpperCase()

  // 1. Validação estrita de CORS e Origin/CSRF em rotas de mutação da API de Auth
  if (
    pathname.startsWith("/api/auth/") &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(method)
  ) {
    const origin = request.headers.get("origin")
    const host = request.headers.get("host")

    if (origin && host) {
      try {
        const originHost = new URL(origin).host
        if (originHost !== host) {
          return applySecurityHeaders(
            NextResponse.json(
              { error: "Requisição bloqueada pela política de CORS/Origin." },
              { status: 403 }
            )
          )
        }
      } catch {
        return applySecurityHeaders(
          NextResponse.json(
            { error: "Cabeçalho Origin inválido." },
            { status: 403 }
          )
        )
      }
    }

    // Validação Double-Submit Cookie contra CSRF
    const csrfCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value
    const csrfHeader = request.headers.get("x-csrf-token")
    if (!csrfCookie || !csrfHeader || !safeCompareHash(csrfCookie, csrfHeader)) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error:
              "Token CSRF ausente ou inválido. Recarregue a página e tente novamente.",
          },
          { status: 403 }
        )
      )
    }
  }

  const response = NextResponse.next()

  // 2. Garante a presença do cookie CSRF para o cliente enviar no header x-csrf-token
  if (!request.cookies.get(CSRF_COOKIE_NAME)?.value) {
    response.cookies.set(CSRF_COOKIE_NAME, generateSecureToken(24), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 12,
    })
  }

  // 3. Propaga indicador de sessão autenticada via header interno
  const hasAccessCookie = Boolean(
    request.cookies.get(ACCESS_COOKIE_NAME)?.value
  )
  response.headers.set("x-auth-session", hasAccessCookie ? "active" : "guest")

  return applySecurityHeaders(response)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}

