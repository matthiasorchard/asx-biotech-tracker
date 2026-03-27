import Link from 'next/link'
import { formatRunway } from '@/lib/utils'

export interface CompanyMeta {
  name: string
  runway_months?: number | null
  cash_at_end?: number | null
  is_cf_positive?: boolean | null
}

export default function TickerLink({
  ticker,
  meta,
  className = 'text-xs',
}: {
  ticker: string
  meta?: CompanyMeta
  className?: string
}) {
  const runway = meta
    ? formatRunway({ runway_months: meta.runway_months ?? null, cash_at_end: meta.cash_at_end ?? null, is_cf_positive: meta.is_cf_positive ?? null })
    : null

  const cash = meta?.cash_at_end != null
    ? `$${Number(meta.cash_at_end).toFixed(1)}M cash`
    : null

  return (
    <span className="relative group inline-block">
      <Link
        href={`/companies/${ticker}`}
        className={`font-mono font-bold text-green-400 hover:text-green-300 ${className}`}
      >
        {ticker}
      </Link>

      {meta && (
        <span className={`
          absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
          invisible group-hover:visible opacity-0 group-hover:opacity-100
          transition-all duration-150
          bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
          text-xs shadow-xl pointer-events-none min-w-max
        `}>
          <span className="block font-semibold text-white mb-1">{meta.name}</span>
          {runway && (
            <span className={`block text-xs ${runway.className}`}>
              {runway.text === 'CF+' ? 'CF Positive' : runway.text === 'No data' ? 'No cash data' : `${runway.text} runway`}
            </span>
          )}
          {cash && <span className="block text-slate-500 text-xs mt-0.5">{cash}</span>}
        </span>
      )}
    </span>
  )
}
