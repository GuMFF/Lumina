"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Activity,
  KeyRound,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

import type { SecurityAuditEntry } from "@/lib/security/audit"

interface SessionUser {
  id: string
  name: string
  email: string
  role: string
  totpEnabled: boolean
}

function readCookie(name: string): string {
  if (typeof document === "undefined") return ""
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.split("=")[1] ?? "") : ""
}

export function SecurityView() {
  const router = useRouter()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [auditLogs, setAuditLogs] = useState<SecurityAuditEntry[]>([])
  const [totpSetup, setTotpSetup] = useState<{
    secret: string
    otpauthUrl: string
  } | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function loadSecurityState() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "same-origin" })
      const data = await res.json()
      setUser(data.user ?? null)
      setAuditLogs(data.auditLogs ?? [])
    } catch {
      // Ignora falha inicial
    }
  }

  useEffect(() => {
    loadSecurityState()
  }, [])

  async function handleRotateToken() {
    setLoading(true)
    setStatusMsg(null)
    const csrf = readCookie("lumina_csrf_token")
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
      headers: { "x-csrf-token": csrf },
    })
    const data = await res.json()
    setLoading(false)
    setStatusMsg(data.message ?? data.error)
    await loadSecurityState()
  }

  async function handleEnable2FA() {
    setLoading(true)
    setStatusMsg(null)
    const csrf = readCookie("lumina_csrf_token")
    const res = await fetch("/api/auth/me", {
      method: "POST",
      credentials: "same-origin",
      headers: { "x-csrf-token": csrf },
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok && data.secret) {
      setTotpSetup({ secret: data.secret, otpauthUrl: data.otpauthUrl })
      setStatusMsg(data.message)
      await loadSecurityState()
    } else {
      setStatusMsg(data.error ?? "Faça login em /login para ativar o 2FA.")
    }
  }

  async function handleLogout() {
    const csrf = readCookie("lumina_csrf_token")
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: { "x-csrf-token": csrf },
    })
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-rose-700 dark:text-rose-400">
            Segurança OWASP & Sessões
          </p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Central de Autenticação e Auditoria
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Gerencie cookies HttpOnly, rotação de Refresh Token, 2FA (TOTP) e logs de auditoria.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!user ? (
            <Link
              href="/login"
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-600 sm:w-auto"
            >
              <KeyRound className="size-4" />
              Fazer Login / Cadastrar
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-rose-50 hover:text-rose-700 sm:w-auto dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200"
            >
              <LogOut className="size-4" />
              Encerrar Sessão
            </button>
          )}
        </div>
      </header>

      {statusMsg ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/80 px-4 py-3 text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {statusMsg}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="size-4 shrink-0 text-rose-700 dark:text-rose-400" />
            Estado da Sessão (Cookies HttpOnly)
          </div>

          {user ? (
            <div className="space-y-2 text-sm">
              <p className="break-all">
                <span className="text-stone-500">Usuário:</span>{" "}
                <span className="font-medium">{user.name}</span> ({user.email})
              </p>
              <p>
                <span className="text-stone-500">Perfil RBAC:</span>{" "}
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                  {user.role}
                </span>
              </p>
              <p>
                <span className="text-stone-500">Status 2FA (TOTP):</span>{" "}
                <span className="font-medium">
                  {user.totpEnabled ? "Ativo" : "Desativado"}
                </span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Nenhuma sessão JWT autenticada no momento. Acesse{" "}
              <Link href="/login" className="font-medium text-rose-700 underline">
                /login
              </Link>{" "}
              ou{" "}
              <Link href="/cadastro" className="font-medium text-rose-700 underline">
                /cadastro
              </Link>{" "}
              para testar o fluxo completo.
            </p>
          )}

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={loading}
              onClick={handleRotateToken}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-rose-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-rose-600 disabled:opacity-60"
            >
              <RefreshCw className="size-3.5" />
              Rotacionar Refresh Token
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleEnable2FA}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50/80 px-3.5 py-2 text-xs font-medium text-stone-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-stone-800 dark:text-stone-100"
            >
              <Smartphone className="size-3.5 text-amber-600" />
              Configurar 2FA (TOTP)
            </button>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Smartphone className="size-4 shrink-0 text-amber-600" />
            Autenticação de Dois Fatores (2FA / TOTP)
          </div>
          {totpSetup ? (
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <div className="rounded-xl bg-white p-3 ring-1 ring-stone-200">
                <QRCodeSVG value={totpSetup.otpauthUrl} size={132} />
              </div>
              <div className="space-y-1.5 text-center text-xs sm:text-left">
                <p className="font-medium">
                  Escaneie no Google Authenticator ou Authy:
                </p>
                <p className="font-mono break-all text-rose-700 dark:text-amber-300">
                  {totpSetup.secret}
                </p>
                <p className="text-stone-500">
                  Segredo criptografado em repouso via AES-256-GCM.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Clique em <strong>Configurar 2FA (TOTP)</strong> para gerar a chave secreta Base32 e o QR Code compatível com aplicativos autenticadores.
            </p>
          )}
        </div>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 dark:border-stone-800 dark:bg-stone-900">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Activity className="size-4 shrink-0 text-rose-700 dark:text-rose-400" />
          Logs de Auditoria de Segurança (Recentes)
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-sm text-stone-500">
            Nenhum evento de segurança registrado ainda nesta sessão.
          </p>
        ) : (
          <>
            {/* Cards para Celular (md:hidden) */}
            <div className="space-y-2.5 md:hidden">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs dark:border-stone-800 dark:bg-stone-950"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-rose-700 dark:text-amber-300">
                      {log.eventType}
                    </span>
                    <span className="font-mono text-[11px] text-stone-500">
                      {log.ipAddress}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-stone-500">
                    {new Date(log.createdAt).toLocaleString("pt-BR")}
                  </p>
                  <p className="mt-1 font-mono text-[10px] break-all text-stone-500">
                    {JSON.stringify(log.metadata)}
                  </p>
                </div>
              ))}
            </div>

            {/* Tabela para Tablet/Desktop (hidden md:block) */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-stone-200 text-stone-500 uppercase dark:border-stone-800">
                  <tr>
                    <th className="py-2 pr-4">Evento</th>
                    <th className="py-2 pr-4">IP</th>
                    <th className="py-2 pr-4">Data / Hora</th>
                    <th className="py-2">Metadados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2.5 pr-4 font-mono font-semibold text-rose-700 dark:text-amber-300">
                        {log.eventType}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-stone-600 dark:text-stone-400">
                        {log.ipAddress}
                      </td>
                      <td className="py-2.5 pr-4 text-stone-500">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-stone-500">
                        {JSON.stringify(log.metadata)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
