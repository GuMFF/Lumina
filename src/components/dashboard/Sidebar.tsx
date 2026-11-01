"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarDays,
  Copy,
  QrCode,
  Scissors,
  Sparkles,
  Users,
} from "lucide-react"

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
    <aside className="flex h-full w-64 flex-col border-r border-zinc-200/80 bg-white/80 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex size-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-600/20">
          <Sparkles className="size-5" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {salonName}
          </p>
          <p className="text-xs text-zinc-500">Painel de agendamentos</p>
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
                  ? "bg-violet-600 text-white shadow-sm shadow-violet-600/20"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="space-y-3 border-t border-zinc-200 p-4 dark:border-zinc-800">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {userName}
          </p>
          <p className="text-xs text-zinc-500">
            {userRole === "ADMIN" ? "Administrador" : "Prestador"}
          </p>
        </div>
        {onRoleChange ? (
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
            {(["ADMIN", "STAFF"] as UserRole[]).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => onRoleChange(role)}
                className={cn(
                  "rounded-md px-2 py-1 text-[11px] font-medium",
                  userRole === role
                    ? "bg-white text-violet-700 shadow-sm dark:bg-zinc-800 dark:text-violet-300"
                    : "text-zinc-500"
                )}
              >
                {role}
              </button>
            ))}
          </div>
        ) : null}
        <Link
          href="/agendar/lumina"
          className="inline-flex items-center gap-1.5 text-xs text-violet-600 hover:underline"
        >
          <Copy className="size-3" />
          Ver página pública
        </Link>
      </div>
    </aside>
  )
}
