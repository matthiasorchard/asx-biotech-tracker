'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend,
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

interface Props {
  raises: Raise[]
  sharesOutstandingM: number | null
}

export default function DilutionChart({ raises, sharesOutstandingM }: Props) {
  if (raises.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-600 text-sm">
        No capital raise data
      </div>
    )
  }

  const data = raises
    .filter(r => r.shares_issued_m && r.shares_issued_m > 0)
    .sort((a, b) => a.announce_date.localeCompare(b.announce_date))
    .map(r => ({
      date: r.announce_date.slice(0, 7), // YYYY-MM
      shares: Number(r.shares_issued_m),
      amount: r.amount_m ? Number(r.amount_m) : null,
      type: r.raise_type,
      price: r.price_per_share,
    }))

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-600 text-sm">
        No share issuance data
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
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} unit="M" />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6 }}
            labelStyle={{ color: '#94a3b8', fontSize: 11 }}
            formatter={(value, _name, entry: any) => {
              const d = entry.payload
              const parts = [`${Number(value).toFixed(1)}M shares`]
              if (d.amount) parts.push(`$${d.amount.toFixed(1)}M raised`)
              if (d.price) parts.push(`@ $${d.price.toFixed(3)}`)
              return [parts.join(' · '), RAISE_LABELS[d.type] ?? d.type]
            }}
          />
          <Bar dataKey="shares" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={RAISE_COLORS[entry.type] ?? '#64748b'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {Object.entries(RAISE_LABELS).map(([type, label]) => {
          if (!data.some(d => d.type === type)) return null
          return (
            <div key={type} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm" style={{ background: RAISE_COLORS[type] }} />
              <span className="text-xs text-slate-500">{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
