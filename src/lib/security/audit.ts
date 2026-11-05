import { createClient } from "@/lib/supabase/server"

export type SecurityAuditEventType =
  | "REGISTER"
  | "EMAIL_VERIFIED"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "ACCOUNT_LOCKED"
  | "TOKEN_ROTATED"
  | "TOKEN_REUSE_DETECTED"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED"
  | "LOGOUT"
  | "CSRF_BLOCKED"
  | "TOTP_ENABLED"

export interface SecurityAuditEntry {
  id: string
  userId: string | null
  eventType: SecurityAuditEventType
  ipAddress: string
  userAgent: string
  metadata: Record<string, unknown>
  createdAt: string
}

const recentAuditBuffer: SecurityAuditEntry[] = []

export async function logSecurityEvent(input: {
  userId?: string | null
  eventType: SecurityAuditEventType
  ipAddress: string
  userAgent: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const entry: SecurityAuditEntry = {
    id: crypto.randomUUID(),
    userId: input.userId ?? null,
    eventType: input.eventType,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: input.metadata ?? {},
    createdAt: new Date().toISOString(),
  }

  recentAuditBuffer.unshift(entry)
  if (recentAuditBuffer.length > 100) {
    recentAuditBuffer.pop()
  }

  try {
    const supabase = await createClient()
    await supabase.from("auth_audit_logs").insert({
      id: entry.id,
      user_id: entry.userId,
      event_type: entry.eventType,
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent,
      metadata: entry.metadata,
      created_at: entry.createdAt,
    })
  } catch {
    // Mantém registro no buffer em memória caso o banco esteja indisponível
  }
}

export async function getRecentAuditLogs(
  userId?: string
): Promise<SecurityAuditEntry[]> {
  try {
    const supabase = await createClient()
    let query = supabase
      .from("auth_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)

    if (userId) {
      query = query.eq("user_id", userId)
    }

    const { data, error } = await query
    if (!error && data && data.length > 0) {
      return data.map((row) => ({
        id: row.id,
        userId: row.user_id,
        eventType: row.event_type as SecurityAuditEventType,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        metadata: (row.metadata as Record<string, unknown>) ?? {},
        createdAt: row.created_at,
      }))
    }
  } catch {
    // Usa buffer em memória
  }

  return userId
    ? recentAuditBuffer.filter((item) => item.userId === userId).slice(0, 20)
    : recentAuditBuffer.slice(0, 20)
}

