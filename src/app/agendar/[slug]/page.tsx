import { notFound } from "next/navigation"

import { BookingWizard } from "@/components/booking/BookingWizard"
import { getSalonData } from "@/lib/supabase/queries"

export const dynamic = "force-dynamic"

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { salon, services, staff, workingHours, appointments } =
    await getSalonData(slug)

  if (!salon) {
    notFound()
  }

  return (
    <div className="min-h-svh bg-zinc-50 px-4 py-8 dark:bg-zinc-950">
      <BookingWizard
        salon={salon}
        services={services}
        staff={staff}
        workingHours={workingHours}
        appointments={appointments}
      />
    </div>
  )
}
