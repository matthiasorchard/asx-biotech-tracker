import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { formatDate, formatMarketCap, stageLabel, formatRunway } from '@/lib/utils'
import { CategoryBadge, StageBadge, ImpactBadge, ConfidenceBadge } from '@/components/Badge'
import SectorChart from '@/components/SectorChart'

export const revalidate = 1800

async function getDashboardData() {
  const [companiesRes, announcementsRes, catalystsRes, pipelineRes, insiderRes] = await Promise.all([
    supabase.from('company_dashboard').select('*').order('market_cap_m', { ascending: false }),
    supabase.from('announcement').select('*').order('release_date', { ascending: false }).limit(12),
    supabase.from('catalyst').select('*').eq('status', 'upcoming').order('expected_date', { ascending: true }).limit(10),
    supabase.from('pipeline_asset').select('stage'),
    supabase.from('insider_tx').select('*').order('tx_date', { ascending: false }).limit(8),
  ])
  return {
    companies: companiesRes.data ?? [],
    announcements: announcementsRes.data ?? [],
    catalysts: catalystsRes.data ?? [],
    pipeline: pipelineRes.data ?? [],
    insiderTx: insiderRes.data ?? [],
  }
}

export default async function DashboardPage() {
  const { companies, announcements, catalysts, pipeline, insiderTx } = await getDashboardData()

  const totalMarketCap = companies.reduce((s: number, c: any) => s + (Number(c.market_cap_m) || 0), 0)
  const lowRunway = companies.filter((c: any) => c.cash_at_end !== null && !c.is_cf_positive && Number(c.runway_months) < 6).length

  const sectorMap: Record<string, number> = {}
  companies.forEach((c: any) => {
    const key = c.therapeutic_area || c.sector || 'Other'
    sectorMap[key] = (sectorMap[key] || 0) + 1
  })
  const sectorData = Object.entries(sectorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }))

  const stageMap: Record<string, number> = {}
  pipeline.forEach((p: any) => {
    const s = p.stage || 'unknown'
    stageMap[s] = (stageMap[s] || 0) + 1
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Market Overview</h1>
        <p className="text-slate-500 text-sm mt-1">ASX-listed biotech &amp; medtech companies</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Companies Tracked', value: String(companies.length), sub: 'active on ASX' },
          { label: 'Total Market Cap', value: formatMarketCap(totalMarketCap), sub: 'combined' },
          { label: 'Pipeline Assets', value: String(pipeline.length), sub: 'across all companies' },
          { label: 'Upcoming Catalysts', value: String(catalysts.length), sub: 'next events' },
        ].map((s: any) => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-xs text-slate-500 mb-1">{s.label}</div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-slate-600 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {lowRunway > 0 && (
        <div className="bg-rose-950/40 border border-rose-900 rounded-lg px-4 py-3 text-sm text-rose-300 flex items-center gap-2">
          <span>⚠</span>
          <span><strong>{lowRunway} {lowRunway === 1 ? 'company has' : 'companies have'}</strong> less than 6 months cash runway</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h2 className="text-sm font-medium text-slate-300 mb-3">Therapeutic Area Breakdown</h2>
          <SectorChart data={sectorData} />
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h2 className="text-sm font-medium text-slate-300 mb-4">Pipeline Stage Distribution</h2>
          <div className="space-y-2.5">
            {Object.entries(stageMap)
              .filter(([s]) => s !== 'discontinued')
              .sort((a, b) => {
                const order = ['discovery','preclinical','phase_1','phase_1_2','phase_2','phase_2_3','phase_3','nda_filed','approved']
                return order.indexOf(a[0]) - order.indexOf(b[0])
              })
              .map(([stage, count]) => (
                <div key={stage} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-slate-400 text-right shrink-0">{stageLabel(stage)}</div>
                  <div className="flex-1 bg-slate-800 rounded-full h-2">
                    <div className="bg-cyan-600 h-2 rounded-full" style={{ width: `${(count / pipeline.length) * 100}%` }} />
                  </div>
                  <div className="text-xs text-slate-400 w-4">{count}</div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-4">
        <div className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <h2 className="text-sm font-medium text-slate-300">Recent Announcements</h2>
            <Link href="/announcements" className="text-xs text-cyan-500 hover:text-cyan-400">View all →</Link>
          </div>
          <div className="divide-y divide-slate-800">
            {announcements.map((a: any) => (
              <div key={a.id} className="px-4 py-3 hover:bg-slate-800/40 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Link href={`/companies/${a.ticker}`} className="text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 shrink-0">{a.ticker}</Link>
                      <CategoryBadge category={a.category} />
                      {a.is_price_sensitive && <span className="text-xs text-amber-400 border border-amber-800 rounded px-1">Price Sensitive</span>}
                    </div>
                    <a href={a.asx_url} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-200 hover:text-white line-clamp-1">{a.title}</a>
                  </div>
                  <div className="text-xs text-slate-600 shrink-0">{formatDate(a.release_date)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <h2 className="text-sm font-medium text-slate-300">Upcoming Catalysts</h2>
            <Link href="/catalysts" className="text-xs text-cyan-500 hover:text-cyan-400">View all →</Link>
          </div>
          <div className="divide-y divide-slate-800">
            {catalysts.length === 0 && <div className="px-4 py-6 text-center text-slate-600 text-sm">No upcoming catalysts</div>}
            {catalysts.map((c: any) => (
              <div key={c.id} className="px-4 py-3 hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <Link href={`/companies/${c.ticker}`} className="text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300">{c.ticker}</Link>
                  <ImpactBadge impact={c.impact} />
                </div>
                <div className="text-sm text-slate-200 line-clamp-1 mb-1">{c.title}</div>
                <div className="flex items-center justify-between">
                  <ConfidenceBadge confidence={c.confidence} />
                  <span className="text-xs text-slate-600">{formatDate(c.expected_date)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insider activity */}
      {insiderTx.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <h2 className="text-sm font-medium text-slate-300">Recent Director Transactions</h2>
            <span className="text-xs text-slate-600">last 30 days</span>
          </div>
          <div className="divide-y divide-slate-800">
            {insiderTx.map((tx: any) => (
              <div key={tx.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <Link href={`/companies/${tx.ticker}`} className="font-mono text-xs font-bold text-cyan-400 hover:text-cyan-300 shrink-0 w-10">{tx.ticker}</Link>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${
                    tx.tx_type === 'buy' ? 'bg-emerald-950 text-emerald-400' :
                    tx.tx_type === 'sell' ? 'bg-rose-950 text-rose-400' :
                    'bg-slate-800 text-slate-400'
                  }`}>{tx.tx_type?.replace(/_/g, ' ').toUpperCase()}</span>
                  <span className="text-slate-400 text-xs truncate">{tx.director_name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs shrink-0">
                  {tx.value && <span className="text-slate-300">${Number(tx.value).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>}
                  {tx.shares && <span className="text-slate-500 hidden md:inline">{Number(tx.shares).toLocaleString()} sh</span>}
                  <span className="text-slate-600">{tx.tx_date?.slice(0, 10)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h2 className="text-sm font-medium text-slate-300">All Companies</h2>
          <Link href="/companies" className="text-xs text-cyan-500 hover:text-cyan-400">Full view →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-800">
                <th className="text-left px-4 py-2 font-medium">Ticker</th>
                <th className="text-left px-4 py-2 font-medium">Company</th>
                <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Therapeutic Area</th>
                <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Lead Stage</th>
                <th className="text-right px-4 py-2 font-medium">Mkt Cap</th>
                <th className="text-right px-4 py-2 font-medium hidden md:table-cell">Cash</th>
                <th className="text-right px-4 py-2 font-medium hidden md:table-cell">Runway</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {companies.map((c: any) => (
                <tr key={c.ticker} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-2.5">
                    <Link href={`/companies/${c.ticker}`} className="font-mono font-bold text-cyan-400 hover:text-cyan-300">{c.ticker}</Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-300">{c.name}</td>
                  <td className="px-4 py-2.5 text-slate-400 hidden md:table-cell">{c.therapeutic_area || c.sector || '—'}</td>
                  <td className="px-4 py-2.5 hidden md:table-cell"><StageBadge stage={c.most_advanced_stage} /></td>
                  <td className="px-4 py-2.5 text-right text-slate-300">{formatMarketCap(c.market_cap_m)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-400 hidden md:table-cell">
                    {c.cash_at_end ? `$${Number(c.cash_at_end).toFixed(1)}M` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right hidden md:table-cell">
                    {(() => { const r = formatRunway(c); return <span className={r.className}>{r.text}</span> })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
