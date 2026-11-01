import { DashboardShell } from "@/components/dashboard/DashboardShell"
import { getSalonData } from "@/lib/supabase/queries"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { salon, profiles } = await getSalonData()
  return (
    <DashboardShell initialSalon={salon} initialProfiles={profiles}>
      {children}
    </DashboardShell>
  )
}
