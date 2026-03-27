import { supabase } from '@/lib/supabase'
import CatalystsFilter from '@/components/CatalystsFilter'

export const revalidate = 1800

export default async function CatalystsPage() {
  const [{ data: catalysts }, { data: companies }] = await Promise.all([
    supabase.from('catalyst').select('*').order('expected_date', { ascending: true }),
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
        <h1 className="text-2xl font-bold text-white">Catalyst Calendar</h1>
        <p className="text-slate-500 text-sm mt-1">Upcoming clinical, regulatory and commercial milestones</p>
      </div>
      <CatalystsFilter catalysts={catalysts ?? []} companyMap={companyMap} />
    </div>
  )
}
