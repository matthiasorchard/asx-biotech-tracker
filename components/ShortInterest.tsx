'use client'

interface ShortRow {
  report_date: string
  short_pct: number | null
  short_position_shares: number | null
  total_shares: number | null
  source_url: string | null
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 80
  const h = 24
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')
  const latest = values[values.length - 1]
  const prev = values[values.length - 2]
  const rising = latest > prev
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={rising ? '#f87171' : '#34d399'} strokeWidth={1.5} />
    </svg>
  )
}

export default function ShortInterest({ history }: { history: ShortRow[] }) {
  if (history.length === 0) return null

  const latest = history[0]
  const pctValues = history.map(r => r.short_pct ?? 0).reverse()
  const trend = pctValues.length >= 2
    ? pctValues[pctValues.length - 1] - pctValues[0]
    : null

  const pct = latest.short_pct
  const pctColor = pct == null ? 'text-slate-500'
    : pct >= 10 ? 'text-rose-400'
    : pct >= 5  ? 'text-amber-400'
    : 'text-emerald-400'

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-medium text-slate-300 min-w-0">Short Interest</h2>
        <div className="flex items-center gap-3 text-xs">
          {latest.source_url ? (
            <a href={latest.source_url} target="_blank" rel="noopener noreferrer"
              className="text-slate-600 hover:text-slate-400">
              ASIC ↗
            </a>
          ) : (
            <span className="text-slate-700">ASIC</span>
          )}
          <span className="text-slate-700">as of {latest.report_date} (T+4)</span>
        </div>
      </div>

      <div className="px-4 py-4 flex items-center gap-8">
        {/* Current short % */}
        <div>
          <div className="text-xs text-slate-500 mb-1">Short position</div>
          <div className={`text-2xl font-bold ${pctColor}`}>
            {pct != null ? `${pct.toFixed(2)}%` : '—'}
          </div>
          {trend !== null && (
            <div className={`text-xs mt-0.5 ${trend > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {trend > 0 ? `▲ +${trend.toFixed(2)}%` : `▼ ${trend.toFixed(2)}%`}
              <span className="text-slate-600"> over {history.length} reports</span>
            </div>
          )}
        </div>

        {/* Sparkline */}
        {pctValues.length >= 3 && (
          <div className="flex flex-col gap-1">
            <Sparkline values={pctValues} />
            <div className="flex justify-between text-xs text-slate-700" style={{ width: 80 }}>
              <span>{history[history.length - 1]?.report_date?.slice(0, 7)}</span>
              <span>{history[0]?.report_date?.slice(0, 7)}</span>
            </div>
          </div>
        )}

        {/* Shares detail */}
        {latest.short_position_shares != null && (
          <div>
            <div className="text-xs text-slate-500 mb-1">Shares short</div>
            <div className="text-sm text-slate-300 font-mono">
              {(latest.short_position_shares / 1_000_000).toFixed(1)}M
            </div>
          </div>
        )}
      </div>

      {/* Context note */}
      <div className="px-4 pb-3 text-xs text-slate-700">
        Aggregated short position data published by ASIC under the Corporations Act. T+4 reporting lag applies.
        Short interest ≥5% is noteworthy; ≥10% is elevated. Source:{' '}
        <a href="https://asic.gov.au/regulatory-resources/markets/short-selling/short-selling-data/"
          target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-400">
          ASIC Short Selling Data
        </a>
      </div>
    </div>
  )
}
