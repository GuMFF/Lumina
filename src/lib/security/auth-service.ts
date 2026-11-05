import { MOCK_SALON } from "@/lib/mock-data"
import { createClient } from "@/lib/supabase/server"
import type { UserRole } from "@/types"

import { logSecurityEvent } from "./audit"
import {
  decryptSecret,
  encryptSecret,
  generateOtpCode,
  generateSecureToken,
  generateTotpSecret,
  hashPassword,
  hashToken,
  issueAccessToken,
  issueRefreshToken,
  safeCompareHash,
  VERIFICATION_TOKEN_TTL_MS,
  verifyJwtToken,
  verifyPasswordConstantTime,
  verifyTotpCode,
  type RefreshTokenPayload,
} from "./crypto"

export interface AuthUserRecord {
  id: string
  salonId: string
  name: string
  email: string
  passwordHash: string
  role: UserRole
  isVerified: boolean
  failedLoginAttempts: number
  lockoutCount: number
  lockedUntil: string | null
  totpEnabled: boolean
  totpSecretEncrypted: string | null
  lastLoginAt: string | null
  lastLoginIp: string | null
  createdAt: string
}

export interface AuthSessionRecord {
  id: string
  userId: string
  familyId: string
  refreshTokenHash: string
  ipAddress: string
  userAgent: string
  isRevoked: boolean
  revokedReason: string | null
  rotatedAt: string | null
  expiresAt: string
  createdAt: string
}

export interface VerificationTokenRecord {
  id: string
  userId: string
  purpose: "EMAIL_VERIFY" | "PASSWORD_RESET" | "TWO_FACTOR"
  tokenHash: string
  otpHash: string | null
  expiresAt: string
  consumedAt: string | null
  createdAt: string
}

// ============================================================================
// Persistência Híbrida (Supabase PostgreSQL + Store em Memória Sincronizado)
// ============================================================================

const usersStore = new Map<string, AuthUserRecord>()
const sessionsStore = new Map<string, AuthSessionRecord>()
const verificationStore = new Map<string, VerificationTokenRecord>()

const MAX_FAILED_ATTEMPTS = 5
const BASE_LOCKOUT_MS = 15 * 60 * 1000 // 15 minutos base, progressivo (15m, 30m, 60m...)

async function findUserByEmail(email: string): Promise<AuthUserRecord | null> {
  const normalized = email.toLowerCase().trim()
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("auth_users")
      .select("*")
      .eq("email", normalized)
      .maybeSingle()

    if (!error && data) {
      const record: AuthUserRecord = {
        id: data.id,
        salonId: data.salon_id ?? MOCK_SALON.id,
        name: data.name,
        email: data.email,
        passwordHash: data.password_hash,
        role: data.role,
        isVerified: Boolean(data.is_verified),
        failedLoginAttempts: Number(data.failed_login_attempts ?? 0),
        lockoutCount: Number(data.lockout_count ?? 0),
        lockedUntil: data.locked_until,
        totpEnabled: Boolean(data.totp_enabled),
        totpSecretEncrypted: data.totp_secret_encrypted,
        lastLoginAt: data.last_login_at,
        lastLoginIp: data.last_login_ip,
        createdAt: data.created_at,
      }
      usersStore.set(record.id, record)
      return record
    }
  } catch {
    // Fallback em memória
  }

  for (const user of usersStore.values()) {
    if (user.email === normalized) return user
  }
  return null
}

export async function findUserById(id: string): Promise<AuthUserRecord | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("auth_users")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (!error && data) {
      const record: AuthUserRecord = {
        id: data.id,
        salonId: data.salon_id ?? MOCK_SALON.id,
        name: data.name,
        email: data.email,
        passwordHash: data.password_hash,
        role: data.role,
        isVerified: Boolean(data.is_verified),
        failedLoginAttempts: Number(data.failed_login_attempts ?? 0),
        lockoutCount: Number(data.lockout_count ?? 0),
        lockedUntil: data.locked_until,
        totpEnabled: Boolean(data.totp_enabled),
        totpSecretEncrypted: data.totp_secret_encrypted,
        lastLoginAt: data.last_login_at,
        lastLoginIp: data.last_login_ip,
        createdAt: data.created_at,
      }
      usersStore.set(record.id, record)
      return record
    }
  } catch {
    // Fallback em memória
  }
  return usersStore.get(id) ?? null
}

async function saveUser(user: AuthUserRecord): Promise<void> {
  usersStore.set(user.id, user)
  try {
    const supabase = await createClient()
    await supabase.from("auth_users").upsert({
      id: user.id,
      salon_id: user.salonId,
      name: user.name,
      email: user.email,
      password_hash: user.passwordHash,
      role: user.role,
      is_verified: user.isVerified,
      failed_login_attempts: user.failedLoginAttempts,
      lockout_count: user.lockoutCount,
      locked_until: user.lockedUntil,
      totp_enabled: user.totpEnabled,
      totp_secret_encrypted: user.totpSecretEncrypted,
      last_login_at: user.lastLoginAt,
      last_login_ip: user.lastLoginIp,
      updated_at: new Date().toISOString(),
    })
  } catch {
    // Mantém em memória
  }
}

async function saveVerificationToken(record: VerificationTokenRecord): Promise<void> {
  verificationStore.set(record.id, record)
  try {
    const supabase = await createClient()
    await supabase.from("auth_verification_tokens").upsert({
      id: record.id,
      user_id: record.userId,
      purpose: record.purpose,
      token_hash: record.tokenHash,
      otp_hash: record.otpHash,
      expires_at: record.expiresAt,
      consumed_at: record.consumedAt,
      created_at: record.createdAt,
    })
  } catch {
    // Mantém em memória
  }
}

async function findActiveVerificationTokens(
  userId: string,
  purpose: VerificationTokenRecord["purpose"]
): Promise<VerificationTokenRecord[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("auth_verification_tokens")
      .select("*")
      .eq("user_id", userId)
      .eq("purpose", purpose)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })

    if (!error && data && data.length > 0) {
      return data.map((row) => ({
        id: row.id,
        userId: row.user_id,
        purpose: row.purpose,
        tokenHash: row.token_hash,
        otpHash: row.otp_hash,
        expiresAt: row.expires_at,
        consumedAt: row.consumed_at,
        createdAt: row.created_at,
      }))
    }
  } catch {
    // Fallback em memória
  }

  return Array.from(verificationStore.values())
    .filter(
      (t) => t.userId === userId && t.purpose === purpose && t.consumedAt === null
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

async function saveSession(session: AuthSessionRecord): Promise<void> {
  sessionsStore.set(session.id, session)
  try {
    const supabase = await createClient()
    await supabase.from("auth_sessions").upsert({
      id: session.id,
      user_id: session.userId,
      family_id: session.familyId,
      refresh_token_hash: session.refreshTokenHash,
      ip_address: session.ipAddress,
      user_agent: session.userAgent,
      is_revoked: session.isRevoked,
      revoked_reason: session.revokedReason,
      rotated_at: session.rotatedAt,
      expires_at: session.expiresAt,
      created_at: session.createdAt,
    })
  } catch {
    // Mantém em memória
  }
}

async function findSessionById(id: string): Promise<AuthSessionRecord | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("auth_sessions")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (!error && data) {
      const record: AuthSessionRecord = {
        id: data.id,
        userId: data.user_id,
        familyId: data.family_id,
        refreshTokenHash: data.refresh_token_hash,
        ipAddress: data.ip_address,
        userAgent: data.user_agent,
        isRevoked: Boolean(data.is_revoked),
        revokedReason: data.revoked_reason,
        rotatedAt: data.rotated_at,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
      }
      sessionsStore.set(record.id, record)
      return record
    }
  } catch {
    // Fallback em memória
  }
  return sessionsStore.get(id) ?? null
}

async function revokeSessionFamily(familyId: string, reason: string): Promise<void> {
  for (const session of sessionsStore.values()) {
    if (session.familyId === familyId) {
      session.isRevoked = true
      session.revokedReason = reason
    }
  }
  try {
    const supabase = await createClient()
    await supabase
      .from("auth_sessions")
      .update({ is_revoked: true, revoked_reason: reason })
      .eq("family_id", familyId)
  } catch {
    // Memória já atualizada
  }
}

export async function revokeAllUserSessions(
  userId: string,
  reason: string
): Promise<void> {
  for (const session of sessionsStore.values()) {
    if (session.userId === userId) {
      session.isRevoked = true
      session.revokedReason = reason
    }
  }
  try {
    const supabase = await createClient()
    await supabase
      .from("auth_sessions")
      .update({ is_revoked: true, revoked_reason: reason })
      .eq("user_id", userId)
  } catch {
    // Memória já atualizada
  }
}

// ============================================================================
// 1. CADASTRO DE USUÁRIO (Sign Up) — isVerified: false + OTP/Token Hash (15m)
// ============================================================================

export async function registerUser(input: {
  name: string
  email: string
  password: string
  role: UserRole
  ipAddress: string
  userAgent: string
}) {
  const existing = await findUserByEmail(input.email)
  if (existing) {
    // Previne enumeração direta ou reenvia código caso ainda não tenha sido verificado
    if (!existing.isVerified) {
      const otp = generateOtpCode()
      const rawToken = generateSecureToken(32)
      const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS).toISOString()

      await saveVerificationToken({
        id: crypto.randomUUID(),
        userId: existing.id,
        purpose: "EMAIL_VERIFY",
        tokenHash: hashToken(rawToken),
        otpHash: hashToken(otp),
        expiresAt,
        consumedAt: null,
        createdAt: new Date().toISOString(),
      })

      return {
        ok: true as const,
        userId: existing.id,
        email: existing.email,
        requiresVerification: true,
        verificationOtpPreview: otp,
        verificationTokenPreview: rawToken,
      }
    }

    // Executa hash dummy para manter tempo de resposta constante
    await hashPassword(input.password)
    return {
      ok: false as const,
      status: 409,
      error: "Não foi possível concluir o cadastro com os dados informados.",
    }
  }

  let defaultSalonId = "33c1fa76-592c-4850-b267-df7f18e11fd2"
  try {
    const supabase = await createClient()
    const { data: salon } = await supabase
      .from("salons")
      .select("id")
      .limit(1)
      .maybeSingle()
    if (salon?.id) defaultSalonId = salon.id
  } catch {
    // Mantém defaultSalonId
  }

  const passwordHash = await hashPassword(input.password)
  const userId = crypto.randomUUID()
  const now = new Date().toISOString()

  const newUser: AuthUserRecord = {
    id: userId,
    salonId: defaultSalonId,
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role,
    isVerified: false, // Requisito 1: Conta criada inicialmente com isVerified: false
    failedLoginAttempts: 0,
    lockoutCount: 0,
    lockedUntil: null,
    totpEnabled: false,
    totpSecretEncrypted: null,
    lastLoginAt: null,
    lastLoginIp: null,
    createdAt: now,
  }

  await saveUser(newUser)

  // Requisito 2: Geração de token criptograficamente seguro + OTP de 6 dígitos (TTL 15 min) armazenados via hash
  const otp = generateOtpCode()
  const rawToken = generateSecureToken(32)
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS).toISOString()

  await saveVerificationToken({
    id: crypto.randomUUID(),
    userId,
    purpose: "EMAIL_VERIFY",
    tokenHash: hashToken(rawToken),
    otpHash: hashToken(otp),
    expiresAt,
    consumedAt: null,
    createdAt: now,
  })

  await logSecurityEvent({
    userId,
    eventType: "REGISTER",
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { email: input.email, role: input.role, isVerified: false },
  })

  return {
    ok: true as const,
    userId,
    email: newUser.email,
    requiresVerification: true,
    verificationOtpPreview: otp,
    verificationTokenPreview: rawToken,
  }
}

// ============================================================================
// 2. VERIFICAÇÃO DE E-MAIL (OTP de 6 dígitos ou Token Único, Expiração 15m)
// ============================================================================

export async function verifyUserEmail(input: {
  email: string
  code: string
  ipAddress: string
  userAgent: string
}) {
  const user = await findUserByEmail(input.email)
  if (!user) {
    return {
      ok: false as const,
      status: 400,
      error: "Código de verificação inválido ou expirado.",
    }
  }

  if (user.isVerified) {
    return { ok: true as const, alreadyVerified: true }
  }

  const activeTokens = await findActiveVerificationTokens(user.id, "EMAIL_VERIFY")
  const candidateHash = hashToken(input.code)
  const now = Date.now()

  const matched = activeTokens.find((t) => {
    const notExpired = new Date(t.expiresAt).getTime() > now
    if (!notExpired) return false
    const tokenMatches = safeCompareHash(t.tokenHash, candidateHash)
    const otpMatches = t.otpHash ? safeCompareHash(t.otpHash, candidateHash) : false
    return tokenMatches || otpMatches
  })

  if (!matched) {
    return {
      ok: false as const,
      status: 400,
      error: "Código de verificação inválido ou expirado (validade de 15 minutos).",
    }
  }

  matched.consumedAt = new Date().toISOString()
  await saveVerificationToken(matched)

  user.isVerified = true
  await saveUser(user)

  await logSecurityEvent({
    userId: user.id,
    eventType: "EMAIL_VERIFIED",
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { email: user.email },
  })

  return { ok: true as const, alreadyVerified: false }
}

// ============================================================================
// 3. LOGIN SEGURO (Anti-Enumeração, Account Lockout Progressivo, 2FA, Sessão)
// ============================================================================

export async function authenticateUser(input: {
  email: string
  password: string
  totpCode?: string
  ipAddress: string
  userAgent: string
}) {
  const user = await findUserByEmail(input.email)

  // Executa SEMPRE a verificação de senha em tempo constante (mesmo se user == null)
  const passwordValid = await verifyPasswordConstantTime(
    input.password,
    user?.passwordHash
  )

  if (!user) {
    await logSecurityEvent({
      userId: null,
      eventType: "LOGIN_FAILED",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { reason: "unknown_email" },
    })
    return {
      ok: false as const,
      status: 401,
      error: "Credenciais inválidas.",
    }
  }

  // Verifica Account Lockout temporário progressivo
  if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
    const remainingMin = Math.ceil(
      (new Date(user.lockedUntil).getTime() - Date.now()) / 60_000
    )
    return {
      ok: false as const,
      status: 423,
      error: `Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em ${remainingMin} min.`,
    }
  }

  if (!passwordValid) {
    user.failedLoginAttempts += 1

    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockoutCount += 1
      const lockDuration =
        BASE_LOCKOUT_MS * Math.pow(2, Math.max(0, user.lockoutCount - 1))
      user.lockedUntil = new Date(Date.now() + lockDuration).toISOString()
      user.failedLoginAttempts = 0

      await saveUser(user)
      await logSecurityEvent({
        userId: user.id,
        eventType: "ACCOUNT_LOCKED",
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: {
          lockedUntil: user.lockedUntil,
          lockoutTier: user.lockoutCount,
        },
      })

      return {
        ok: false as const,
        status: 423,
        error:
          "Conta bloqueada temporariamente após 5 falhas consecutivas de autenticação.",
      }
    }

    await saveUser(user)
    await logSecurityEvent({
      userId: user.id,
      eventType: "LOGIN_FAILED",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: {
        failedAttempts: user.failedLoginAttempts,
        remainingBeforeLock: MAX_FAILED_ATTEMPTS - user.failedLoginAttempts,
      },
    })

    // Mensagem idêntica para prevenir enumeração de usuários (Requisito 3)
    return {
      ok: false as const,
      status: 401,
      error: "Credenciais inválidas.",
    }
  }

  // Confirmação de e-mail obrigatória antes de liberar o acesso completo (Requisito 2)
  if (!user.isVerified) {
    return {
      ok: false as const,
      status: 403,
      code: "EMAIL_NOT_VERIFIED",
      email: user.email,
      error:
        "Sua conta ainda não foi verificada. Confirme seu código de verificação de e-mail para continuar.",
    }
  }

  // Verificação 2FA / TOTP se habilitado na conta (Requisito 4)
  if (user.totpEnabled && user.totpSecretEncrypted) {
    if (!input.totpCode) {
      return {
        ok: false as const,
        status: 401,
        code: "TOTP_REQUIRED",
        error: "Informe o código de 6 dígitos do seu aplicativo autenticador (2FA).",
      }
    }
    const secret = decryptSecret(user.totpSecretEncrypted)
    if (!secret || !verifyTotpCode(secret, input.totpCode)) {
      user.failedLoginAttempts += 1
      await saveUser(user)
      await logSecurityEvent({
        userId: user.id,
        eventType: "LOGIN_FAILED",
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: { reason: "invalid_totp" },
      })
      return {
        ok: false as const,
        status: 401,
        code: "TOTP_REQUIRED",
        error: "Código de autenticação de dois fatores (2FA) inválido.",
      }
    }
  }

  // Login bem-sucedido: zera contadores de falha e registra IP/dispositivo
  const isNewIp = Boolean(user.lastLoginIp && user.lastLoginIp !== input.ipAddress)
  user.failedLoginAttempts = 0
  user.lockedUntil = null
  user.lastLoginAt = new Date().toISOString()
  user.lastLoginIp = input.ipAddress
  await saveUser(user)

  // Cria sessão e família de Refresh Token
  const sessionId = crypto.randomUUID()
  const familyId = crypto.randomUUID()
  const refresh = issueRefreshToken({
    userId: user.id,
    sessionId,
    familyId,
  })
  const accessToken = issueAccessToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    salonId: user.salonId,
    sessionId,
  })

  await saveSession({
    id: sessionId,
    userId: user.id,
    familyId,
    refreshTokenHash: hashToken(refresh.token),
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    isRevoked: false,
    revokedReason: null,
    rotatedAt: null,
    expiresAt: refresh.expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
  })

  await logSecurityEvent({
    userId: user.id,
    eventType: "LOGIN_SUCCESS",
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: {
      sessionId,
      isNewIpOrDevice: isNewIp,
    },
  })

  return {
    ok: true as const,
    accessToken,
    refreshToken: refresh.token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      salonId: user.salonId,
      totpEnabled: user.totpEnabled,
    },
  }
}

// ============================================================================
// 4. ROTAÇÃO DE REFRESH TOKEN & DETECÇÃO AUTOMÁTICA DE REUSO (OWASP)
// ============================================================================

export async function rotateRefreshToken(input: {
  rawRefreshToken: string
  ipAddress: string
  userAgent: string
}) {
  const payload = verifyJwtToken<RefreshTokenPayload>(
    input.rawRefreshToken,
    "refresh"
  )
  if (!payload) {
    return { ok: false as const, error: "Refresh token inválido ou expirado." }
  }

  const session = await findSessionById(payload.sessionId)
  if (!session) {
    return { ok: false as const, error: "Sessão não encontrada." }
  }

  const incomingHash = hashToken(input.rawRefreshToken)

  // DETECÇÃO DE REUSO: se a sessão já foi rotacionada ou revogada, ou o hash diverge,
  // um token antigo foi reutilizado (possível roubo de token). Revoga toda a família imediatamente!
  if (
    session.isRevoked ||
    session.rotatedAt !== null ||
    !safeCompareHash(session.refreshTokenHash, incomingHash)
  ) {
    await revokeSessionFamily(session.familyId, "TOKEN_REUSE_DETECTED")
    await logSecurityEvent({
      userId: session.userId,
      eventType: "TOKEN_REUSE_DETECTED",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: {
        sessionId: session.id,
        familyId: session.familyId,
      },
    })
    return {
      ok: false as const,
      error:
        "Alerta de segurança: reuso de token detectado. Todas as sessões desta família foram revogadas.",
    }
  }

  const user = await findUserById(session.userId)
  if (!user || !user.isVerified) {
    return { ok: false as const, error: "Usuário inválido." }
  }

  // Marca a sessão atual como rotacionada (uso único)
  session.rotatedAt = new Date().toISOString()
  session.isRevoked = true
  session.revokedReason = "ROTATED"
  await saveSession(session)

  // Emite nova sessão na mesma familyId
  const nextSessionId = crypto.randomUUID()
  const nextRefresh = issueRefreshToken({
    userId: user.id,
    sessionId: nextSessionId,
    familyId: session.familyId,
  })
  const nextAccess = issueAccessToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    salonId: user.salonId,
    sessionId: nextSessionId,
  })

  await saveSession({
    id: nextSessionId,
    userId: user.id,
    familyId: session.familyId,
    refreshTokenHash: hashToken(nextRefresh.token),
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    isRevoked: false,
    revokedReason: null,
    rotatedAt: null,
    expiresAt: nextRefresh.expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
  })

  await logSecurityEvent({
    userId: user.id,
    eventType: "TOKEN_ROTATED",
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: {
      previousSessionId: session.id,
      newSessionId: nextSessionId,
      familyId: session.familyId,
    },
  })

  return {
    ok: true as const,
    accessToken: nextAccess,
    refreshToken: nextRefresh.token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      salonId: user.salonId,
    },
  }
}

// ============================================================================
// 5. ESQUECI MINHA SENHA & REDEFINIÇÃO COM INVALIDAÇÃO DE TODAS AS SESSÕES
// ============================================================================

export async function requestPasswordReset(input: {
  email: string
  ipAddress: string
  userAgent: string
}) {
  const user = await findUserByEmail(input.email)
  if (!user) {
    // Tempo constante + resposta genérica contra enumeração de contas
    await hashPassword("DummyResetConstantTimeCheck!2026")
    return {
      ok: true as const,
      resetTokenPreview: null,
      resetOtpPreview: null,
    }
  }

  const rawToken = generateSecureToken(32)
  const otp = generateOtpCode()
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS).toISOString()

  await saveVerificationToken({
    id: crypto.randomUUID(),
    userId: user.id,
    purpose: "PASSWORD_RESET",
    tokenHash: hashToken(rawToken),
    otpHash: hashToken(otp),
    expiresAt,
    consumedAt: null,
    createdAt: new Date().toISOString(),
  })

  await logSecurityEvent({
    userId: user.id,
    eventType: "PASSWORD_RESET_REQUESTED",
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { email: user.email },
  })

  return {
    ok: true as const,
    resetTokenPreview: rawToken,
    resetOtpPreview: otp,
  }
}

export async function resetUserPassword(input: {
  email: string
  token: string
  newPassword: string
  ipAddress: string
  userAgent: string
}) {
  const user = await findUserByEmail(input.email)
  if (!user) {
    await hashPassword(input.newPassword)
    return {
      ok: false as const,
      status: 400,
      error: "Token de redefinição inválido ou expirado.",
    }
  }

  const activeTokens = await findActiveVerificationTokens(
    user.id,
    "PASSWORD_RESET"
  )
  const candidateHash = hashToken(input.token)
  const now = Date.now()

  const matched = activeTokens.find((t) => {
    const notExpired = new Date(t.expiresAt).getTime() > now
    if (!notExpired) return false
    const tokenMatches = safeCompareHash(t.tokenHash, candidateHash)
    const otpMatches = t.otpHash ? safeCompareHash(t.otpHash, candidateHash) : false
    return tokenMatches || otpMatches
  })

  if (!matched) {
    return {
      ok: false as const,
      status: 400,
      error: "Token de redefinição inválido ou expirado (validade de 15 minutos).",
    }
  }

  matched.consumedAt = new Date().toISOString()
  await saveVerificationToken(matched)

  user.passwordHash = await hashPassword(input.newPassword)
  user.failedLoginAttempts = 0
  user.lockedUntil = null
  user.isVerified = true
  await saveUser(user)

  // Requisito 2: Invalidação imediata de TODAS as sessões ativas após a troca da senha
  await revokeAllUserSessions(user.id, "PASSWORD_RESET")

  await logSecurityEvent({
    userId: user.id,
    eventType: "PASSWORD_RESET_COMPLETED",
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { allSessionsRevoked: true },
  })

  return { ok: true as const }
}

// ============================================================================
// 6. LOGOUT & 2FA (TOTP) SETUP
// ============================================================================

export async function logoutUserSession(input: {
  rawRefreshToken?: string
  userId?: string
  ipAddress: string
  userAgent: string
}) {
  if (input.rawRefreshToken) {
    const payload = verifyJwtToken<RefreshTokenPayload>(
      input.rawRefreshToken,
      "refresh"
    )
    if (payload) {
      const session = await findSessionById(payload.sessionId)
      if (session) {
        session.isRevoked = true
        session.revokedReason = "USER_LOGOUT"
        await saveSession(session)
      }
    }
  }

  await logSecurityEvent({
    userId: input.userId ?? null,
    eventType: "LOGOUT",
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  })
}

export async function setupUserTotp(input: {
  userId: string
  ipAddress: string
  userAgent: string
}) {
  const user = await findUserById(input.userId)
  if (!user) {
    return { ok: false as const, error: "Usuário não encontrado." }
  }

  const secret = generateTotpSecret()
  user.totpSecretEncrypted = encryptSecret(secret)
  user.totpEnabled = true
  await saveUser(user)

  const otpauthUrl = `otpauth://totp/LuminaStudio:${encodeURIComponent(user.email)}?secret=${secret}&issuer=LuminaStudio&algorithm=SHA1&digits=6&period=30`

  await logSecurityEvent({
    userId: user.id,
    eventType: "TOTP_ENABLED",
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  })

  return {
    ok: true as const,
    secret,
    otpauthUrl,
  }
}

