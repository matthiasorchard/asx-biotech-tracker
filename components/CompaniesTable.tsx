'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatMarketCap, formatRunway } from '@/lib/utils'
import { StageBadge, RaiseRiskBadge } from '@/components/Badge'
import Sparkline from '@/components/Sparkline'
import CompanyLogo from '@/components/CompanyLogo'

type SortKey = 'ticker' | 'name' | 'market_cap_m' | 'cash_at_end' | 'runway_months' | 'pipeline_assets'
type SortDir = 'asc' | 'desc'

const PILL = (active: boolean) =>
  `px-2.5 py-1 rounded-full text-xs transition-colors border cursor-pointer select-none ${
    active
      ? 'bg-green-900 border-green-700 text-green-300'
      : 'border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500'
  }`

export default function CompaniesTable({
  companies,
  priceMap = {},
}: {
  companies: any[]
  priceMap?: Record<string, number[]>
}) {
  const [search, setSearch]           = useState('')
  const [filterArea, setFilterArea]   = useState('')
  const [filterSector, setFilterSector] = useState('')
  const [hideCfPos, setHideCfPos]     = useState(false)
  const [sortKey, setSortKey]         = useState<SortKey>('market_cap_m')
  const [sortDir, setSortDir]         = useState<SortDir>('desc')

  const areas   = useMemo(() => [...new Set(companies.map((c: any) => c.therapeutic_area).filter(Boolean))].sort(), [companies])
  const sectors = useMemo(() => [...new Set(companies.map((c: any) => c.sector).filter(Boolean))].sort(), [companies])

  const filtered = useMemo(() => {
    let r = companies
    if (search)       r = r.filter((c: any) => c.ticker.toLowerCase().includes(search.toLowerCase()) || c.name.toLowerCase().includes(search.toLowerCase()))
    if (filterArea)   r = r.filter((c: any) => c.therapeutic_area === filterArea)
    if (filterSector) r = r.filter((c: any) => c.sector === filterSector)
    if (hideCfPos)    r = r.filter((c: any) => !c.is_cf_positive)
    return [...r].sort((a: any, b: any) => {
      const av = a[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity)
      const bv = b[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity)
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [companies, search, filterArea, filterSector, sortKey, sortDir, hideCfPos])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const hasFilters = !!(search || filterArea || filterSector || hideCfPos)

  function Th({ k, label, className = '' }: { k: SortKey; label: string; className?: string }) {
    const active = sortKey === k
    return (
      <th className={`text-left px-4 py-2 font-medium cursor-pointer select-none hover:text-slate-300 transition-colors ${className}`}
        onClick={() => toggleSort(k)}>
        {label} {active ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-slate-700">↕</span>}
      </th>
    )
  }

  return (
    <div className="space-y-3">
      {/* Row 1: Search + toggles */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text" placeholder="Search ticker or name…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-green-700 w-full sm:w-52"
        />
        <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
          <input type="checkbox" checked={hideCfPos} onChange={e => setHideCfPos(e.target.checked)}
            className="accent-green-500" />
          Hide CF+
        </label>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setFilterArea(''); setFilterSector(''); setHideCfPos(false) }}
            className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1.5 border border-slate-700 rounded">
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-slate-600">{filtered.length} companies</span>
      </div>

      {/* Row 2: Therapeutic area pills */}
      {areas.length > 1 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-slate-600 shrink-0 w-10">Area</span>
          <button onClick={() => setFilterArea('')} className={PILL(!filterArea)}>All</button>
          {areas.map(a => (
            <button key={a} onClick={() => setFilterArea(filterArea === a ? '' : a)} className={PILL(filterArea === a)}>
              {a}
            </button>
          ))}
        </div>
      )}

      {/* Row 3: Sector pills */}
      {sectors.length > 1 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-slate-600 shrink-0 w-10">Sector</span>
          <button onClick={() => setFilterSector('')} className={PILL(!filterSector)}>All</button>
          {sectors.map(s => (
            <button key={s} onClick={() => setFilterSector(filterSector === s ? '' : s)} className={PILL(filterSector === s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Table — overflow: auto on the container gives its own scroll region so sticky thead works */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-auto max-h-[calc(100vh-14rem)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-900">
            <tr className="text-xs text-slate-500 border-b border-slate-800">
              <Th k="ticker" label="Ticker" />
              <Th k="name" label="Company" />
              <th className="text-left px-4 py-2 font-medium hidden lg:table-cell">Sector</th>
              <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Therapeutic Area</th>
              <th className="text-left px-4 py-2 font-medium hidden lg:table-cell">Lead Stage</th>
              <Th k="pipeline_assets" label="Assets" className="hidden sm:table-cell" />
              <Th k="market_cap_m" label="Mkt Cap" className="hidden sm:table-cell" />
              <Th k="cash_at_end" label="Cash" className="hidden sm:table-cell" />
              <Th k="runway_months" label="Runway" />
              <th className="text-left px-4 py-2 font-medium hidden xl:table-cell">90d</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map((c: any) => {
              const px = priceMap[c.ticker] ?? []
              const pxPositive = px.length >= 2 ? px[px.length - 1] >= px[0] : true
              const latestPrice = px.length ? px[px.length - 1] : null
              return (
                <tr key={c.ticker} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/companies/${c.ticker}`} className="font-mono font-bold text-green-400 hover:text-green-300">{c.ticker}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CompanyLogo website={c.website} name={c.name} size={24} />
                      <div className="text-slate-200">{c.name}</div>
                    </div>
                    {c.description && <div className="text-xs text-slate-600 line-clamp-1 mt-0.5 max-w-xs">{c.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden lg:table-cell">{c.sector || '—'}</td>
                  <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{c.therapeutic_area || '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell"><StageBadge stage={c.most_advanced_stage} /></td>
                  <td className="px-4 py-3 text-center text-slate-300 hidden sm:table-cell">{c.pipeline_assets ?? 0}</td>
                  <td className="px-4 py-3 text-right text-slate-300 hidden sm:table-cell">{formatMarketCap(c.market_cap_m)}</td>
                  <td className="px-4 py-3 text-right text-slate-400 hidden sm:table-cell">
                    {c.cash_at_end ? `$${Number(c.cash_at_end).toFixed(1)}M` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const r = formatRunway(c)
                      const months = Number(c.runway_months)
                      const showBar = !c.is_cf_positive && c.cash_at_end !== null && months > 0 && months < 999
                      const barColor = months < 6 ? 'bg-rose-500' : months < 12 ? 'bg-amber-500' : 'bg-emerald-500'
                      const barPct = Math.min(100, (months / 18) * 100)
                      const isRaiseRisk = showBar && months < 6
                      const adjMonths = Number(c.adj_runway_months)
                      const rdtiPending = Number(c.rdti_pending_m ?? 0)
                      const showAdj = !c.is_cf_positive && rdtiPending > 0 && adjMonths > months && adjMonths < 999
                      return (
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={r.className}>{r.text}</span>
                          {showAdj && (
                            <span className="text-xs text-green-600" title={`+A$${rdtiPending.toFixed(1)}M RDTI refund expected`}>
                              +{Math.round(adjMonths - months)}mo RDTI
                            </span>
                          )}
                          {showBar && (
                            <div className="w-14 h-1 bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${barPct}%` }} />
                            </div>
                          )}
                          {isRaiseRisk && <RaiseRiskBadge />}
                        </div>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    {px.length >= 2 ? (
                      <div className="flex items-center gap-2">
                        <Sparkline prices={px} positive={pxPositive} />
                        {latestPrice && (
                          <span className={`text-xs ${pxPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ${latestPrice.toFixed(3)}
                          </span>
                        )}
                      </div>
                    ) : <span className="text-slate-700 text-xs">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
