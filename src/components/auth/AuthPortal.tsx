"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import {
  evaluatePasswordStrength,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "@/lib/security/validation"
import { cn } from "@/lib/utils"

export type AuthMode = "login" | "register" | "verify" | "forgot" | "reset"

function readCookie(name: string): string {
  if (typeof document === "undefined") return ""
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.split("=")[1] ?? "") : ""
}

export function AuthPortal({ initialMode = "login" }: { initialMode?: AuthMode }) {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [csrfToken, setCsrfToken] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [demoCode, setDemoCode] = useState<string | null>(null)
  const [requiresTotp, setRequiresTotp] = useState(false)

  // Campos de formulário
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [totpCode, setTotpCode] = useState("")

  useEffect(() => {
    async function initCsrf() {
      const existing = readCookie("lumina_csrf_token")
      if (existing) {
        setCsrfToken(existing)
      }
      try {
        const res = await fetch("/api/auth/csrf", { credentials: "same-origin" })
        const data = (await res.json()) as { csrfToken?: string }
        if (data.csrfToken) {
          setCsrfToken(data.csrfToken)
        }
      } catch {
        // Ignora erro de rede inicial
      }
    }
    initCsrf()
  }, [])

  const passwordStrength = useMemo(
    () => evaluatePasswordStrength(password),
    [password]
  )

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError(null)
    setInfo(null)
  }

  async function securePost(url: string, payload: unknown) {
    const token = readCookie("lumina_csrf_token") || csrfToken
    const res = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": token,
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    return { res, data }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setInfo(null)

    if (mode === "register") {
      const parsed = registerSchema.safeParse({
        name,
        email,
        password,
        confirmPassword,
        role: "ADMIN",
      })
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Verifique os campos.")
        return
      }

      setLoading(true)
      const { res, data } = await securePost("/api/auth/register", parsed.data)
      setLoading(false)

      if (!res.ok) {
        setError(data.error ?? "Erro ao realizar cadastro.")
        return
      }

      setInfo(data.message)
      if (data.demoOtp) {
        setDemoCode(data.demoOtp)
        setOtpCode(data.demoOtp)
      }
      setMode("verify")
      return
    }

    if (mode === "verify") {
      const parsed = verifyEmailSchema.safeParse({
        email,
        code: otpCode,
      })
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Código inválido.")
        return
      }

      setLoading(true)
      const { res, data } = await securePost("/api/auth/verify-email", parsed.data)
      setLoading(false)

      if (!res.ok) {
        setError(data.error ?? "Falha na verificação.")
        return
      }

      setDemoCode(null)
      setInfo("Conta verificada com sucesso! Agora você já pode fazer login.")
      setMode("login")
      return
    }

    if (mode === "login") {
      const parsed = loginSchema.safeParse({
        email,
        password,
        totpCode: requiresTotp ? totpCode : undefined,
      })
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Credenciais inválidas.")
        return
      }

      setLoading(true)
      const { res, data } = await securePost("/api/auth/login", parsed.data)
      setLoading(false)

      if (!res.ok) {
        if (data.code === "EMAIL_NOT_VERIFIED") {
          setError(data.error)
          setMode("verify")
          return
        }
        if (data.code === "TOTP_REQUIRED") {
          setRequiresTotp(true)
          setError(data.error)
          return
        }
        setError(data.error ?? "Credenciais inválidas.")
        return
      }

      router.push("/dashboard/agenda")
      router.refresh()
      return
    }

    if (mode === "forgot") {
      const parsed = forgotPasswordSchema.safeParse({ email })
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Informe um e-mail válido.")
        return
      }

      setLoading(true)
      const { res, data } = await securePost(
        "/api/auth/forgot-password",
        parsed.data
      )
      setLoading(false)

      if (!res.ok) {
        setError(data.error ?? "Não foi possível processar a solicitação.")
        return
      }

      setInfo(data.message)
      if (data.demoResetOtp) {
        setDemoCode(data.demoResetOtp)
        setOtpCode(data.demoResetOtp)
      }
      setPassword("")
      setConfirmPassword("")
      setMode("reset")
      return
    }

    if (mode === "reset") {
      const parsed = resetPasswordSchema.safeParse({
        email,
        token: otpCode,
        newPassword: password,
        confirmPassword,
      })
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Verifique os dados informados.")
        return
      }

      setLoading(true)
      const { res, data } = await securePost(
        "/api/auth/reset-password",
        parsed.data
      )
      setLoading(false)

      if (!res.ok) {
        setError(data.error ?? "Erro ao redefinir a senha.")
        return
      }

      setDemoCode(null)
      setInfo(data.message)
      setPassword("")
      setConfirmPassword("")
      setMode("login")
    }
  }

  return (
    <div className="min-h-svh bg-stone-50 px-4 py-10 text-stone-900 transition-colors dark:bg-stone-950 dark:text-stone-50">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
          >
            <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-rose-700 to-amber-600 text-white">
              <Sparkles className="size-4" />
            </span>
            Lumina Studio
          </Link>
          <ThemeToggle />
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div className="mb-5 flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-100/80 text-rose-700 dark:bg-amber-950/60 dark:text-amber-300">
              {mode === "register" ? (
                <UserPlus className="size-5" />
              ) : mode === "verify" ? (
                <ShieldCheck className="size-5" />
              ) : mode === "forgot" || mode === "reset" ? (
                <KeyRound className="size-5" />
              ) : (
                <Lock className="size-5" />
              )}
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {mode === "login" && "Acesso Seguro ao Painel"}
                {mode === "register" && "Criar Conta Administrativa"}
                {mode === "verify" && "Verificar E-mail (OTP)"}
                {mode === "forgot" && "Recuperar Senha"}
                {mode === "reset" && "Redefinir Senha"}
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Protegido por cookies HttpOnly, CSRF Double-Submit & Rate Limit
              </p>
            </div>
          </div>

          {/* Abas rápidas Login / Cadastro */}
          {mode === "login" || mode === "register" ? (
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-950">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={cn(
                  "rounded-lg py-2 text-xs font-semibold transition-colors",
                  mode === "login"
                    ? "bg-white text-rose-700 shadow-2xs dark:bg-stone-800 dark:text-rose-300"
                    : "text-stone-500 hover:text-stone-800 dark:text-stone-400"
                )}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={cn(
                  "rounded-lg py-2 text-xs font-semibold transition-colors",
                  mode === "register"
                    ? "bg-white text-rose-700 shadow-2xs dark:bg-stone-800 dark:text-rose-300"
                    : "text-stone-500 hover:text-stone-800 dark:text-stone-400"
                )}
              >
                Criar Conta
              </button>
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          ) : null}

          {info ? (
            <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <span>{info}</span>
            </div>
          ) : null}

          {demoCode && (mode === "verify" || mode === "reset") ? (
            <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <p className="font-semibold">
                Código OTP gerado (expira em 15 minutos):
              </p>
              <p className="mt-1 font-mono text-base font-bold tracking-widest text-rose-700 dark:text-amber-300">
                {demoCode}
              </p>
              <p className="mt-0.5 text-[11px] opacity-80">
                Armazenado via hash SHA-256 no banco de dados.
              </p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === "register" ? (
              <label className="grid gap-1.5 text-xs font-medium">
                Nome Completo
                <input
                  required
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Gustavo Faria"
                  className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm outline-none ring-rose-600 focus:bg-white focus:ring-2 dark:border-stone-700 dark:bg-stone-950"
                />
              </label>
            ) : null}

            <label className="grid gap-1.5 text-xs font-medium">
              E-mail
              <div className="relative">
                <Mail className="pointer-events-none absolute top-3 left-3.5 size-4 text-stone-400" />
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@lumina.studio"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pr-3.5 pl-10 text-sm outline-none ring-rose-600 focus:bg-white focus:ring-2 dark:border-stone-700 dark:bg-stone-950"
                />
              </div>
            </label>

            {mode === "verify" || mode === "reset" ? (
              <label className="grid gap-1.5 text-xs font-medium">
                Código OTP de 6 dígitos (ou Token)
                <input
                  required
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="000000"
                  className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-center font-mono text-base tracking-widest outline-none ring-rose-600 focus:bg-white focus:ring-2 dark:border-stone-700 dark:bg-stone-950"
                />
              </label>
            ) : null}

            {mode === "login" || mode === "register" || mode === "reset" ? (
              <label className="grid gap-1.5 text-xs font-medium">
                {mode === "reset" ? "Nova Senha Forte" : "Senha"}
                <div className="relative">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pr-10 pl-3.5 text-sm outline-none ring-rose-600 focus:bg-white focus:ring-2 dark:border-stone-700 dark:bg-stone-950"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute top-2.5 right-3 text-stone-400 hover:text-stone-600"
                    aria-label="Alternar visibilidade da senha"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </label>
            ) : null}

            {mode === "register" || mode === "reset" ? (
              <>
                <label className="grid gap-1.5 text-xs font-medium">
                  Confirmar Senha
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm outline-none ring-rose-600 focus:bg-white focus:ring-2 dark:border-stone-700 dark:bg-stone-950"
                  />
                </label>

                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-950">
                  <div className="mb-2 flex items-center justify-between text-[11px] font-medium">
                    <span>Política de Senha Forte (OWASP)</span>
                    <span className="text-rose-700 dark:text-amber-300">
                      {passwordStrength.score}/5 requisitos
                    </span>
                  </div>
                  <div className="mb-2.5 grid grid-cols-5 gap-1">
                    {[1, 2, 3, 4, 5].map((idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "h-1.5 rounded-full transition-colors",
                          idx <= passwordStrength.score
                            ? passwordStrength.score === 5
                              ? "bg-emerald-500"
                              : "bg-amber-500"
                            : "bg-stone-200 dark:bg-stone-800"
                        )}
                      />
                    ))}
                  </div>
                  <ul className="grid gap-1 text-[11px]">
                    {passwordStrength.checks.map((check) => (
                      <li
                        key={check.id}
                        className={cn(
                          "flex items-center gap-1.5",
                          check.passed
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-stone-500"
                        )}
                      >
                        <span className="size-1.5 rounded-full bg-current" />
                        {check.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : null}

            {mode === "login" && requiresTotp ? (
              <label className="grid gap-1.5 text-xs font-medium">
                Código 2FA / Autenticador (6 dígitos)
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="123456"
                  className="rounded-xl border border-amber-400 bg-amber-50/40 px-3.5 py-2.5 text-center font-mono text-base tracking-widest outline-none ring-rose-600 focus:ring-2 dark:bg-stone-950"
                />
              </label>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-700 py-3 text-sm font-semibold text-white shadow-sm shadow-rose-700/20 transition-colors hover:bg-rose-600 disabled:opacity-60"
            >
              {loading
                ? "Processando com segurança..."
                : mode === "login"
                  ? "Entrar no Painel"
                  : mode === "register"
                    ? "Criar Conta Segura"
                    : mode === "verify"
                      ? "Confirmar E-mail"
                      : mode === "forgot"
                        ? "Enviar Código de Recuperação"
                        : "Salvar Nova Senha e Revogar Sessões"}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 pt-4 text-xs dark:border-stone-800">
            {mode === "login" ? (
              <>
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="font-medium text-rose-700 hover:underline dark:text-rose-400"
                >
                  Esqueci minha senha
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("verify")}
                  className="text-stone-500 hover:underline dark:text-stone-400"
                >
                  Já tenho código OTP
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="font-medium text-rose-700 hover:underline dark:text-rose-400"
              >
                Voltar para o Login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

