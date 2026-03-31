import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { formatDate, formatMarketCap, formatRunway } from '@/lib/utils'
import { CategoryBadge, ImpactBadge, ConfidenceBadge } from '@/components/Badge'

export const revalidate = 1800

async function getDashboardData() {
  const [companiesRes, announcementsRes, catalystsRes, insiderRes] = await Promise.all([
    supabase.from('company_dashboard').select('ticker,name,market_cap_m,cash_at_end,runway_months,is_cf_positive,most_advanced_stage,pipeline_assets').order('market_cap_m', { ascending: false }),
    supabase.from('announcement').select('id,ticker,title,category,release_date,asx_url,is_price_sensitive').order('release_date', { ascending: false }).limit(15),
    supabase.from('catalyst').select('id,ticker,title,event_type,expected_date,impact,confidence').eq('status', 'upcoming').order('expected_date', { ascending: true }).limit(8),
    supabase.from('insider_tx').select('*')
      .gte('tx_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
      .order('tx_date', { ascending: false }),
  ])
  return {
    companies: companiesRes.data ?? [],
    announcements: announcementsRes.data ?? [],
    catalysts: catalystsRes.data ?? [],
    insiderTx: insiderRes.data ?? [],
  }
}

export default async function DashboardPage() {
  const { companies, announcements, catalysts, insiderTx } = await getDashboardData()

  const totalMarketCap = companies.reduce((s: number, c: any) => s + (Number(c.market_cap_m) || 0), 0)
  const lowRunway = companies.filter((c: any) => c.cash_at_end !== null && !c.is_cf_positive && Number(c.runway_months) < 6).length
  const cfPositive = companies.filter((c: any) => c.is_cf_positive).length

  const nameMap: Record<string, string> = Object.fromEntries(companies.map((c: any) => [c.ticker, c.name]))

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const sevenDaysAgo    = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const insiderAlerts = insiderTx.filter((tx: any) => {
    if (!tx.value || tx.tx_date < fourteenDaysAgo) return false
    const v = Number(tx.value)
    if (tx.tx_type === 'buy')  return v >= 50_000
    if (tx.tx_type === 'sell') return v >= 100_000
    return false
  })

  return (
    <div className="space-y-5">
      {/* Explainer — shown to first-time visitors */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg px-5 py-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-white mb-1">ASX Biotech Tracker</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              A research tool for tracking ASX-listed biotech and medtech companies. Monitor cash runway, upcoming binary catalysts, clinical trial progress, director transactions, short interest, and government grants — all in one place.
            </p>
            <p className="text-xs text-slate-600 mt-2">
              Early build — data coverage and execution scores improve as companies accumulate history. Not financial advice.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 sm:flex-col sm:gap-y-1.5 sm:shrink-0 text-xs text-slate-500">
            {[
              { href: '/companies', label: 'Company profiles & runway' },
              { href: '/catalysts', label: 'Catalyst calendar' },
              { href: '/risk-matrix', label: 'Risk matrix' },
              { href: '/trials', label: 'Clinical trials' },
              { href: '/announcements', label: 'ASX announcements' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="flex items-center gap-1.5 hover:text-green-400 transition-colors">
                <span className="text-green-600">→</span> {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Companies', value: String(companies.length) },
          { label: 'Total Mkt Cap', value: formatMarketCap(totalMarketCap) },
          { label: 'CF Positive', value: String(cfPositive), highlight: true },
          { label: 'Upcoming Catalysts', value: String(catalysts.length) },
        ].map((s: any) => (
          <div key={s.label} className="glass-card px-4 py-3">
            <div className="text-xs text-slate-500 mb-0.5">{s.label}</div>
            <div className={`text-xl font-bold ${s.highlight ? 'text-emerald-400' : 'text-white'}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {lowRunway > 0 && (
        <div className="bg-crimson-950 border border-crimson-900 rounded-lg px-4 py-2.5 text-sm text-crimson flex items-center gap-2">
          <span>⚠</span>
          <span><strong>{lowRunway} {lowRunway === 1 ? 'company' : 'companies'}</strong> under 6 months cash runway — <Link href="/risk-matrix" className="underline hover:text-rose-200">view risk matrix</Link></span>
        </div>
      )}

      {/* Insider Trade Alerts */}
      {insiderAlerts.length > 0 && (
        <div className="glass-card">
          <div className="px-4 py-3 border-b border-[--glass-border] flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <h2 className="text-sm font-medium text-slate-300">Notable Insider Activity</h2>
            <span className="text-xs text-slate-600 ml-auto">last 14 days · buys ≥$50k · sells ≥$100k</span>
          </div>
          <div className="divide-y divide-slate-800">
            {insiderAlerts.map((tx: any) => {
              const isBuy    = tx.tx_type === 'buy'
              const isRecent = tx.tx_date >= sevenDaysAgo
              return (
                <div key={tx.id} className={`px-4 py-3 hover:bg-slate-800/40 transition-colors border-l-2 ${isBuy ? 'border-l-emerald-700' : 'border-l-rose-900'}`}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Link href={`/companies/${tx.ticker}`}
                        className="font-mono text-xs font-bold text-green-400 hover:text-green-300 shrink-0">
                        {tx.ticker}
                      </Link>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${
                        isBuy ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                      }`}>
                        {tx.tx_type.toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <span className="text-sm text-slate-200 truncate">{tx.director_name}</span>
                        {nameMap[tx.ticker] && (
                          <span className="text-xs text-slate-600 ml-2">{nameMap[tx.ticker]}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      {tx.shares && (
                        <span className="text-slate-500 hidden sm:inline">
                          {Number(tx.shares).toLocaleString()} sh
                          {tx.price ? ` @ $${Number(tx.price).toFixed(3)}` : ''}
                        </span>
                      )}
                      <span className={`font-semibold ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ${Number(tx.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-slate-600">{tx.tx_date?.slice(0, 10)}</span>
                      {isRecent && (
                        <span className="text-amber-400 font-medium">⚡</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Main content: catalysts + announcements */}
      <div className="grid md:grid-cols-5 gap-4">
        {/* Upcoming catalysts */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <h2 className="text-sm font-medium text-slate-300">Upcoming Catalysts</h2>
            <Link href="/catalysts" className="text-xs text-green-500 hover:text-green-400">View all →</Link>
          </div>
          <div className="divide-y divide-slate-800">
            {catalysts.length === 0 && <div className="px-4 py-6 text-center text-slate-600 text-sm">No upcoming catalysts</div>}
            {catalysts.map((c: any) => (
              <div key={c.id} className="px-4 py-3 hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <div className="flex items-center gap-2">
                    <Link href={`/companies/${c.ticker}`} className="text-xs font-mono font-bold text-green-400 hover:text-green-300">{c.ticker}</Link>
                    <ImpactBadge impact={c.impact} />
                  </div>
                  <span className="text-xs text-slate-600 shrink-0">{formatDate(c.expected_date)}</span>
                </div>
                <div className="text-sm text-slate-200 line-clamp-1">{c.title}</div>
                <div className="mt-0.5"><ConfidenceBadge confidence={c.confidence} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent announcements */}
        <div className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <h2 className="text-sm font-medium text-slate-300">Recent Announcements</h2>
            <Link href="/announcements" className="text-xs text-green-500 hover:text-green-400">View all →</Link>
          </div>
          <div className="divide-y divide-slate-800">
            {announcements.map((a: any) => (
              <div key={a.id} className="px-4 py-2.5 hover:bg-slate-800/40 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <Link href={`/companies/${a.ticker}`} className="text-xs font-mono font-bold text-green-400 hover:text-green-300 shrink-0">{a.ticker}</Link>
                      <CategoryBadge category={a.category} />
                      {a.is_price_sensitive && <span className="text-xs text-amber-400 border border-amber-800 rounded px-1">PS</span>}
                    </div>
                    <a href={a.asx_url} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-300 hover:text-white line-clamp-1">{a.title}</a>
                  </div>
                  <div className="text-xs text-slate-600 shrink-0 whitespace-nowrap">{formatDate(a.release_date)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Director transactions */}
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
                  <Link href={`/companies/${tx.ticker}`} className="font-mono text-xs font-bold text-green-400 hover:text-green-300 shrink-0 w-10">{tx.ticker}</Link>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${
                    tx.tx_type === 'buy' ? 'bg-emerald-950 text-emerald-400' :
                    tx.tx_type === 'sell' ? 'bg-rose-950 text-rose-400' :
                    'bg-slate-800 text-slate-400'
                  }`}>{tx.tx_type?.replace(/_/g, ' ').toUpperCase()}</span>
                  <span className="text-slate-400 text-xs truncate max-w-[120px] sm:max-w-none">{tx.director_name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs shrink-0">
                  {tx.value && <span className="text-slate-300">${Number(tx.value).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>}
                  <span className="text-slate-600 hidden sm:inline">{tx.tx_date?.slice(0, 10)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
