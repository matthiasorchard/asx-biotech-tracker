import { supabase } from '@/lib/supabase'
import CompaniesTable from '@/components/CompaniesTable'

export const revalidate = 1800

export default async function CompaniesPage() {
  const [{ data: companies }, { data: prices }] = await Promise.all([
    supabase.from('company_dashboard').select('*').order('market_cap_m', { ascending: false }),
    supabase.from('price_snapshot')
      .select('ticker,snapshot_date,close_price')
      .order('snapshot_date', { ascending: true }),
  ])

  // Group prices by ticker: { BOT: [0.04, 0.041, ...], ... }
  const priceMap: Record<string, number[]> = {}
  for (const row of prices ?? []) {
    if (row.close_price == null) continue
    if (!priceMap[row.ticker]) priceMap[row.ticker] = []
    priceMap[row.ticker].push(Number(row.close_price))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Companies</h1>
        <p className="text-slate-500 text-sm mt-1">All ASX-listed biotech &amp; medtech companies</p>
      </div>
      <CompaniesTable companies={companies ?? []} priceMap={priceMap} />
    </div>
  )
}
