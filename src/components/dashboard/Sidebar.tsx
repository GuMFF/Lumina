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
} from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/types"

const NAV_ITEMS = [
  {
    href: "/dashboard/agenda",
    label: "Agenda",
    icon: CalendarDays,
    roles: ["ADMIN", "STAFF"] as UserRole[],
  },
  {
    href: "/dashboard/servicos",
    label: "Serviços",
    icon: Scissors,
    roles: ["ADMIN"] as UserRole[],
  },
  {
    href: "/dashboard/equipe",
    label: "Equipe",
    icon: Users,
    roles: ["ADMIN"] as UserRole[],
  },
  {
    href: "/dashboard/divulgacao",
    label: "Link & QR Code",
    icon: QrCode,
    roles: ["ADMIN"] as UserRole[],
  },
  {
    href: "/dashboard/seguranca",
    label: "Segurança & Auth",
    icon: ShieldCheck,
    roles: ["ADMIN", "STAFF"] as UserRole[],
  },
]

interface SidebarProps {
  userRole: UserRole
  userName: string
  salonName: string
  onRoleChange?: (role: UserRole) => void
}

export function Sidebar({
  userRole,
  userName,
  salonName,
  onRoleChange,
}: SidebarProps) {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter((item) => item.roles.includes(userRole))

  return (
    <aside className="flex h-full w-64 flex-col border-r border-stone-200/80 bg-white/90 backdrop-blur-xl transition-colors dark:border-stone-800 dark:bg-stone-950/90">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-700 to-amber-600 text-white shadow-lg shadow-rose-700/20">
          <Sparkles className="size-5" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-50">
            {salonName}
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400">Painel de agendamentos</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {items.map((item) => {
          const active = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-rose-700 text-white shadow-sm shadow-rose-700/20"
                  : "text-stone-600 hover:bg-amber-50/80 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-stone-50"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="space-y-3 border-t border-stone-200 p-4 dark:border-stone-800">
        <ThemeToggle className="w-full justify-center" />
        <div>
          <p className="text-sm font-medium text-stone-900 dark:text-stone-50">
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
                  "rounded-md px-2 py-1 text-[11px] font-medium",
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
            className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 hover:underline dark:text-rose-400"
          >
            <Copy className="size-3" />
            Página pública
          </Link>
          <Link
            href="/login"
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
