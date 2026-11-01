import { AgendaView } from "@/components/dashboard/AgendaView"
import { getSalonData } from "@/lib/supabase/queries"

export const dynamic = "force-dynamic"

export default async function AgendaPage() {
  const { appointments, profiles, services } = await getSalonData()
  return (
    <AgendaView
      appointments={appointments}
      profiles={profiles}
      services={services}
    />
  )
}
