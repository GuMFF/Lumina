import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { CSRF_COOKIE_NAME, issueCsrfCookie } from "@/lib/security/cookies"

export async function GET() {
  const cookieStore = await cookies()
  const existing = cookieStore.get(CSRF_COOKIE_NAME)?.value
  const response = NextResponse.json({ csrfToken: existing ?? "" })

  if (!existing) {
    const token = issueCsrfCookie(response)
    return NextResponse.json(
      { csrfToken: token },
      { headers: response.headers }
    )
  }

  return response
}

