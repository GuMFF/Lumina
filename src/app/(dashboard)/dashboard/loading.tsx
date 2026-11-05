export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800" />
      <div className="h-4 w-72 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800" />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-800"
          />
        ))}
      </div>
    </div>
  )
}
