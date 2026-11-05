import Link from "next/link"
import {
  ArrowRight,
  CalendarCheck,
  KeyRound,
  QrCode,
  Scissors,
  ShieldCheck,
} from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"

export default function HomePage() {
  return (
    <div className="min-h-svh bg-stone-50 text-stone-900 transition-colors dark:bg-stone-950 dark:text-stone-50">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              SaaS de agendamento · Segurança OWASP
            </span>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              Lumina Studio
            </h1>
            <p className="mt-3 max-w-xl text-stone-600 dark:text-stone-400">
              Painel administrativo com autenticação segura (OWASP), RBAC e página
              pública de agendamento em passo a passo.
            </p>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-rose-700/20 hover:bg-rose-600"
          >
            <KeyRound className="size-4" />
            Entrar / Criar Conta
          </Link>
          <Link
            href="/dashboard/agenda"
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
          >
            Abrir painel
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/agendar/lumina"
            className="inline-flex items-center gap-2 rounded-xl border border-amber-300/80 bg-amber-50/70 px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-amber-100/70 dark:border-amber-800/60 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
          >
            Agendar como cliente
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              icon: CalendarCheck,
              title: "Agenda",
              text: "Cards por data, profissional e status.",
            },
            {
              icon: Scissors,
              title: "Serviços e equipe",
              text: "CRUD de serviços e horários de trabalho.",
            },
            {
              icon: QrCode,
              title: "Divulgação",
              text: "Link público /agendar/lumina e QR Code.",
            },
            {
              icon: ShieldCheck,
              title: "Autenticação OWASP",
              text: "Cookies HttpOnly, Rotação de Refresh Token, 2FA TOTP, Lockout e Auditoria.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs dark:border-stone-800 dark:bg-stone-900"
            >
              <span className="mb-3 inline-flex size-9 items-center justify-center rounded-xl bg-amber-100/80 text-rose-700 dark:bg-amber-950/50 dark:text-rose-400">
                <item.icon className="size-5" />
              </span>
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
