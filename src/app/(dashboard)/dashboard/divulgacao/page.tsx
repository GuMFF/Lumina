import { PromoView } from "@/components/dashboard/PromoView"
import { MOCK_SALON } from "@/lib/mock-data"
import { getSalonData } from "@/lib/supabase/queries"

export const dynamic = "force-dynamic"

export default async function DivulgacaoPage() {
  const { salon } = await getSalonData()
  return <PromoView salon={salon ?? MOCK_SALON} />
}
