'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'

export default function Sparkline({ prices, positive }: { prices: number[]; positive: boolean }) {
  if (prices.length < 2) return <div className="w-16 h-8 bg-slate-800/40 rounded" />
  const data = prices.map(p => ({ p }))
  return (
    <ResponsiveContainer width={64} height={28}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="p"
          stroke={positive ? '#10b981' : '#ef4444'}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
