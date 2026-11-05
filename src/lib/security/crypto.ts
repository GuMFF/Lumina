import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto"
import type { UserRole } from "@/types"

const SCRYPT_PARAMS = {
  N: 16384, // Custo de CPU/Memória equivalente a Bcrypt cost >= 12 / Argon2id
  r: 8,
  p: 1,
  keylen: 64,
  maxmem: 32 * 1024 * 1024,
}

function deriveScrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password.normalize("NFKC"),
      salt,
      SCRYPT_PARAMS.keylen,
      {
        N: SCRYPT_PARAMS.N,
        r: SCRYPT_PARAMS.r,
        p: SCRYPT_PARAMS.p,
        maxmem: SCRYPT_PARAMS.maxmem,
      },
      (err, derivedKey) => {
        if (err) reject(err)
        else resolve(derivedKey)
      }
    )
  })
}

function getAuthSecret(): string {
  return (
    process.env.AUTH_JWT_SECRET ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "lumina-studio-owasp-high-entropy-fallback-secret-key-2026"
  )
}

/**
 * Gera hash de senha forte com salt criptográfico aleatório de 16 bytes (128 bits)
 * usando KDF memory-hard (scrypt N=16384, r=8, p=1).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = await deriveScrypt(password, salt)
  return `$scrypt$n=${SCRYPT_PARAMS.N},r=${SCRYPT_PARAMS.r},p=${SCRYPT_PARAMS.p}$${salt.toString("base64url")}$${derived.toString("base64url")}`
}

// Hash dummy pré-computado para garantir execução em tempo constante quando o usuário não existe
let cachedDummyHash: string | null = null
async function getDummyHash(): Promise<string> {
  if (!cachedDummyHash) {
    cachedDummyHash = await hashPassword("DummyPassword!2026#ConstantTime")
  }
  return cachedDummyHash
}

/**
 * Verifica a senha em tempo constante (timingSafeEqual).
 * Se `storedHash` for nulo (usuário inexistente), executa o KDF contra um hash dummy
 * para evitar Enumeração de Usuários por análise de tempo (Timing Attack).
 */
export async function verifyPasswordConstantTime(
  password: string,
  storedHash: string | null | undefined
): Promise<boolean> {
  const targetHash = storedHash || (await getDummyHash())
  const parts = targetHash.split("$")
  // Formato: ["", "scrypt", "n=16384,r=8,p=1", "<salt>", "<hash>"]
  if (parts.length !== 5 || parts[1] !== "scrypt") {
    await getDummyHash()
    return false
  }

  const salt = Buffer.from(parts[3], "base64url")
  const expectedKey = Buffer.from(parts[4], "base64url")
  const derivedKey = await deriveScrypt(password, salt)

  if (derivedKey.length !== expectedKey.length) {
    return false
  }

  const match = timingSafeEqual(derivedKey, expectedKey)
  return Boolean(storedHash) && match
}

/**
 * Gera um token criptograficamente seguro (CSPRNG) de alta entropia (256 bits).
 */
export function generateSecureToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url")
}

/**
 * Gera um código OTP numérico de 6 dígitos criptograficamente seguro.
 */
export function generateOtpCode(): string {
  return String(randomInt(100000, 1000000))
}

/**
 * Hash SHA-256 unidirecional para armazenar tokens de verificação/recuperação/refresh no banco.
 * Nunca armazenamos tokens em texto puro no banco de dados.
 */
export function hashToken(rawToken: string): string {
  return createHash("sha256")
    .update(`${rawToken.trim()}:${getAuthSecret()}`)
    .digest("hex")
}

/**
 * Compara dois hashes hexadecimais em tempo constante.
 */
export function safeCompareHash(hashA: string, hashB: string): boolean {
  const bufA = Buffer.from(hashA, "utf8")
  const bufB = Buffer.from(hashB, "utf8")
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export interface AccessTokenPayload {
  sub: string
  email: string
  name: string
  role: UserRole
  salonId: string
  sessionId: string
  type: "access"
  iat: number
  exp: number
}

export interface RefreshTokenPayload {
  sub: string
  sessionId: string
  familyId: string
  jti: string
  type: "refresh"
  iat: number
  exp: number
}

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60 // 15 minutos
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 dias
export const VERIFICATION_TOKEN_TTL_MS = 15 * 60 * 1000 // 15 minutos

function signJwtPayload(payload: object): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64url")
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = createHmac("sha256", getAuthSecret())
    .update(`${header}.${body}`)
    .digest("base64url")
  return `${header}.${body}.${signature}`
}

export function verifyJwtToken<T extends { exp: number; type: string }>(
  token: string,
  expectedType: T["type"]
): T | null {
  try {
    const segments = token.split(".")
    if (segments.length !== 3) return null
    const [header, body, signature] = segments
    const expectedSig = createHmac("sha256", getAuthSecret())
      .update(`${header}.${body}`)
      .digest("base64url")

    const sigBuf = Buffer.from(signature, "utf8")
    const expBuf = Buffer.from(expectedSig, "utf8")
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null
    }

    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as T
    const nowSec = Math.floor(Date.now() / 1000)
    if (!payload.exp || payload.exp <= nowSec || payload.type !== expectedType) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

export function issueAccessToken(input: {
  userId: string
  email: string
  name: string
  role: UserRole
  salonId: string
  sessionId: string
}): string {
  const now = Math.floor(Date.now() / 1000)
  const payload: AccessTokenPayload = {
    sub: input.userId,
    email: input.email,
    name: input.name,
    role: input.role,
    salonId: input.salonId,
    sessionId: input.sessionId,
    type: "access",
    iat: now,
    exp: now + ACCESS_TOKEN_TTL_SECONDS,
  }
  return signJwtPayload(payload)
}

export function issueRefreshToken(input: {
  userId: string
  sessionId: string
  familyId: string
}): { token: string; jti: string; expiresAt: Date } {
  const now = Math.floor(Date.now() / 1000)
  const jti = generateSecureToken(24)
  const exp = now + REFRESH_TOKEN_TTL_SECONDS
  const payload: RefreshTokenPayload = {
    sub: input.userId,
    sessionId: input.sessionId,
    familyId: input.familyId,
    jti,
    type: "refresh",
    iat: now,
    exp,
  }
  return {
    token: signJwtPayload(payload),
    jti,
    expiresAt: new Date(exp * 1000),
  }
}

// ============================================================================
// 2FA / TOTP (RFC 6238) + Criptografia Simétrica AES-256-GCM para Segredo TOTP
// ============================================================================

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

export function generateTotpSecret(byteLength = 20): string {
  const bytes = randomBytes(byteLength)
  let bits = 0
  let value = 0
  let output = ""
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }
  return output
}

function decodeBase32(base32: string): Buffer {
  const cleaned = base32.toUpperCase().replace(/[^A-Z2-7]/g, "")
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const ch of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(ch)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

export function generateTotpCode(
  base32Secret: string,
  timestampMs = Date.now(),
  stepSeconds = 30
): string {
  const counter = Math.floor(timestampMs / 1000 / stepSeconds)
  const counterBuf = Buffer.alloc(8)
  counterBuf.writeBigUInt64BE(BigInt(counter))
  const key = decodeBase32(base32Secret)
  const hmac = createHmac("sha1", key).update(counterBuf).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  return String(binary % 1_000_000).padStart(6, "0")
}

export function verifyTotpCode(
  base32Secret: string,
  code: string,
  windowSteps = 1
): boolean {
  const cleanCode = code.replace(/\D/g, "")
  if (cleanCode.length !== 6) return false
  const now = Date.now()
  for (let w = -windowSteps; w <= windowSteps; w++) {
    const candidate = generateTotpCode(base32Secret, now + w * 30_000)
    if (safeCompareHash(candidate, cleanCode)) {
      return true
    }
  }
  return false
}

export function encryptSecret(plainText: string): string {
  const key = createHash("sha256").update(getAuthSecret()).digest()
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`
}

export function decryptSecret(cipherText: string): string | null {
  try {
    const [ivB64, tagB64, dataB64] = cipherText.split(".")
    if (!ivB64 || !tagB64 || !dataB64) return null
    const key = createHash("sha256").update(getAuthSecret()).digest()
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(ivB64, "base64url")
    )
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"))
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64url")),
      decipher.final(),
    ])
    return decrypted.toString("utf8")
  } catch {
    return null
  }
}

