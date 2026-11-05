"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-2xs transition-colors hover:bg-amber-50/70 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800",
        className
      )}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      title="Alternar tema (atalho: tecla D)"
    >
      {isDark ? (
        <>
          <Sun className="size-3.5 text-amber-400" />
          <span>Modo Claro</span>
        </>
      ) : (
        <>
          <Moon className="size-3.5 text-rose-700" />
          <span>Modo Escuro</span>
        </>
      )}
    </button>
  )
}

