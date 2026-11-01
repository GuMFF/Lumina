import Link from "next/link"

export default function BookingNotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-zinc-50 px-4 text-center dark:bg-zinc-950">
      <h1 className="text-xl font-semibold">Salão não encontrado</h1>
      <p className="text-sm text-zinc-500">
        Verifique o link de divulgação ou use o slug de demonstração.
      </p>
      <Link
        href="/agendar/lumina"
        className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white"
      >
        Abrir Lumina Studio
      </Link>
    </div>
  )
}
