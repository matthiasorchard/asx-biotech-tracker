'use client'

import {
  ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ReferenceLine,
} from 'recharts'

const RAISE_COLORS: Record<string, string> = {
  placement:        '#06b6d4',
  spp:              '#8b5cf6',
  rights_issue:     '#f59e0b',
  options_exercise: '#10b981',
  convertible_note: '#ef4444',
  ipo:              '#f97316',
  other:            '#64748b',
}

const RAISE_LABELS: Record<string, string> = {
  placement:        'Placement',
  spp:              'SPP',
  rights_issue:     'Rights Issue',
  options_exercise: 'Options',
  convertible_note: 'Conv. Note',
  ipo:              'IPO',
  other:            'Other',
}

interface Raise {
  id: number
  announce_date: string
  raise_type: string
  amount_m: number | null
  shares_issued_m: number | null
  price_per_share: number | null
}

interface Buyback {
  id: number
  announce_date: string
  shares_cancelled_m: number | null
  amount_m: number | null
  buyback_type: string
  notes: string | null
}

interface Props {
  raises: Raise[]
  buybacks: Buyback[]
  sharesOutstandingM: number | null
}

export default function DilutionChart({ raises, buybacks, sharesOutstandingM }: Props) {
  const raiseData = raises
    .filter(r => r.shares_issued_m && r.shares_issued_m > 0)
    .map(r => ({
      date: r.announce_date.slice(0, 7),
      shares: Number(r.shares_issued_m),
      amount: r.amount_m ? Number(r.amount_m) : null,
      type: r.raise_type,
      price: r.price_per_share,
      kind: 'raise' as const,
    }))

  const buybackData = buybacks
    .filter(b => b.shares_cancelled_m && b.shares_cancelled_m > 0)
    .map(b => ({
      date: b.announce_date.slice(0, 7),
      shares: -Number(b.shares_cancelled_m),
      amount: b.amount_m ? Number(b.amount_m) : null,
      type: b.buyback_type,
      price: null,
      kind: 'buyback' as const,
    }))

  // Merge and sort by date
  const allData = [...raiseData, ...buybackData].sort((a, b) => a.date.localeCompare(b.date))

  const hasRaises = raiseData.length > 0
  const hasBuybacks = buybackData.length > 0

  if (!hasRaises && !hasBuybacks) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-600 text-sm">
        No capital raise or buyback data
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sharesOutstandingM && (
        <div className="text-xs text-slate-500">
          Current shares outstanding:{' '}
          <span className="text-slate-300 font-medium">
            {sharesOutstandingM >= 1000
              ? `${(sharesOutstandingM / 1000).toFixed(1)}B`
              : `${sharesOutstandingM.toFixed(0)}M`}
          </span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={allData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
          <YAxis
            tick={{ fontSize: 10, fill: '#64748b' }}
            unit="M"
            tickFormatter={v => `${v < 0 ? '' : ''}${v}`}
          />
          <ReferenceLine y={0} stroke="#334155" strokeWidth={1} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6 }}
            labelStyle={{ color: '#94a3b8', fontSize: 11 }}
            formatter={(value: any, _name: any, entry: any) => {
              const d = entry.payload
              if (d.kind === 'buyback') {
                const parts = [`${Math.abs(Number(value)).toFixed(1)}M shares cancelled`]
                if (d.amount) parts.push(`$${d.amount.toFixed(1)}M spent`)
                return [parts.join(' · '), 'Buyback']
              }
              const parts = [`${Number(value).toFixed(1)}M shares issued`]
              if (d.amount) parts.push(`$${d.amount.toFixed(1)}M raised`)
              if (d.price) parts.push(`@ $${d.price.toFixed(3)}`)
              return [parts.join(' · '), RAISE_LABELS[d.type] ?? d.type]
            }}
          />
          <Bar dataKey="shares" radius={[3, 3, 0, 0]}>
            {allData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.kind === 'buyback' ? '#10b981' : (RAISE_COLORS[entry.type] ?? '#64748b')}
              />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {Object.entries(RAISE_LABELS).map(([type, label]) => {
          if (!raiseData.some(d => d.type === type)) return null
          return (
            <div key={type} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm" style={{ background: RAISE_COLORS[type] }} />
              <span className="text-xs text-slate-500">{label}</span>
            </div>
          )
        })}
        {hasBuybacks && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-emerald-500" />
            <span className="text-xs text-slate-500">Buyback</span>
          </div>
        )}
      </div>
    </div>
  )
}
