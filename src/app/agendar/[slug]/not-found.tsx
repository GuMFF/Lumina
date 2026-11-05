import Link from "next/link"

export default function BookingNotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-stone-50 px-4 text-center dark:bg-stone-950">
      <h1 className="text-xl font-semibold">Salão não encontrado</h1>
      <p className="text-sm text-stone-500">
        Verifique o link de divulgação ou use o slug de demonstração.
      </p>
      <Link
        href="/agendar/lumina"
        className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600"
      >
        Abrir Lumina Studio
      </Link>
    </div>
  )
}
