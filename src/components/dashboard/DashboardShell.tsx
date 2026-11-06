"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu } from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { MOCK_PROFILES, MOCK_SALON } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import type { Profile, Salon, UserRole } from "@/types"

import { NAV_ITEMS, Sidebar } from "./Sidebar"

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
    if (
      role === "STAFF" &&
      ADMIN_ONLY_PATHS.some((path) => pathname.startsWith(path))
    ) {
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

  const visibleNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => item.roles.includes(role)),
    [role]
  )

  function handleRoleChange(nextRole: UserRole) {
    setRole(nextRole)
    window.localStorage.setItem("demo-role", nextRole)
  }

  return (
    <div className="flex min-h-svh bg-stone-50 text-stone-900 transition-colors dark:bg-stone-950 dark:text-stone-50">
      {/* Sidebar fixa no Desktop (lg+) */}
      <div className="hidden lg:sticky lg:top-0 lg:block lg:h-svh">
        <Sidebar
          userRole={role}
          userName={profile?.name ?? "Admin"}
          salonName={salon.name}
          onRoleChange={handleRoleChange}
        />
      </div>

      {/* Gaveta lateral para Celulares e Tablets */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-stone-950/50 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          />
          <div className="relative z-10 h-full w-72 max-w-[85vw]">
            <Sidebar
              userRole={role}
              userName={profile?.name ?? "Admin"}
              salonName={salon.name}
              onRoleChange={handleRoleChange}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Cabeçalho superior responsivo para Celulares e Tablets */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-stone-200 bg-white/90 px-3 py-2.5 backdrop-blur-md sm:px-5 lg:hidden dark:border-stone-800 dark:bg-stone-950/90">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className={cn(
                "inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"
              )}
              aria-label="Abrir menu"
            >
              <Menu className="size-4" />
            </button>
            <p className="truncate text-sm font-semibold">{salon.name}</p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="flex rounded-lg bg-stone-100 p-0.5 dark:bg-stone-900">
              {(["ADMIN", "STAFF"] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRoleChange(r)}
                  className={cn(
                    "rounded-md px-2 py-1 text-[10px] font-semibold",
                    role === r
                      ? "bg-white text-rose-700 shadow-2xs dark:bg-stone-800 dark:text-rose-300"
                      : "text-stone-500"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-3 pt-4 pb-24 sm:px-6 sm:pt-6 md:px-8 lg:pb-10">
          {children}
        </main>

        {/* Barra de Navegação Inferior para Celulares e Tablets (lg:hidden) */}
        <nav
          aria-label="Navegação rápida mobile"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 px-2 py-1.5 backdrop-blur-lg lg:hidden dark:border-stone-800 dark:bg-stone-950/95"
        >
          <div
            className="mx-auto grid max-w-md gap-1"
            style={{
              gridTemplateColumns: `repeat(${visibleNavItems.length}, minmax(0, 1fr))`,
            }}
          >
            {visibleNavItems.map((item) => {
              const active = pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition-colors",
                    active
                      ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                      : "text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="max-w-full truncate px-1">
                    {item.shortLabel}
                  </span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
