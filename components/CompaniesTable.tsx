'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatMarketCap, formatRunway } from '@/lib/utils'
import { StageBadge } from '@/components/Badge'
import Sparkline from '@/components/Sparkline'

type SortKey = 'ticker' | 'name' | 'market_cap_m' | 'cash_at_end' | 'runway_months' | 'pipeline_assets'
type SortDir = 'asc' | 'desc'

export default function CompaniesTable({
  companies,
  priceMap = {},
}: {
  companies: any[]
  priceMap?: Record<string, number[]>
}) {
  const [search, setSearch] = useState('')
  const [filterArea, setFilterArea] = useState('')
  const [filterSector, setFilterSector] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('market_cap_m')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const areas = useMemo(() => [...new Set(companies.map((c: any) => c.therapeutic_area).filter(Boolean))].sort(), [companies])
  const sectors = useMemo(() => [...new Set(companies.map((c: any) => c.sector).filter(Boolean))].sort(), [companies])

  const filtered = useMemo(() => {
    let r = companies
    if (search) r = r.filter((c: any) => c.ticker.toLowerCase().includes(search.toLowerCase()) || c.name.toLowerCase().includes(search.toLowerCase()))
    if (filterArea) r = r.filter((c: any) => c.therapeutic_area === filterArea)
    if (filterSector) r = r.filter((c: any) => c.sector === filterSector)
    return [...r].sort((a: any, b: any) => {
      const av = a[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity)
      const bv = b[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity)
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [companies, search, filterArea, filterSector, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  function Th({ k, label }: { k: SortKey; label: string }) {
    const active = sortKey === k
    return (
      <th className="text-left px-4 py-2 font-medium cursor-pointer select-none hover:text-slate-300 transition-colors"
        onClick={() => toggleSort(k)}>
        {label} {active ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-slate-700">↕</span>}
      </th>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text" placeholder="Search ticker or name…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-700 w-52"
        />
        <select value={filterArea} onChange={e => setFilterArea(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-cyan-700">
          <option value="">All Therapeutic Areas</option>
          {areas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filterSector} onChange={e => setFilterSector(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-cyan-700">
          <option value="">All Sectors</option>
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(search || filterArea || filterSector) && (
          <button onClick={() => { setSearch(''); setFilterArea(''); setFilterSector('') }}
            className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1.5 border border-slate-700 rounded">
            Clear filters
          </button>
        )}
        <span className="ml-auto text-xs text-slate-600 self-center">{filtered.length} companies</span>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 border-b border-slate-800">
              <Th k="ticker" label="Ticker" />
              <Th k="name" label="Company" />
              <th className="text-left px-4 py-2 font-medium hidden lg:table-cell">Sector</th>
              <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Therapeutic Area</th>
              <th className="text-left px-4 py-2 font-medium hidden lg:table-cell">Lead Stage</th>
              <Th k="pipeline_assets" label="Assets" />
              <Th k="market_cap_m" label="Mkt Cap" />
              <Th k="cash_at_end" label="Cash" />
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
                    <Link href={`/companies/${c.ticker}`} className="font-mono font-bold text-cyan-400 hover:text-cyan-300">{c.ticker}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-200">{c.name}</div>
                    {c.description && <div className="text-xs text-slate-600 line-clamp-1 mt-0.5 max-w-xs">{c.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden lg:table-cell">{c.sector || '—'}</td>
                  <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{c.therapeutic_area || '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell"><StageBadge stage={c.most_advanced_stage} /></td>
                  <td className="px-4 py-3 text-center text-slate-300">{c.pipeline_assets ?? 0}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{formatMarketCap(c.market_cap_m)}</td>
                  <td className="px-4 py-3 text-right text-slate-400">
                    {c.cash_at_end ? `$${Number(c.cash_at_end).toFixed(1)}M` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(() => { const r = formatRunway(c); return <span className={r.className}>{r.text}</span> })()}
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
