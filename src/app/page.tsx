import Link from "next/link"
import { ArrowRight, CalendarCheck, QrCode, Scissors } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-svh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
        <div>
          <p className="text-sm font-medium text-violet-600">SaaS de agendamento</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            Lumina Studio
          </h1>
          <p className="mt-3 max-w-xl text-zinc-600 dark:text-zinc-400">
            Painel administrativo com RBAC e página pública de agendamento em
            passo a passo, pronta para demonstração com dados mockados.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/agenda"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
          >
            Abrir painel
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/agendar/lumina"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
          >
            Agendar como cliente
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
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
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <item.icon className="mb-3 size-5 text-violet-600" />
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 text-sm text-zinc-500">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
