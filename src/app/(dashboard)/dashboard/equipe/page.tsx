import { TeamView } from "@/components/dashboard/TeamView"
import { getSalonData } from "@/lib/supabase/queries"

export const dynamic = "force-dynamic"

export default async function EquipePage() {
  const { staff, workingHours } = await getSalonData()
  return <TeamView staff={staff} initialHours={workingHours} />
}
