"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Menu } from "lucide-react"

import { MOCK_PROFILES, MOCK_SALON } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import type { Profile, Salon, UserRole } from "@/types"

import { Sidebar } from "./Sidebar"

const ADMIN_ONLY_PATHS = [
  "/dashboard/servicos",
  "/dashboard/equipe",
  "/dashboard/divulgacao",
]

export function DashboardShell({
  children,
  initialSalon,
  initialProfiles,
}: {
  children: React.ReactNode
  initialSalon?: Salon | null
  initialProfiles?: Profile[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState<UserRole>("ADMIN")
  const [mobileOpen, setMobileOpen] = useState(false)

  const salon = initialSalon ?? MOCK_SALON
  const profiles =
    initialProfiles && initialProfiles.length > 0
      ? initialProfiles
      : MOCK_PROFILES

  useEffect(() => {
    const stored = window.localStorage.getItem("demo-role")
    if (stored === "ADMIN" || stored === "STAFF") {
      setRole(stored)
    }
  }, [])

  useEffect(() => {
    if (role === "STAFF" && ADMIN_ONLY_PATHS.some((path) => pathname.startsWith(path))) {
      router.replace("/dashboard/agenda")
    }
  }, [pathname, role, router])

  const profile = useMemo(
    () =>
      profiles.find((item) =>
        role === "ADMIN" ? item.role === "ADMIN" : item.role === "STAFF"
      ) ?? profiles[0],
    [profiles, role]
  )

  function handleRoleChange(nextRole: UserRole) {
    setRole(nextRole)
    window.localStorage.setItem("demo-role", nextRole)
  }

  return (
    <div className="flex min-h-svh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="hidden lg:block">
        <Sidebar
          userRole={role}
          userName={profile?.name ?? "Admin"}
          salonName={salon.name}
          onRoleChange={handleRoleChange}
        />
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-950/40"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          />
          <div className="relative z-50 h-full w-64">
            <Sidebar
              userRole={role}
              userName={profile?.name ?? "Admin"}
              salonName={salon.name}
              onRoleChange={handleRoleChange}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-zinc-200 bg-white/70 px-4 py-3 backdrop-blur lg:hidden dark:border-zinc-800 dark:bg-zinc-950/70">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            )}
            aria-label="Abrir menu"
          >
            <Menu className="size-4" />
          </button>
          <p className="text-sm font-semibold">{salon.name}</p>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
