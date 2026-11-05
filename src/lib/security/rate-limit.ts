import { createClient } from "@/lib/supabase/server"

interface RateLimitBucket {
  attempts: number
  windowStart: number
  blockedUntil: number | null
}

const memoryBuckets = new Map<string, RateLimitBucket>()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export function extractRequestContext(request: Request): {
  ip: string
  userAgent: string
} {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const ip = forwarded?.split(",")[0]?.trim() || realIp?.trim() || "127.0.0.1"
  const userAgent = request.headers.get("user-agent")?.slice(0, 255) || "unknown"
  return { ip, userAgent }
}

/**
 * Rate Limiter progressivo por chave (ex: `ip:127.0.0.1` ou `acct:email@dominio.com`).
 * Persiste no Supabase (`public.auth_rate_limits`) com fallback em memória.
 */
export async function checkRateLimit(
  key: string,
  options: {
    maxAttempts?: number
    windowMs?: number
    blockDurationMs?: number
  } = {}
): Promise<RateLimitResult> {
  const maxAttempts = options.maxAttempts ?? 10
  const windowMs = options.windowMs ?? 15 * 60 * 1000 // 15 min
  const blockDurationMs = options.blockDurationMs ?? 15 * 60 * 1000 // 15 min
  const now = Date.now()

  const existing = memoryBuckets.get(key)
  if (existing?.blockedUntil && existing.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.blockedUntil - now) / 1000),
    }
  }

  let bucket: RateLimitBucket
  if (!existing || now - existing.windowStart > windowMs) {
    bucket = { attempts: 1, windowStart: now, blockedUntil: null }
  } else {
    bucket = {
      ...existing,
      attempts: existing.attempts + 1,
    }
  }

  if (bucket.attempts > maxAttempts) {
    bucket.blockedUntil = now + blockDurationMs
    memoryBuckets.set(key, bucket)
    await persistRateLimit(key, bucket)
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(blockDurationMs / 1000),
    }
  }

  memoryBuckets.set(key, bucket)
  await persistRateLimit(key, bucket)

  return {
    allowed: true,
    remaining: Math.max(0, maxAttempts - bucket.attempts),
    retryAfterSeconds: 0,
  }
}

export async function resetRateLimit(key: string): Promise<void> {
  memoryBuckets.delete(key)
  try {
    const supabase = await createClient()
    await supabase.from("auth_rate_limits").delete().eq("key", key)
  } catch {
    // Fallback em memória já limpo
  }
}

async function persistRateLimit(key: string, bucket: RateLimitBucket) {
  try {
    const supabase = await createClient()
    await supabase.from("auth_rate_limits").upsert({
      key,
      attempts: bucket.attempts,
      window_start: new Date(bucket.windowStart).toISOString(),
      blocked_until: bucket.blockedUntil
        ? new Date(bucket.blockedUntil).toISOString()
        : null,
    })
  } catch {
    // Mantém em memória caso a tabela ainda não esteja acessível
  }
}

