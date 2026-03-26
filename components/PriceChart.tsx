'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Snapshot {
  snapshot_date: string
  close_price: number | null
}

export default function PriceChart({ data }: { data: Snapshot[] }) {
  const filtered = data.filter(d => d.close_price != null)
  if (filtered.length < 2) {
    return <div className="flex items-center justify-center h-32 text-slate-600 text-sm">No price data</div>
  }

  const prices = filtered.map(d => Number(d.close_price))
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const first = prices[0]
  const last = prices[prices.length - 1]
  const change = ((last - first) / first) * 100
  const positive = change >= 0

  const chartData = filtered.map(d => ({
    date: d.snapshot_date.slice(5), // MM-DD
    price: Number(d.close_price),
  }))

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-semibold text-white">${last.toFixed(3)}</span>
        <span className={`text-sm font-medium ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {positive ? '+' : ''}{change.toFixed(1)}% <span className="text-slate-600 font-normal text-xs">90d</span>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${positive ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={positive ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
              <stop offset="95%" stopColor={positive ? '#10b981' : '#ef4444'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} axisLine={false}
            interval={Math.floor(chartData.length / 4)} />
          <YAxis domain={[min * 0.97, max * 1.03]} hide />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 4, fontSize: 11 }}
            formatter={(v) => [`$${Number(v).toFixed(3)}`, 'Price']}
            labelStyle={{ color: '#64748b' }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={positive ? '#10b981' : '#ef4444'}
            strokeWidth={1.5}
            fill={`url(#grad-${positive ? 'up' : 'down'})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex justify-between text-xs text-slate-600">
        <span>Low ${min.toFixed(3)}</span>
        <span>High ${max.toFixed(3)}</span>
      </div>
    </div>
  )
}
