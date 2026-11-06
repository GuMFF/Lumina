"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarDays,
  Copy,
  KeyRound,
  QrCode,
  Scissors,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/types"

export const NAV_ITEMS = [
  {
    href: "/dashboard/agenda",
    label: "Agenda",
    shortLabel: "Agenda",
    icon: CalendarDays,
    roles: ["ADMIN", "STAFF"] as UserRole[],
  },
  {
    href: "/dashboard/servicos",
    label: "Serviços",
    shortLabel: "Serviços",
    icon: Scissors,
    roles: ["ADMIN"] as UserRole[],
  },
  {
    href: "/dashboard/equipe",
    label: "Equipe",
    shortLabel: "Equipe",
    icon: Users,
    roles: ["ADMIN"] as UserRole[],
  },
  {
    href: "/dashboard/divulgacao",
    label: "Link & QR Code",
    shortLabel: "QR Code",
    icon: QrCode,
    roles: ["ADMIN"] as UserRole[],
  },
  {
    href: "/dashboard/seguranca",
    label: "Segurança & Auth",
    shortLabel: "Segurança",
    icon: ShieldCheck,
    roles: ["ADMIN", "STAFF"] as UserRole[],
  },
]

interface SidebarProps {
  userRole: UserRole
  userName: string
  salonName: string
  onRoleChange?: (role: UserRole) => void
  onNavigate?: () => void
}

export function Sidebar({
  userRole,
  userName,
  salonName,
  onRoleChange,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter((item) => item.roles.includes(userRole))

  return (
    <aside className="flex h-full w-72 max-w-[85vw] flex-col border-r border-stone-200/80 bg-white/95 backdrop-blur-xl transition-colors lg:w-64 dark:border-stone-800 dark:bg-stone-950/95">
      <div className="flex items-center justify-between gap-3 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-700 to-amber-600 text-white shadow-lg shadow-rose-700/20">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-50">
              {salonName}
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Painel de agendamentos
            </p>
          </div>
        </div>

        {onNavigate ? (
          <button
            type="button"
            onClick={onNavigate}
            className="inline-flex size-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 lg:hidden dark:hover:bg-stone-900"
            aria-label="Fechar menu lateral"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        {items.map((item) => {
          const active = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-rose-700 text-white shadow-sm shadow-rose-700/20"
                  : "text-stone-600 hover:bg-amber-50/80 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-stone-50"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="space-y-3 border-t border-stone-200 p-4 dark:border-stone-800">
        <ThemeToggle alwaysShowLabel className="w-full justify-center" />
        <div>
          <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-50">
            {userName}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {userRole === "ADMIN" ? "Administrador" : "Prestador"}
          </p>
        </div>
        {onRoleChange ? (
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-stone-100 p-1 dark:bg-stone-900">
            {(["ADMIN", "STAFF"] as UserRole[]).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => onRoleChange(role)}
                className={cn(
                  "min-h-8 rounded-md px-2 py-1 text-[11px] font-medium",
                  userRole === role
                    ? "bg-white text-rose-700 shadow-sm dark:bg-stone-800 dark:text-rose-300"
                    : "text-stone-500 dark:text-stone-400"
                )}
              >
                {role}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex items-center justify-between pt-1">
          <Link
            href="/agendar/lumina"
            onClick={onNavigate}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 hover:underline dark:text-rose-400"
          >
            <Copy className="size-3" />
            Página pública
          </Link>
          <Link
            href="/login"
            onClick={onNavigate}
            className="inline-flex items-center gap-1 text-xs font-medium text-stone-600 hover:text-rose-700 dark:text-stone-400"
          >
            <KeyRound className="size-3" />
            Login
          </Link>
        </div>
      </div>
    </aside>
  )
}
