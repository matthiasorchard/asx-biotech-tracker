import { supabase } from '@/lib/supabase'
import AnnouncementsFilter from '@/components/AnnouncementsFilter'

export const revalidate = 900

export default async function AnnouncementsPage() {
  const [{ data: announcements }, { data: companies }] = await Promise.all([
    supabase.from('announcement').select('*').order('release_date', { ascending: false }).limit(500),
    supabase.from('company_dashboard').select('ticker,name,runway_months,cash_at_end,is_cf_positive'),
  ])

  const companyMap = Object.fromEntries(
    (companies ?? []).map((c: any) => [c.ticker, {
      name: c.name,
      runway_months: c.runway_months,
      cash_at_end: c.cash_at_end,
      is_cf_positive: c.is_cf_positive,
    }])
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Announcements</h1>
        <p className="text-slate-500 text-sm mt-1">All ASX announcements across tracked companies</p>
      </div>
      <AnnouncementsFilter announcements={announcements ?? []} companyMap={companyMap} />
    </div>
  )
}
