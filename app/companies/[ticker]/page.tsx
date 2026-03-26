import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatMarketCap, formatCash, formatRunway } from '@/lib/utils'
import { StageBadge, CategoryBadge, StatusBadge } from '@/components/Badge'
import CashflowChart from '@/components/CashflowChart'
import DilutionChart from '@/components/DilutionChart'
import PriceChart from '@/components/PriceChart'

export const revalidate = 900

export async function generateStaticParams() {
  const { data } = await supabase.from('company').select('ticker')
  return (data ?? []).map(c => ({ ticker: c.ticker }))
}

async function getCompanyData(ticker: string) {
  const [companyRes, pipelineRes, cashflowRes, catalystsRes, trialsRes, announcementsRes, raisesRes, pricesRes, insiderRes] = await Promise.all([
    supabase.from('company_dashboard').select('*').eq('ticker', ticker).single(),
    supabase.from('pipeline_asset').select('*').eq('ticker', ticker).order('stage'),
    supabase.from('quarterly_4c').select('*').eq('ticker', ticker).order('quarter_end', { ascending: true }),
    supabase.from('catalyst').select('*').eq('ticker', ticker).order('expected_date', { ascending: true }),
    supabase.from('clinical_trial').select('*').eq('ticker', ticker).order('status'),
    supabase.from('announcement').select('*').eq('ticker', ticker).order('release_date', { ascending: false }).limit(20),
    supabase.from('capital_raise').select('*').eq('ticker', ticker).order('announce_date', { ascending: true }),
    supabase.from('price_snapshot').select('snapshot_date,close_price').eq('ticker', ticker).order('snapshot_date', { ascending: true }).limit(90),
    supabase.from('insider_tx').select('*').eq('ticker', ticker).order('tx_date', { ascending: false }).limit(20),
  ])
  return {
    company: companyRes.data,
    pipeline: pipelineRes.data ?? [],
    cashflow: cashflowRes.data ?? [],
    catalysts: catalystsRes.data ?? [],
    trials: trialsRes.data ?? [],
    announcements: announcementsRes.data ?? [],
    raises: raisesRes.data ?? [],
    prices: pricesRes.data ?? [],
    insiderTx: insiderRes.data ?? [],
  }
}

export default async function CompanyPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params
  const { company, pipeline, cashflow, catalysts, trials, announcements, raises, prices, insiderTx } = await getCompanyData(ticker.toUpperCase())
  if (!company) notFound()

  const upcoming = catalysts.filter((c: any) => c.status === 'upcoming')
  const completed = catalysts.filter((c: any) => c.status === 'completed')

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-slate-600">
        <Link href="/companies" className="hover:text-slate-400">Companies</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-400">{ticker.toUpperCase()}</span>
      </div>

      {/* Company header */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl font-bold font-mono text-cyan-400">{company.ticker}</span>
              <StatusBadge status={company.status} />
              {company.tier && <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">Tier {company.tier}</span>}
            </div>
            <h1 className="text-xl font-semibold text-white mb-1">{company.name}</h1>
            <div className="text-sm text-slate-500">
              {[company.sector, company.therapeutic_area].filter(Boolean).join(' · ')}
            </div>
            {company.description && (
              <p className="text-sm text-slate-400 mt-3 max-w-2xl">{company.description}</p>
            )}
          </div>
          <div className="flex gap-3">
            {company.website && (
              <a href={company.website} target="_blank" rel="noopener noreferrer"
                className="text-xs text-cyan-500 hover:text-cyan-400 border border-slate-700 rounded px-3 py-1.5">
                Website ↗
              </a>
            )}
            {company.asx_url && (
              <a href={company.asx_url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-slate-400 hover:text-slate-300 border border-slate-700 rounded px-3 py-1.5">
                ASX ↗
              </a>
            )}
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5 pt-5 border-t border-slate-800">
          {[
            { label: 'Market Cap', value: formatMarketCap(company.market_cap_m) },
            { label: 'Cash on Hand', value: formatCash(company.cash_at_end) },
            { label: 'Burn Rate', value: company.burn_rate ? `$${Math.abs(Number(company.burn_rate)).toFixed(1)}M/qtr` : '—' },
            {
              label: 'Runway',
              value: (() => { const r = formatRunway(company); return r.text === 'CF+' ? 'CF Positive' : r.text === 'No data' ? 'No data' : r.text.replace('mo', ' months') })(),
              color: formatRunway(company).className,
            },
            { label: 'Shares Outstanding', value: company.shares_outstanding_m ? (Number(company.shares_outstanding_m) >= 1000 ? `${(Number(company.shares_outstanding_m)/1000).toFixed(1)}B` : `${Number(company.shares_outstanding_m).toFixed(0)}M`) : '—' },
            { label: 'Pipeline Assets', value: String(pipeline.length) },
          ].map(m => (
            <div key={m.label} className="bg-slate-950/50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">{m.label}</div>
              <div className={`text-lg font-semibold ${m.color ?? 'text-white'}`}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Price chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-slate-300">90-Day Price</h2>
          <span className="text-xs text-slate-600">{company.ticker}.ASX</span>
        </div>
        <PriceChart data={prices} />
      </div>

      {/* Pipeline + Cashflow */}
      <div className="grid md:grid-cols-5 gap-4">
        {/* Pipeline */}
        <div className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="px-4 py-3 border-b border-slate-800">
            <h2 className="text-sm font-medium text-slate-300">Pipeline Assets ({pipeline.length})</h2>
          </div>
          {pipeline.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-600 text-sm">No pipeline data</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {pipeline.map((a: any) => (
                <div key={a.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white text-sm">{a.drug_name}</span>
                        <StageBadge stage={a.stage} />
                      </div>
                      {a.indication && <div className="text-xs text-slate-400">{a.indication}</div>}
                      {a.mechanism && <div className="text-xs text-slate-600 mt-0.5">{a.mechanism}</div>}
                      {a.designations && a.designations.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {a.designations.map((d: string) => (
                            <span key={d} className="text-xs bg-amber-950 text-amber-400 rounded px-1.5 py-0.5">{d}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {a.expected_next_milestone && (
                      <div className="text-xs text-slate-600 shrink-0 text-right">
                        <div>Next milestone</div>
                        <div className="text-slate-400">{formatDate(a.expected_next_milestone)}</div>
                      </div>
                    )}
                  </div>
                  {a.partner && <div className="text-xs text-slate-600 mt-1">Partner: <span className="text-slate-400">{a.partner}</span></div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cash flow chart */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="px-4 py-3 border-b border-slate-800">
            <h2 className="text-sm font-medium text-slate-300">Quarterly Cash Flow</h2>
          </div>
          <div className="p-4">
            <CashflowChart data={cashflow} />
          </div>
          {cashflow.length > 0 && (
            <div className="px-4 pb-4 space-y-1">
              {cashflow.slice(-1).map((q: any) => (
                <div key={q.id} className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {[
                    ['R&D Spend', q.rd_expenditure ? `$${Math.abs(Number(q.rd_expenditure)).toFixed(1)}M` : '—'],
                    ['Staff Costs', q.staff_costs ? `$${Math.abs(Number(q.staff_costs)).toFixed(1)}M` : '—'],
                    ['Admin', q.admin_and_corporate ? `$${Math.abs(Number(q.admin_and_corporate)).toFixed(1)}M` : '—'],
                    ['Receipts', q.cash_receipts_from_customers ? `$${Number(q.cash_receipts_from_customers).toFixed(1)}M` : '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-slate-600">{k}</span>
                      <span className="text-slate-400">{v}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Capital Raises / Dilution */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-300">Capital Raises & Dilution</h2>
          {raises.length > 0 && (
            <span className="text-xs text-slate-600">{raises.length} raise{raises.length !== 1 ? 's' : ''} tracked</span>
          )}
        </div>
        <div className="p-4">
          <DilutionChart raises={raises} sharesOutstandingM={company.shares_outstanding_m} />
        </div>
        {raises.length > 0 && (
          <div className="px-4 pb-4">
            <div className="divide-y divide-slate-800/60">
              {[...raises].reverse().slice(0, 5).map((r: any) => (
                <div key={r.id} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{r.announce_date?.slice(0, 10)}</span>
                    <span className="capitalize text-slate-400">{r.raise_type?.replace(/_/g, ' ')}</span>
                    {r.notes && <span className="text-slate-600 hidden md:inline truncate max-w-xs">{r.notes}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-right shrink-0">
                    {r.amount_m && <span className="text-emerald-400">${Number(r.amount_m).toFixed(1)}M</span>}
                    {r.shares_issued_m && <span className="text-slate-500">{Number(r.shares_issued_m).toFixed(1)}M shares</span>}
                    {r.price_per_share && <span className="text-slate-600">@ ${Number(r.price_per_share).toFixed(3)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Insider Transactions */}
      {insiderTx.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-300">Director Transactions</h2>
            <span className="text-xs text-slate-600">{insiderTx.length} transaction{insiderTx.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-slate-800/60">
            {insiderTx.slice(0, 8).map((tx: any) => (
              <div key={tx.id} className="px-4 py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`shrink-0 font-medium px-1.5 py-0.5 rounded text-xs ${
                    tx.tx_type === 'buy' ? 'bg-emerald-950 text-emerald-400' :
                    tx.tx_type === 'sell' ? 'bg-rose-950 text-rose-400' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {tx.tx_type?.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  <span className="text-slate-300 truncate">{tx.director_name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-right">
                  {tx.shares && <span className="text-slate-400">{Number(tx.shares).toLocaleString()} shares</span>}
                  {tx.price && <span className="text-slate-500">@ ${Number(tx.price).toFixed(3)}</span>}
                  {tx.value && <span className="text-slate-400">${Number(tx.value).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>}
                  <span className="text-slate-600">{tx.tx_date?.slice(0, 10)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Catalysts */}
      {catalysts.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg">
          <div className="px-4 py-3 border-b border-slate-800">
            <h2 className="text-sm font-medium text-slate-300">Catalysts ({catalysts.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-800">
                  <th className="text-left px-4 py-2">Event</th>
                  <th className="text-left px-4 py-2 hidden md:table-cell">Type</th>
                  <th className="text-left px-4 py-2 hidden md:table-cell">Confidence</th>
                  <th className="text-left px-4 py-2 hidden md:table-cell">Impact</th>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {[...upcoming, ...completed].map((c: any) => (
                  <tr key={c.id} className={`hover:bg-slate-800/40 ${c.status === 'completed' ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-2.5">
                      <div className="text-slate-200">{c.title}</div>
                      {c.outcome && <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{c.outcome}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 hidden md:table-cell capitalize">{c.event_type?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell capitalize text-xs">
                      <span className={c.confidence === 'confirmed' ? 'text-emerald-400' : c.confidence === 'expected' ? 'text-cyan-400' : 'text-slate-500'}>
                        {c.confidence}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <span className={c.impact === 'high' ? 'text-amber-400 text-xs' : 'text-slate-500 text-xs'}>{c.impact}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs whitespace-nowrap">
                      {formatDate(c.actual_date || c.expected_date)}
                      {c.times_delayed ? <span className="text-amber-600 ml-1">({c.times_delayed}× delayed)</span> : null}
                    </td>
                    <td className="px-4 py-2.5"><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clinical Trials */}
      {trials.length > 0 && (() => {
        const STATUS_ORDER: Record<string, number> = {
          RECRUITING: 0, NOT_YET_RECRUITING: 1, ACTIVE_NOT_RECRUITING: 2,
          ENROLLING_BY_INVITATION: 3, COMPLETED: 4, TERMINATED: 5,
          WITHDRAWN: 6, SUSPENDED: 7, UNKNOWN: 8,
        }
        const STATUS_STYLE: Record<string, string> = {
          RECRUITING: 'bg-emerald-950 text-emerald-400',
          NOT_YET_RECRUITING: 'bg-cyan-950 text-cyan-400',
          ACTIVE_NOT_RECRUITING: 'bg-blue-950 text-blue-400',
          ENROLLING_BY_INVITATION: 'bg-teal-950 text-teal-400',
          COMPLETED: 'bg-slate-800 text-slate-400',
          TERMINATED: 'bg-rose-950 text-rose-500',
          WITHDRAWN: 'bg-slate-800 text-slate-600',
          SUSPENDED: 'bg-amber-950 text-amber-400',
        }
        const PHASE_STYLE: Record<string, string> = {
          'PHASE1': 'bg-violet-950 text-violet-400',
          'PHASE2': 'bg-purple-950 text-purple-400',
          'PHASE3': 'bg-fuchsia-950 text-fuchsia-400',
          'PHASE4': 'bg-pink-950 text-pink-400',
          'EARLY_PHASE1': 'bg-indigo-950 text-indigo-400',
        }
        const phaseLabel = (p: string) => p?.replace('PHASE', 'Phase ').replace('EARLY_PHASE1', 'Early Phase 1').replace('_', '/') ?? p
        const sorted = [...trials].sort((a: any, b: any) => {
          const sa = STATUS_ORDER[a.status] ?? 9
          const sb = STATUS_ORDER[b.status] ?? 9
          return sa !== sb ? sa - sb : (a.phase ?? '').localeCompare(b.phase ?? '')
        })
        const active = sorted.filter((t: any) => ['RECRUITING','NOT_YET_RECRUITING','ACTIVE_NOT_RECRUITING','ENROLLING_BY_INVITATION'].includes(t.status))
        const other = sorted.filter((t: any) => !['RECRUITING','NOT_YET_RECRUITING','ACTIVE_NOT_RECRUITING','ENROLLING_BY_INVITATION'].includes(t.status))

        return (
          <div className="bg-slate-900 border border-slate-800 rounded-lg">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-300">Clinical Trials ({trials.length})</h2>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                {active.length > 0 && <span className="text-emerald-500">{active.length} active</span>}
                <a href={`https://clinicaltrials.gov/search?spons=${encodeURIComponent(company.name)}`}
                  target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:text-cyan-400">
                  ClinicalTrials.gov ↗
                </a>
              </div>
            </div>
            <div className="divide-y divide-slate-800">
              {sorted.map((t: any) => {
                const drugs = t.interventions?.slice(0, 3) ?? []
                const enrollPct = t.enrollment_target && t.enrollment_actual != null
                  ? Math.min(100, Math.round((t.enrollment_actual / t.enrollment_target) * 100))
                  : null
                const isActive = active.includes(t)
                return (
                  <div key={t.id} className={`px-4 py-4 ${!isActive ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        {/* Badges row */}
                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                          {t.phase && (
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${PHASE_STYLE[t.phase] ?? 'bg-slate-800 text-slate-400'}`}>
                              {phaseLabel(t.phase)}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLE[t.status] ?? 'bg-slate-800 text-slate-400'}`}>
                            {t.status?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
                          </span>
                          {t.has_results && <span className="text-xs bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded">Results</span>}
                          {t.study_type && t.study_type !== 'INTERVENTIONAL' && (
                            <span className="text-xs bg-slate-800 text-slate-500 px-2 py-0.5 rounded">{t.study_type}</span>
                          )}
                        </div>

                        {/* Drug names */}
                        {drugs.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            {drugs.map((d: string, i: number) => (
                              <span key={i} className="text-xs font-medium text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded">{d}</span>
                            ))}
                          </div>
                        )}

                        {/* Title */}
                        <div className="text-sm text-slate-200 leading-snug">{t.brief_title || t.title}</div>

                        {/* Conditions */}
                        {t.conditions && t.conditions.length > 0 && (
                          <div className="text-xs text-slate-500 mt-1">
                            {t.conditions.slice(0, 3).join(' · ')}
                            {t.conditions.length > 3 && <span className="text-slate-700"> +{t.conditions.length - 3} more</span>}
                          </div>
                        )}

                        {/* Enrollment progress */}
                        {t.enrollment_target && (
                          <div className="mt-2 space-y-1">
                            <div className="flex justify-between text-xs text-slate-500">
                              <span>Enrollment</span>
                              <span>
                                {t.enrollment_actual != null ? `${t.enrollment_actual} / ` : ''}{t.enrollment_target}
                                {enrollPct != null && <span className="text-slate-400 ml-1">({enrollPct}%)</span>}
                              </span>
                            </div>
                            {enrollPct != null && (
                              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-violet-600 rounded-full" style={{ width: `${enrollPct}%` }} />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Countries */}
                        {t.countries && t.countries.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {t.countries.slice(0, 5).map((c: string, i: number) => (
                              <span key={i} className="text-xs text-slate-600 bg-slate-800/50 px-1.5 py-0.5 rounded">{c}</span>
                            ))}
                            {t.countries.length > 5 && <span className="text-xs text-slate-700">+{t.countries.length - 5}</span>}
                          </div>
                        )}
                      </div>

                      {/* Right metadata */}
                      <div className="text-xs text-slate-600 shrink-0 text-right space-y-1.5 min-w-24">
                        <a href={t.ct_url || `https://clinicaltrials.gov/study/${t.nct_id}`}
                          target="_blank" rel="noopener noreferrer"
                          className="block text-cyan-600 hover:text-cyan-400 font-mono">{t.nct_id} ↗</a>
                        {t.start_date && (
                          <div>
                            <div className="text-slate-700 text-xs">Start</div>
                            <div>{t.start_date.slice(0, 7)}</div>
                          </div>
                        )}
                        {t.primary_completion_date && (
                          <div>
                            <div className="text-slate-700 text-xs">Primary end</div>
                            <div>{t.primary_completion_date.slice(0, 7)}</div>
                          </div>
                        )}
                        {t.locations_count && t.locations_count > 0 && (
                          <div className="text-slate-700">{t.locations_count} site{t.locations_count !== 1 ? 's' : ''}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Announcements */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h2 className="text-sm font-medium text-slate-300">Recent Announcements</h2>
          <Link href="/announcements" className="text-xs text-cyan-500 hover:text-cyan-400">All announcements →</Link>
        </div>
        {announcements.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-600 text-sm">No announcements</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {announcements.map((a: any) => (
              <div key={a.id} className="px-4 py-3 hover:bg-slate-800/40 transition-colors flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <CategoryBadge category={a.category} />
                    {a.is_price_sensitive && <span className="text-xs text-amber-400 border border-amber-800 rounded px-1">Price Sensitive</span>}
                  </div>
                  <a href={a.asx_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-slate-200 hover:text-white">{a.title}</a>
                </div>
                <div className="text-xs text-slate-600 shrink-0 whitespace-nowrap">{formatDate(a.release_date)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
