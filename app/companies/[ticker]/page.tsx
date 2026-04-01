import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatMarketCap, formatCash, formatRunway } from '@/lib/utils'
import { StageBadge, CategoryBadge, StatusBadge, ConfidenceBadge, ImpactBadge } from '@/components/Badge'
import CashflowChart from '@/components/CashflowChart'
import DilutionChart from '@/components/DilutionChart'
import PriceChart from '@/components/PriceChart'
import ClinicalTrialsSection from '@/components/ClinicalTrialsSection'
import CompanyLogo from '@/components/CompanyLogo'
import TrackRecord from '@/components/TrackRecord'
import DirectorOptions from '@/components/DirectorOptions'
import ShortInterest from '@/components/ShortInterest'
import GrantFunding from '@/components/GrantFunding'
import RDTaxIncentive from '@/components/RDTaxIncentive'
import CompetitiveLandscape from '@/components/CompetitiveLandscape'
import CompanySectionNav from '@/components/CompanySectionNav'
import PipelineVisualizer from '@/components/PipelineVisualizer'
import WatchlistToggle from '@/components/WatchlistToggle'

export const revalidate = 900

async function getCompanyData(ticker: string) {
  const [companyRes, pipelineRes, cashflowRes, catalystsRes, trialsRes, announcementsRes, raisesRes, buybacksRes, pricesRes, insiderRes, snapshotsRes, optionsRes, shortRes, grantsRes, rdtiRes, competitorRes, approvedDrugsRes, substantialRes, hcRes, dateChangesRes, publicationsRes] = await Promise.all([
    supabase.from('company_dashboard').select('*').eq('ticker', ticker).single(),
    supabase.from('pipeline_asset').select('*').eq('ticker', ticker).order('stage'),
    supabase.from('quarterly_4c').select('*').eq('ticker', ticker).order('quarter_end', { ascending: true }),
    supabase.from('catalyst').select('*').eq('ticker', ticker).order('expected_date', { ascending: true }),
    supabase.from('clinical_trial').select('*').eq('ticker', ticker).order('status'),
    supabase.from('announcement').select('*').eq('ticker', ticker).order('release_date', { ascending: false }).limit(20),
    supabase.from('capital_raise').select('*').eq('ticker', ticker).order('announce_date', { ascending: true }),
    supabase.from('buyback').select('*').eq('ticker', ticker).order('announce_date', { ascending: true }),
    supabase.from('price_snapshot').select('snapshot_date,close_price').eq('ticker', ticker).order('snapshot_date', { ascending: true }).limit(90),
    supabase.from('insider_tx').select('*').eq('ticker', ticker).order('tx_date', { ascending: false }).limit(20),
    supabase.from('trial_enrollment_snapshot').select('nct_id,snapshot_date,enrollment_actual,source').eq('ticker', ticker).order('snapshot_date', { ascending: true }),
    supabase.from('director_options').select('*').eq('ticker', ticker).order('expiry_date', { ascending: true }),
    supabase.from('short_interest').select('report_date,short_pct,short_position_shares,total_shares,source_url').eq('ticker', ticker).order('report_date', { ascending: false }).limit(30),
    supabase.from('grant_funding').select('*').eq('ticker', ticker).order('awarded_date', { ascending: false }),
    supabase.from('rd_tax_incentive').select('*').eq('ticker', ticker).order('financial_year', { ascending: false }),
    supabase.from('competitor_trial').select('*').eq('ticker', ticker).order('phase').order('primary_completion_date', { ascending: true }),
    supabase.from('approved_drug').select('*').eq('ticker', ticker).order('indication').order('drug_name'),
    supabase.from('substantial_holder').select('*').eq('ticker', ticker).order('announce_date', { ascending: false }).limit(20),
    supabase.from('hotcopper_snapshot').select('*').eq('ticker', ticker).order('snapshot_date', { ascending: false }).limit(7),
    supabase.from('trial_date_change').select('*').eq('ticker', ticker).order('detected_date', { ascending: false }).limit(30),
    supabase.from('publication').select('*').eq('ticker', ticker).order('pub_date', { ascending: false }).limit(15),
  ])

  // Group enrollment snapshots by nct_id
  const enrollmentSnapshots: Record<string, { snapshot_date: string; enrollment_actual: number }[]> = {}
  for (const s of snapshotsRes.data ?? []) {
    if (!enrollmentSnapshots[s.nct_id]) enrollmentSnapshots[s.nct_id] = []
    enrollmentSnapshots[s.nct_id].push({ snapshot_date: s.snapshot_date, enrollment_actual: s.enrollment_actual })
  }

  return {
    company: companyRes.data,
    pipeline: pipelineRes.data ?? [],
    cashflow: cashflowRes.data ?? [],
    catalysts: catalystsRes.data ?? [],
    trials: trialsRes.data ?? [],
    announcements: announcementsRes.data ?? [],
    raises: raisesRes.data ?? [],
    buybacksData: buybacksRes.data ?? [],
    prices: pricesRes.data ?? [],
    insiderTx: insiderRes.data ?? [],
    enrollmentSnapshots,
    directorOptions: optionsRes.data ?? [],
    shortHistory: shortRes.data ?? [],
    grants: grantsRes.data ?? [],
    rdti: rdtiRes.data ?? [],
    competitorTrials: competitorRes.data ?? [],
    approvedDrugs: approvedDrugsRes.data ?? [],
    substantialHolders: substantialRes.data ?? [],
    hcSnapshots: hcRes.data ?? [],
    dateChanges: dateChangesRes.data ?? [],
    publications: publicationsRes.data ?? [],
  }
}

export default async function CompanyPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params
  const { company, pipeline, cashflow, catalysts, trials, announcements, raises, buybacksData, prices, insiderTx, enrollmentSnapshots, directorOptions, shortHistory, grants, rdti, competitorTrials, approvedDrugs, substantialHolders, hcSnapshots, dateChanges, publications } = await getCompanyData(ticker.toUpperCase())
  if (!company) notFound()

  const upcoming = catalysts.filter((c: any) => c.status === 'upcoming')
  const completed = catalysts.filter((c: any) => c.status === 'completed')

  const availableSections = [
    'pipeline',
    'cashflow',
    'raises',
    ...(insiderTx.length > 0           ? ['director-tx']    : []),
    ...(substantialHolders.length > 0  ? ['substantial']    : []),
    ...(directorOptions.length > 0     ? ['options']        : []),
    'short-interest',
    'grants',
    ...(rdti.length > 0                                         ? ['rdti']        : []),
    ...(publications.length > 0                                  ? ['publications'] : []),
    ...(competitorTrials.length > 0 || approvedDrugs.length > 0 ? ['landscape']   : []),
    ...(catalysts.length > 0                                     ? ['catalysts']   : []),
    'trials',
    'announcements',
  ]

  const latest4C = cashflow.length > 0 ? cashflow[cashflow.length - 1] : null
  const quarterLabel = latest4C?.quarter_end
    ? new Date(latest4C.quarter_end).toLocaleDateString('en-AU', { month: 'short', year: 'numeric', timeZone: 'UTC' }) + ' 4C'
    : null
  const runwayMonths = Number(company.runway_months)
  const runwayBar = !company.is_cf_positive && company.cash_at_end !== null && runwayMonths > 0 && runwayMonths < 999
    ? {
        pct: Math.min(100, (runwayMonths / 18) * 100),
        color: runwayMonths < 6 ? 'bg-rose-500' : runwayMonths < 12 ? 'bg-amber-500' : 'bg-emerald-500',
      }
    : null

  const adjRunwayMonths = Number(company.adj_runway_months)
  const rdtiPendingM = Number(company.rdti_pending_m ?? 0)
  const showAdjRunway = !company.is_cf_positive && rdtiPendingM > 0 && adjRunwayMonths > runwayMonths && adjRunwayMonths < 999

  const keyMetrics = [
    { label: 'Market Cap', value: formatMarketCap(company.market_cap_m) },
    { label: 'Cash on Hand', value: formatCash(company.cash_at_end), sub: quarterLabel ?? 'Source unknown' },
    { label: 'Burn Rate', value: company.burn_rate ? `$${Math.abs(Number(company.burn_rate)).toFixed(1)}M/qtr` : '—', sub: quarterLabel },
    {
      label: 'Runway',
      value: (() => { const r = formatRunway(company); return r.text === 'CF+' ? 'CF Positive' : r.text === 'No data' ? 'No data' : r.text.replace('mo', ' months') })(),
      color: formatRunway(company).className,
      sub: quarterLabel ? `Based on ${quarterLabel}` : null,
      bar: runwayBar,
    },
    ...(showAdjRunway ? [{
      label: 'Adj. Runway',
      value: `${adjRunwayMonths} months`,
      color: adjRunwayMonths < 6 ? 'text-rose-400' : adjRunwayMonths < 12 ? 'text-amber-400' : 'text-emerald-400',
      sub: `+$${rdtiPendingM.toFixed(1)}M RDTI`,
    }] : []),
    { label: 'Shares Outstanding', value: company.shares_outstanding_m ? (Number(company.shares_outstanding_m) >= 1000 ? `${(Number(company.shares_outstanding_m)/1000).toFixed(1)}B` : `${Number(company.shares_outstanding_m).toFixed(0)}M`) : '—' },
    { label: 'Pipeline Assets', value: String(pipeline.length) },
  ]

  // Enrich insider tx with nearest catalyst timing
  const enrichedTx = insiderTx.map((tx: any) => {
    const txMs = new Date(tx.tx_date).getTime()
    let nearest: any = null
    let minAbs = Infinity
    for (const cat of catalysts) {
      const days = Math.round((new Date(cat.expected_date).getTime() - txMs) / 86400000)
      if (Math.abs(days) < minAbs) { minAbs = Math.abs(days); nearest = { ...cat, days_offset: days } }
    }
    return { ...tx, nearest_catalyst: minAbs <= 120 ? nearest : null }
  })


  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-slate-600">
        <Link href="/companies" className="hover:text-slate-400">Companies</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-400">{ticker.toUpperCase()}</span>
      </div>

      {/* Company header */}
      <div className="glass-card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <CompanyLogo website={company.website} name={company.name} size={40} />
              <span className="text-3xl font-bold font-mono text-green-400">{company.ticker}</span>
              <StatusBadge status={company.status} />
              {company.tier && <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">Tier {company.tier}</span>}
            </div>
            <h1 className="text-xl font-semibold text-white mb-1">{company.name}</h1>
            <div className="text-sm text-slate-500 flex items-center gap-2 flex-wrap">
              <span>{[company.sector, company.therapeutic_area].filter(Boolean).join(' · ')}</span>
              {company.created_at && (
                <span className="text-slate-700 text-xs">
                  · Tracked since {new Date(company.created_at).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
            {company.description && (
              <p className="text-sm text-slate-400 mt-3 max-w-2xl">{company.description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-3">
              <WatchlistToggle ticker={ticker.toUpperCase()} />
              {company.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-green-500 hover:text-green-400 border border-slate-700 rounded px-3 py-1.5">
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
        </div>

        {/* HotCopper activity */}
        {hcSnapshots.length > 0 && (() => {
          const hc = hcSnapshots[0]
          const p24 = hc.post_count_24h ?? 0
          const p7  = hc.post_count_7d  ?? 0
          const mom = hc.momentum as string | null
          const momLabel = mom === 'spike' ? '📈 Spike' : mom === 'high' ? '↑ High' : mom === 'quiet' ? 'Quiet' : null
          const momColor = mom === 'spike' ? 'text-green-400' : mom === 'high' ? 'text-amber-400' : 'text-slate-600'
          return (
            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-6 flex-wrap">
              <a href={`https://hotcopper.com.au/asx/${ticker.toLowerCase()}/`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-400">
                <span className="font-medium text-slate-500">HC</span>
                <span>HotCopper ↗</span>
              </a>
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-600">24h </span>
                  <span className={p24 > 0 ? 'text-slate-300' : 'text-slate-600'}>{p24} posts</span>
                </div>
                <div>
                  <span className="text-slate-600">7d </span>
                  <span className={p7 > 0 ? 'text-slate-300' : 'text-slate-600'}>{p7} posts</span>
                </div>
                {momLabel && (
                  <span className={`font-medium ${momColor}`} title="Compared to 4-week average activity">{momLabel}</span>
                )}
                {hc.top_post_titles && (hc.top_post_titles as string[]).length > 0 && (
                  <div className="hidden md:block text-slate-700 truncate max-w-xs" title={(hc.top_post_titles as string[]).join(' · ')}>
                    Latest: <span className="text-slate-500">{(hc.top_post_titles as string[])[0]?.slice(0, 50)}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* Key metrics */}
        <div className="flex items-center justify-between mt-5 pt-5 border-t border-slate-800 mb-3">
          <span className="text-xs text-slate-600 uppercase tracking-wide font-medium">Key Metrics</span>
          {quarterLabel
            ? <span className="text-xs text-slate-600">Cash data from <span className="text-slate-500">{quarterLabel}</span></span>
            : <span className="text-xs text-slate-700">No cash data on file</span>
          }
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {keyMetrics.map(m => (
            <div key={m.label} className="bg-slate-950/50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">{m.label}</div>
              <div className={`text-lg font-semibold ${(m as any).color ?? 'text-white'}`}>{m.value}</div>
              {(m as any).bar && (
                <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${(m as any).bar.color}`}
                    style={{ width: `${(m as any).bar.pct}%` }}
                  />
                </div>
              )}
              {m.sub && <div className="text-xs text-slate-600 mt-1">{m.sub}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Section nav */}
      <CompanySectionNav available={availableSections} />

      {/* Price chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="text-sm font-medium text-slate-300 min-w-0">90-Day Price</h2>
          <span className="text-xs text-slate-600">{company.ticker}.ASX</span>
        </div>
        <PriceChart data={prices} />
      </div>

      {/* Pipeline + Cashflow */}
      <div id="pipeline" className="grid md:grid-cols-5 gap-4 scroll-mt-28">
        {/* Pipeline */}
        <div className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="px-4 py-3 border-b border-slate-800">
            <h2 className="text-sm font-medium text-slate-300">Pipeline Assets ({pipeline.length})</h2>
          </div>
          {pipeline.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-600 text-sm">No pipeline data</div>
          ) : (
            <>
              <PipelineVisualizer pipeline={pipeline} />
              <div className="divide-y divide-slate-800 border-t border-slate-800">
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
            </>
          )}
        </div>

        {/* Cash flow chart */}
        <div id="cashflow" className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-lg scroll-mt-28">
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
      <div id="raises" className="bg-slate-900 border border-slate-800 rounded-lg scroll-mt-28">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-medium text-slate-300 min-w-0">Capital Raises & Buybacks</h2>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            {buybacksData.length > 0 && <span className="text-emerald-600">{buybacksData.length} buyback{buybacksData.length !== 1 ? 's' : ''}</span>}
            {raises.length > 0 && <span>{raises.length} raise{raises.length !== 1 ? 's' : ''}</span>}
          </div>
        </div>
        <div className="p-4">
          <DilutionChart raises={raises} buybacks={buybacksData} sharesOutstandingM={company.shares_outstanding_m} />
        </div>
        {raises.length > 0 && (
          <div className="px-4 pb-4">
            <div className="divide-y divide-slate-800/60">
              {[...raises].reverse().slice(0, 8).map((r: any) => {
                const isSpp = r.raise_type === 'spp'
                const hasRetail = isSpp && (r.retail_applications_m || r.scale_back_pct)
                // Find parent raise for SPPs
                const parent = isSpp && r.parent_raise_id
                  ? raises.find((p: any) => p.id === r.parent_raise_id)
                  : null
                return (
                  <div key={r.id} className="py-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{r.announce_date?.slice(0, 10)}</span>
                        <span className={`capitalize font-medium ${isSpp ? 'text-violet-400' : 'text-slate-400'}`}>
                          {r.raise_type?.replace(/_/g, ' ')}
                        </span>
                        {parent && (
                          <span className="text-slate-700 hidden sm:inline">
                            ↳ linked to {parent.announce_date?.slice(0, 10)} placement
                          </span>
                        )}
                        {r.notes && <span className="text-slate-600 hidden md:inline truncate max-w-xs">{r.notes}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-right shrink-0">
                        {r.amount_m && <span className="text-emerald-400">${Number(r.amount_m).toFixed(1)}M</span>}
                        {r.shares_issued_m && <span className="text-slate-500 hidden sm:inline">{Number(r.shares_issued_m).toFixed(1)}M sh</span>}
                        {r.price_per_share && <span className="text-slate-600 hidden sm:inline">@ ${Number(r.price_per_share).toFixed(3)}</span>}
                      </div>
                    </div>
                    {hasRetail && (
                      <div className="mt-1 ml-16 flex flex-wrap gap-x-3 gap-y-0.5 text-slate-600">
                        {r.retail_applications_m && (
                          <span>
                            <span className="text-slate-500">${Number(r.retail_applications_m).toFixed(1)}M</span> applied
                            {r.amount_m && Number(r.retail_applications_m) > Number(r.amount_m) && (
                              <span className="text-amber-600 ml-1">
                                ({(Number(r.retail_applications_m) / Number(r.amount_m)).toFixed(1)}× oversubscribed)
                              </span>
                            )}
                          </span>
                        )}
                        {r.scale_back_pct && (
                          <span className="text-amber-600">{Number(r.scale_back_pct).toFixed(0)}% scaled back</span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {buybacksData.length > 0 && (
          <div className="px-4 pb-4 border-t border-slate-800">
            <div className="text-xs text-slate-500 py-2 font-medium">Buyback Detail</div>
            <div className="divide-y divide-slate-800/60">
              {[...buybacksData].reverse().slice(0, 5).map((b: any) => (
                <div key={b.id} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{b.announce_date?.slice(0, 10)}</span>
                    <span className="capitalize text-slate-400">{b.buyback_type?.replace(/_/g, ' ')}</span>
                    {b.notes && <span className="text-slate-600 hidden md:inline truncate max-w-xs">{b.notes}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-right shrink-0">
                    {b.shares_cancelled_m && <span className="text-emerald-400 hidden sm:inline">{Number(b.shares_cancelled_m).toFixed(1)}M shares</span>}
                    {b.amount_m && <span className="text-slate-400">${Number(b.amount_m).toFixed(1)}M</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Insider Transactions */}
      {enrichedTx.length > 0 && (
        <div id="director-tx" className="bg-slate-900 border border-slate-800 rounded-lg scroll-mt-28">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-medium text-slate-300 min-w-0">Director Transactions</h2>
            <span className="text-xs text-slate-600">{enrichedTx.length} transaction{enrichedTx.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-slate-800/60">
            {enrichedTx.slice(0, 8).map((tx: any) => (
              <div key={tx.id} className="px-4 py-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`shrink-0 font-medium px-1.5 py-0.5 rounded ${
                      tx.tx_type === 'buy' ? 'bg-emerald-950 text-emerald-400' :
                      tx.tx_type === 'sell' ? 'bg-rose-950 text-rose-400' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {tx.tx_type?.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span className="text-slate-300 truncate">{tx.director_name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-right">
                    {tx.shares && <span className="text-slate-400 hidden sm:inline">{Number(tx.shares).toLocaleString()} sh</span>}
                    {tx.price && <span className="text-slate-500 hidden sm:inline">@ ${Number(tx.price).toFixed(3)}</span>}
                    {tx.value && <span className="text-slate-300">${Number(tx.value).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>}
                    <span className="text-slate-600">{tx.tx_date?.slice(0, 10)}</span>
                  </div>
                </div>
                {tx.nearest_catalyst && (
                  <div className="mt-1 ml-0 pl-0 text-slate-600">
                    <span className={`${
                      tx.nearest_catalyst.days_offset > 0
                        ? tx.tx_type === 'buy' ? 'text-amber-600' : 'text-slate-600'
                        : 'text-slate-600'
                    }`}>
                      {tx.nearest_catalyst.days_offset > 0
                        ? `${tx.nearest_catalyst.days_offset}d before`
                        : `${Math.abs(tx.nearest_catalyst.days_offset)}d after`}
                    </span>
                    {' · '}
                    <span className="text-slate-700 truncate">{tx.nearest_catalyst.title}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Substantial Holders */}
      {substantialHolders.length > 0 && (
        <div id="substantial" className="bg-slate-900 border border-slate-800 rounded-lg scroll-mt-28">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-medium text-slate-300 min-w-0">Substantial Holders <span className="text-slate-600 font-normal">(5%+ threshold)</span></h2>
            <span className="text-xs text-slate-600">{substantialHolders.length} notice{substantialHolders.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-slate-800/60">
            {substantialHolders.slice(0, 10).map((h: any) => (
              <div key={h.id} className="px-4 py-2.5 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`shrink-0 px-1.5 py-0.5 rounded font-medium ${
                      h.change_type === 'ceased'   ? 'bg-rose-950 text-rose-400' :
                      h.change_type === 'increase' ? 'bg-emerald-950 text-emerald-400' :
                      h.change_type === 'decrease' ? 'bg-amber-950 text-amber-400' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {h.change_type === 'ceased' ? 'CEASED' :
                       h.change_type === 'increase' ? '▲' :
                       h.change_type === 'decrease' ? '▼' : 'INITIAL'}
                    </span>
                    <span className="text-slate-300 truncate">{h.holder_name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-right">
                    {h.prev_percentage != null && (
                      <span className="text-slate-600 hidden sm:inline">{Number(h.prev_percentage).toFixed(2)}%</span>
                    )}
                    {h.prev_percentage != null && h.percentage != null && (
                      <span className="text-slate-600 hidden sm:inline">→</span>
                    )}
                    {h.percentage != null && (
                      <span className={`font-medium ${h.change_type === 'ceased' ? 'text-slate-600 line-through' : 'text-slate-200'}`}>
                        {Number(h.percentage).toFixed(2)}%
                      </span>
                    )}
                    {h.shares && (
                      <span className="text-slate-500 hidden md:inline">{Number(h.shares).toLocaleString()} sh</span>
                    )}
                    {h.source_url ? (
                      <a href={h.source_url} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-400">{h.announce_date?.slice(0, 10)}</a>
                    ) : (
                      <span className="text-slate-600">{h.announce_date?.slice(0, 10)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Director Options */}
      <div id="options" className="scroll-mt-28">
      <DirectorOptions
        options={directorOptions}
        currentPrice={prices.length > 0 ? Number(prices[prices.length - 1].close_price) : null}
      />

      </div>

      {/* Short Interest */}
      <div id="short-interest" className="scroll-mt-28">
        <ShortInterest history={shortHistory} />
      </div>

      {/* Grant Funding */}
      <div id="grants" className="scroll-mt-28">
        <GrantFunding grants={grants} />
      </div>

      {/* R&D Tax Incentive */}
      {rdti.length > 0 && (
        <div id="rdti" className="scroll-mt-28">
          <RDTaxIncentive
            records={rdti}
            runwayMonths={runwayMonths < 999 ? runwayMonths : null}
            adjRunwayMonths={adjRunwayMonths < 999 ? adjRunwayMonths : null}
          />
        </div>
      )}

      {/* Competitive Landscape */}
      {(competitorTrials.length > 0 || approvedDrugs.length > 0) && (
        <div id="landscape" className="scroll-mt-28">
          <CompetitiveLandscape
            pipeline={pipeline}
            competitorTrials={competitorTrials}
            approvedDrugs={approvedDrugs}
          />
        </div>
      )}

      {/* Publications */}
      {publications.length > 0 && (
        <div id="publications" className="bg-slate-900 border border-slate-800 rounded-lg scroll-mt-28">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-medium text-slate-300">Clinical Publications</h2>
              <p className="text-xs text-slate-600 mt-0.5">Peer-reviewed papers & conference abstracts via PubMed</p>
            </div>
            <span className="text-xs text-slate-600">{publications.length} paper{publications.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-slate-800/60">
            {publications.map((p: any) => {
              const confColor = p.conference === 'ASCO' ? 'bg-sky-950 text-sky-400' :
                                p.conference === 'ASH'  ? 'bg-rose-950 text-rose-400' :
                                p.conference === 'ESMO' ? 'bg-violet-950 text-violet-400' :
                                p.conference === 'AACR' ? 'bg-orange-950 text-orange-400' :
                                null
              return (
                <div key={p.id} className="px-4 py-3 text-xs">
                  <div className="flex items-start gap-2 mb-1">
                    {confColor && (
                      <span className={`shrink-0 px-1.5 py-0.5 rounded font-medium text-xs ${confColor}`}>
                        {p.conference}
                      </span>
                    )}
                    <a href={p.abstract_url} target="_blank" rel="noopener noreferrer"
                      className="text-slate-200 hover:text-green-300 leading-snug">
                      {p.title}
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600 mt-1">
                    <span>{p.journal}</span>
                    {p.pub_date && <span>{p.pub_date.slice(0, 7)}</span>}
                    {p.drug_name && <span className="text-slate-700">· {p.drug_name}</span>}
                    {p.pub_types && p.pub_types.length > 0 && (
                      <span className="text-slate-700 hidden sm:inline">{p.pub_types[0]}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Catalysts */}
      {catalysts.length > 0 && (
        <div id="catalysts" className="bg-slate-900 border border-slate-800 rounded-lg scroll-mt-28">
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
                      {c.source_url ? (
                        <a href={c.source_url} target="_blank" rel="noopener noreferrer"
                          className="text-slate-200 hover:text-green-300 underline decoration-slate-600 underline-offset-2">
                          {c.title}
                        </a>
                      ) : (
                        <span className="text-slate-200">{c.title}</span>
                      )}
                      {c.description && !c.outcome && (
                        <div className="text-xs text-slate-500 mt-0.5">{c.description}</div>
                      )}
                      {c.outcome && <div className="text-xs text-slate-500 mt-0.5">{c.outcome}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 hidden md:table-cell capitalize">{c.event_type?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <ConfidenceBadge confidence={c.confidence} />
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <ImpactBadge impact={c.impact} />
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

      {/* Track Record */}
      {catalysts.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg">
          <div className="px-4 py-3 border-b border-slate-800">
            <h2 className="text-sm font-medium text-slate-300">Catalyst Track Record</h2>
            <p className="text-xs text-slate-600 mt-0.5">Score accuracy improves as more catalysts complete over time — data is limited for recently added companies.</p>
          </div>
          <div className="px-4 py-4">
            <TrackRecord catalysts={catalysts} cashflow={cashflow} pipeline={pipeline} />
          </div>
        </div>
      )}

      {/* Trial timeline change alerts */}
      {dateChanges.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-800/50 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-400 text-sm">⚠</span>
            <span className="text-xs font-medium text-amber-400">Trial Timeline Changes Detected</span>
            <span className="text-xs text-amber-800">(auto-detected via CT.gov)</span>
          </div>
          <div className="space-y-1.5">
            {dateChanges.slice(0, 5).map((ch: any) => {
              const isSlip = ch.field_name === 'primary_completion_date' && (ch.days_delta ?? 0) > 0
              const isPull = ch.field_name === 'primary_completion_date' && (ch.days_delta ?? 0) < 0
              const isResults = ch.field_name === 'has_results'
              const months = ch.days_delta ? Math.round(Math.abs(ch.days_delta) / 30) : null
              return (
                <div key={ch.id} className="flex items-start gap-3 text-xs">
                  <span className={`shrink-0 mt-0.5 ${isSlip ? 'text-amber-400' : isResults ? 'text-emerald-400' : 'text-sky-400'}`}>
                    {isSlip ? '↗ SLIPPED' : isPull ? '↙ PULLED FWD' : '★ RESULTS'}
                  </span>
                  <div className="min-w-0">
                    <span className="text-slate-300 font-mono">{ch.nct_id}</span>
                    {isResults ? (
                      <span className="text-slate-400 ml-2">Results posted to ClinicalTrials.gov</span>
                    ) : (
                      <span className="text-slate-400 ml-2">
                        {ch.old_value} → {ch.new_value}
                        {months != null && months > 0 && <span className="ml-1 text-amber-600">({months}mo {isSlip ? 'delay' : 'earlier'})</span>}
                      </span>
                    )}
                  </div>
                  <span className="text-slate-700 shrink-0">{ch.detected_date}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Clinical Trials */}
      <div id="trials" className="scroll-mt-28">
        <ClinicalTrialsSection trials={trials} companyName={company.name} enrollmentSnapshots={enrollmentSnapshots} />
      </div>

      {/* Announcements */}
      <div id="announcements" className="bg-slate-900 border border-slate-800 rounded-lg scroll-mt-28">
        <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-b border-slate-800">
          <h2 className="text-sm font-medium text-slate-300 min-w-0">Recent Announcements</h2>
          <Link href="/announcements" className="text-xs text-green-500 hover:text-green-400">All announcements →</Link>
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
