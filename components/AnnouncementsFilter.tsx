'use client'
import { useState, useMemo } from 'react'
import { formatDate, categoryLabel } from '@/lib/utils'
import { CategoryBadge } from '@/components/Badge'
import TickerLink, { CompanyMeta } from '@/components/TickerLink'

const ALL_CATEGORIES = [
  'quarterly_4c','half_year_report','annual_report','capital_raise','trial_results',
  'regulatory','presentation','insider_trade','partnership','agm','trading_halt','other',
]

const PILL = (active: boolean) =>
  `px-2.5 py-1 rounded-full text-xs transition-colors border cursor-pointer select-none whitespace-nowrap ${
    active
      ? 'bg-green-900 border-green-700 text-green-300'
      : 'border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500'
  }`

export default function AnnouncementsFilter({
  announcements,
  companyMap = {},
}: {
  announcements: any[]
  companyMap?: Record<string, CompanyMeta>
}) {
  const [search, setSearch]               = useState('')
  const [category, setCategory]           = useState('')
  const [ticker, setTicker]               = useState('')
  const [priceSensitive, setPriceSensitive] = useState(false)

  const tickers = useMemo(() => [...new Set(announcements.map((a: any) => a.ticker))].sort(), [announcements])

  // Only show categories that actually exist in data
  const presentCategories = useMemo(
    () => ALL_CATEGORIES.filter(c => announcements.some((a: any) => a.category === c)),
    [announcements]
  )

  const filtered = useMemo(() => {
    let r = announcements
    if (search)        r = r.filter((a: any) => a.title.toLowerCase().includes(search.toLowerCase()) || a.ticker.toLowerCase().includes(search.toLowerCase()))
    if (category)      r = r.filter((a: any) => a.category === category)
    if (ticker)        r = r.filter((a: any) => a.ticker === ticker)
    if (priceSensitive) r = r.filter((a: any) => a.is_price_sensitive)
    return r
  }, [announcements, search, category, ticker, priceSensitive])

  const hasFilters = !!(search || category || ticker || priceSensitive)

  return (
    <div className="space-y-3">
      {/* Row 1: Search + ticker + PS toggle + count */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text" placeholder="Search title or ticker…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-green-700 w-full sm:w-52"
        />
        <select value={ticker} onChange={e => setTicker(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-green-700">
          <option value="">All Tickers</option>
          {tickers.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
          <input type="checkbox" checked={priceSensitive} onChange={e => setPriceSensitive(e.target.checked)}
            className="accent-amber-400" />
          Price Sensitive
        </label>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setCategory(''); setTicker(''); setPriceSensitive(false) }}
            className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1.5 border border-slate-700 rounded">
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-slate-600">{filtered.length} announcements</span>
      </div>

      {/* Row 2: Category chips */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setCategory('')} className={PILL(!category)}>All</button>
        {presentCategories.map(c => (
          <button key={c} onClick={() => setCategory(category === c ? '' : c)} className={PILL(category === c)}>
            {categoryLabel(c)}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg divide-y divide-slate-800">
        {filtered.length === 0 && (
          <div className="px-4 py-10 text-center">
            <div className="text-slate-600 text-sm">No announcements match your filters</div>
            {hasFilters && (
              <button onClick={() => { setSearch(''); setCategory(''); setTicker(''); setPriceSensitive(false) }}
                className="mt-2 text-xs text-green-600 hover:text-green-400">
                Clear filters
              </button>
            )}
          </div>
        )}
        {filtered.map((a: any) => (
          <div key={a.id} className="px-4 py-3 hover:bg-slate-800/40 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <TickerLink ticker={a.ticker} meta={companyMap[a.ticker]} />
                  <CategoryBadge category={a.category} />
                  {a.is_price_sensitive && (
                    <span className="text-xs text-amber-400 border border-amber-800 rounded px-1">PS</span>
                  )}
                </div>
                <a href={a.asx_url} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-slate-200 hover:text-white">
                  {a.title}
                </a>
              </div>
              <div className="text-xs text-slate-600 shrink-0 whitespace-nowrap text-right">
                {formatDate(a.release_date)}
                {a.size && <div className="text-slate-700 mt-0.5">{a.size}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
