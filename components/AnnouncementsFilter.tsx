'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatDate, categoryLabel } from '@/lib/utils'
import { CategoryBadge } from '@/components/Badge'

const ALL_CATEGORIES = [
  'quarterly_4c','half_year_report','annual_report','capital_raise','trial_results',
  'regulatory','presentation','insider_trade','partnership','agm','trading_halt','other'
]

export default function AnnouncementsFilter({ announcements }: { announcements: any[] }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [ticker, setTicker] = useState('')
  const [priceSensitive, setPriceSensitive] = useState(false)

  const tickers = useMemo(() => [...new Set(announcements.map((a: any) => a.ticker))].sort(), [announcements])

  const filtered = useMemo(() => {
    let r = announcements
    if (search) r = r.filter((a: any) => a.title.toLowerCase().includes(search.toLowerCase()) || a.ticker.toLowerCase().includes(search.toLowerCase()))
    if (category) r = r.filter((a: any) => a.category === category)
    if (ticker) r = r.filter((a: any) => a.ticker === ticker)
    if (priceSensitive) r = r.filter((a: any) => a.is_price_sensitive)
    return r
  }, [announcements, search, category, ticker, priceSensitive])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input
          type="text" placeholder="Search title or ticker…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-700 w-52"
        />
        <select value={ticker} onChange={e => setTicker(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-cyan-700">
          <option value="">All Tickers</option>
          {tickers.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-cyan-700">
          <option value="">All Categories</option>
          {ALL_CATEGORIES.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
          <input type="checkbox" checked={priceSensitive} onChange={e => setPriceSensitive(e.target.checked)}
            className="accent-amber-400" />
          Price Sensitive only
        </label>
        <span className="ml-auto text-xs text-slate-600 self-center">{filtered.length} announcements</span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg divide-y divide-slate-800">
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-600 text-sm">No announcements match your filters</div>
        )}
        {filtered.map((a: any) => (
          <div key={a.id} className="px-4 py-3 hover:bg-slate-800/40 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Link href={`/companies/${a.ticker}`} className="text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 shrink-0">{a.ticker}</Link>
                  <CategoryBadge category={a.category} />
                  {a.is_price_sensitive && <span className="text-xs text-amber-400 border border-amber-800 rounded px-1">Price Sensitive</span>}
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
