import { z } from "zod"

/**
 * Sanitiza strings removendo caracteres de controle ASCII invisíveis,
 * tags HTML perigosas e espaços excedentes (OWASP Input Validation).
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .trim()
}

export function normalizeEmail(input: string): string {
  return sanitizeText(input).toLowerCase()
}

/**
 * Política de senha forte (OWASP ASVS v4.0):
 * - Mínimo de 8 e máximo de 128 caracteres
 * - Pelo menos 1 letra maiúscula [A-Z]
 * - Pelo menos 1 letra minúscula [a-z]
 * - Pelo menos 1 número [0-9]
 * - Pelo menos 1 símbolo especial [^A-Za-z0-9]
 */
export const strongPasswordSchema = z
  .string()
  .min(8, "A senha deve ter no mínimo 8 caracteres.")
  .max(128, "A senha deve ter no máximo 128 caracteres.")
  .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula.")
  .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula.")
  .regex(/[0-9]/, "A senha deve conter pelo menos um número.")
  .regex(
    /[^A-Za-z0-9]/,
    "A senha deve conter pelo menos um símbolo especial (ex: !@#$%&*)."
  )

export const emailSchema = z
  .string()
  .transform(normalizeEmail)
  .pipe(
    z
      .string()
      .min(5, "Informe um e-mail válido.")
      .max(254, "O e-mail excede o limite de 254 caracteres.")
      .email("Formato de e-mail inválido.")
  )

export const registerSchema = z
  .object({
    name: z
      .string()
      .transform(sanitizeText)
      .pipe(
        z
          .string()
          .min(2, "O nome deve ter pelo menos 2 caracteres.")
          .max(100, "O nome deve ter no máximo 100 caracteres.")
      ),
    salonName: z
      .string()
      .optional()
      .transform((val) => (val ? sanitizeText(val) : "Lumina Studio")),
    email: emailSchema,
    password: strongPasswordSchema,
    confirmPassword: z.string(),
    role: z.enum(["ADMIN", "STAFF"]).default("ADMIN"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  })

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Informe sua senha.")
    .max(128, "Senha inválida."),
  totpCode: z
    .string()
    .optional()
    .transform((v) => (v ? v.replace(/\D/g, "") : undefined))
    .refine((v) => !v || v.length === 6, {
      message: "O código 2FA deve conter 6 dígitos numéricos.",
    }),
})

export const verifyEmailSchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .transform((v) => sanitizeText(v))
    .pipe(z.string().min(6, "Informe o código de 6 dígitos ou token de verificação.")),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    token: z
      .string()
      .transform(sanitizeText)
      .pipe(z.string().min(6, "Token ou código de recuperação inválido.")),
    newPassword: strongPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "A confirmação de senha não confere.",
  })

export const totpVerifySchema = z.object({
  code: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().length(6, "O código 2FA deve ter exatamente 6 dígitos.")),
})

export function evaluatePasswordStrength(password: string) {
  const checks = [
    { id: "length", label: "Mínimo de 8 caracteres", passed: password.length >= 8 },
    { id: "upper", label: "Letra maiúscula (A-Z)", passed: /[A-Z]/.test(password) },
    { id: "lower", label: "Letra minúscula (a-z)", passed: /[a-z]/.test(password) },
    { id: "digit", label: "Número (0-9)", passed: /[0-9]/.test(password) },
    {
      id: "symbol",
      label: "Símbolo especial (!@#$%&*)",
      passed: /[^A-Za-z0-9]/.test(password),
    },
  ]
  const score = checks.filter((c) => c.passed).length
  return { checks, score, isValid: score === checks.length }
}

