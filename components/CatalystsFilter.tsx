'use client'
import { useState, useMemo } from 'react'
import { formatDate } from '@/lib/utils'
import { ConfidenceBadge, ImpactBadge } from '@/components/Badge'
import TickerLink, { CompanyMeta } from '@/components/TickerLink'

const PILL = (active: boolean) =>
  `px-2.5 py-1 rounded-full text-xs transition-colors border cursor-pointer select-none ${
    active
      ? 'bg-green-900 border-green-700 text-green-300'
      : 'border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500'
  }`

function typeLabel(t: string) {
  return t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export default function CatalystsFilter({
  catalysts,
  companyMap = {},
}: {
  catalysts: any[]
  companyMap?: Record<string, CompanyMeta>
}) {
  const [filterType, setFilterType] = useState('')
  const [filterTicker, setFilterTicker] = useState('')
  const [filterImpact, setFilterImpact] = useState('')

  const upcoming = useMemo(() => catalysts.filter((c: any) => c.status === 'upcoming'), [catalysts])
  const completed = useMemo(() => catalysts.filter((c: any) => c.status !== 'upcoming'), [catalysts])

  const types = useMemo(
    () => [...new Set(upcoming.map((c: any) => c.event_type))].sort(),
    [upcoming]
  )
  const tickers = useMemo(
    () => [...new Set(catalysts.map((c: any) => c.ticker))].sort(),
    [catalysts]
  )

  const byType = useMemo(
    () => upcoming.reduce((acc: Record<string, number>, c: any) => {
      acc[c.event_type] = (acc[c.event_type] || 0) + 1
      return acc
    }, {}),
    [upcoming]
  )

  function applyFilters(list: any[]) {
    let r = list
    if (filterType) r = r.filter((c: any) => c.event_type === filterType)
    if (filterTicker) r = r.filter((c: any) => c.ticker === filterTicker)
    if (filterImpact) r = r.filter((c: any) => c.impact === filterImpact)
    return r
  }

  const filteredUpcoming = useMemo(() => applyFilters(upcoming), [upcoming, filterType, filterTicker, filterImpact])
  const filteredCompleted = useMemo(() => applyFilters(completed), [completed, filterType, filterTicker, filterImpact])

  const hasFilters = filterType || filterTicker || filterImpact

  function clearFilters() {
    setFilterType('')
    setFilterTicker('')
    setFilterImpact('')
  }

  return (
    <div className="space-y-6">
      {/* Type chips — clickable filter toggles */}
      <div className="flex flex-wrap gap-2">
        {types.map(type => (
          <button
            key={type}
            onClick={() => setFilterType(f => f === type ? '' : type)}
            className={`rounded-full px-3 py-1 text-xs transition-colors border ${
              filterType === type
                ? 'bg-green-900 border-green-700 text-green-300'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            {typeLabel(type)}
            <span className={`font-semibold ml-1 ${filterType === type ? 'text-green-400' : 'text-green-400'}`}>
              {byType[type]}
            </span>
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filterTicker}
          onChange={e => setFilterTicker(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-green-700"
        >
          <option value="">All Tickers</option>
          {tickers.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Impact chips */}
        <div className="flex gap-1.5">
          {(['', 'high', 'medium'] as const).map(i => (
            <button key={i} onClick={() => setFilterImpact(i)} className={PILL(filterImpact === i)}>
              {i === '' ? 'Any impact' : i.charAt(0).toUpperCase() + i.slice(1)}
            </button>
          ))}
        </div>

        {hasFilters && (
          <button onClick={clearFilters}
            className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1.5 border border-slate-700 rounded">
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-slate-600 self-center">
          {filteredUpcoming.length} upcoming{hasFilters ? ` of ${upcoming.length}` : ''}
        </span>
      </div>

      {/* Upcoming table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg">
        <div className="px-4 py-3 border-b border-slate-800">
          <h2 className="text-sm font-medium text-slate-300">Upcoming ({filteredUpcoming.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-800">
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Ticker</th>
                <th className="text-left px-4 py-2">Event</th>
                <th className="text-left px-4 py-2 hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-2 hidden md:table-cell">Confidence</th>
                <th className="text-left px-4 py-2 hidden md:table-cell">Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredUpcoming.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-600 text-sm">
                    No catalysts match the current filters
                  </td>
                </tr>
              ) : filteredUpcoming.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                    {formatDate(c.expected_date)}
                    {c.times_delayed ? (
                      <div className="text-amber-600 text-xs">{c.times_delayed}× delayed</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <TickerLink ticker={c.ticker} meta={companyMap[c.ticker]} />
                  </td>
                  <td className="px-4 py-3">
                    {c.source_url ? (
                      <a href={c.source_url} target="_blank" rel="noopener noreferrer"
                        className="text-slate-200 hover:text-green-300 underline decoration-slate-600 underline-offset-2">
                        {c.title}
                      </a>
                    ) : (
                      <span className="text-slate-200">{c.title}</span>
                    )}
                    {c.description && <div className="text-xs text-slate-500 mt-0.5">{c.description}</div>}
                    {!c.source_url && (
                      <div className="text-xs text-slate-700 mt-0.5 italic">Manually curated — source doc will link when announcement is parsed</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">{typeLabel(c.event_type)}</td>
                  <td className="px-4 py-3 hidden md:table-cell"><ConfidenceBadge confidence={c.confidence} /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><ImpactBadge impact={c.impact} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Completed table */}
      {filteredCompleted.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg">
          <div className="px-4 py-3 border-b border-slate-800">
            <h2 className="text-sm font-medium text-slate-300">Completed ({filteredCompleted.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-800">
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Ticker</th>
                  <th className="text-left px-4 py-2">Event</th>
                  <th className="text-left px-4 py-2 hidden md:table-cell">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 opacity-70">
                {filteredCompleted.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">{formatDate(c.actual_date || c.expected_date)}</td>
                    <td className="px-4 py-2.5">
                      <TickerLink ticker={c.ticker} meta={companyMap[c.ticker]} />
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{c.title}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      {c.outcome ? (
                        <span className={c.outcome_sentiment === 'positive' ? 'text-emerald-400 text-xs' : c.outcome_sentiment === 'negative' ? 'text-rose-400 text-xs' : 'text-slate-400 text-xs'}>
                          {c.outcome}
                        </span>
                      ) : <span className="text-slate-600 text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
