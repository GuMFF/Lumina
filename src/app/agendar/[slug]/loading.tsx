export default function BookingLoading() {
  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col gap-4 px-4 py-10">
      <div className="mx-auto size-12 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="mx-auto h-6 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800"
        />
      ))}
    </div>
  )
}
