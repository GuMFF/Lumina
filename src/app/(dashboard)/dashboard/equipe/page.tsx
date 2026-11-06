import { TeamView } from "@/components/dashboard/TeamView"
import { MOCK_SALON } from "@/lib/mock-data"
import { getSalonData } from "@/lib/supabase/queries"

export const dynamic = "force-dynamic"

export default async function EquipePage() {
  const { salon, staff, workingHours, appointments, services } =
    await getSalonData()
  return (
    <TeamView
      salonId={salon?.id ?? MOCK_SALON.id}
      staff={staff}
      initialHours={workingHours}
      appointments={appointments}
      services={services}
    />
  )
}
