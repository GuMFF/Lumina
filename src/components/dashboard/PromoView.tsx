"use client"

import { useMemo, useState } from "react"
import { Check, Copy, Link2 } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

import type { Salon } from "@/types"

export function PromoView({ salon }: { salon: Salon }) {
  const [copied, setCopied] = useState(false)
  const bookingUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return `/agendar/${salon.slug}`
    }
    return `${window.location.origin}/agendar/${salon.slug}`
  }, [salon.slug])

  async function copyLink() {
    await navigator.clipboard.writeText(bookingUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-rose-700 dark:text-rose-400">Link & QR Code</p>
        <h1 className="text-2xl font-semibold tracking-tight">Divulgação do salão</h1>
        <p className="mt-1 text-sm text-stone-500">
          Compartilhe o link público de agendamento com seus clientes.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col items-center rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-amber-200">
            <QRCodeSVG value={bookingUrl} size={208} level="M" />
          </div>
          <p className="mt-4 text-center text-sm text-stone-500">
            Escaneie para abrir a página de agendamento.
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Link2 className="size-4 text-amber-600" />
            URL dinâmica
          </div>
          <p className="rounded-xl bg-stone-50 px-4 py-3 font-mono text-sm break-all text-stone-700 dark:bg-stone-950 dark:text-stone-300">
            {bookingUrl}
          </p>
          <p className="text-sm text-stone-500">
            Caminho público:{" "}
            <span className="font-medium text-stone-800 dark:text-stone-200">
              /agendar/{salon.slug}
            </span>
          </p>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-600"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Link copiado" : "Copiar link"}
          </button>
        </div>
      </div>
    </div>
  )
}
