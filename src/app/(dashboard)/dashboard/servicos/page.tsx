import { ServicesView } from "@/components/dashboard/ServicesView"
import { MOCK_SALON } from "@/lib/mock-data"
import { getSalonData } from "@/lib/supabase/queries"

export const dynamic = "force-dynamic"

export default async function ServicosPage() {
  const { salon, services } = await getSalonData()
  return (
    <ServicesView
      salonId={salon?.id ?? MOCK_SALON.id}
      initialServices={services}
    />
  )
}
