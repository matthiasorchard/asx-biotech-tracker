'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { formatQuarter } from '@/lib/utils'
import { Quarterly4C } from '@/lib/types'

interface Props { data: Quarterly4C[] }

export default function CashflowChart({ data }: Props) {
  if (!data.length) return (
    <div className="flex items-center justify-center h-40 text-slate-600 text-sm">No cash flow data</div>
  )

  const chartData = data.map(q => ({
    quarter: formatQuarter(q.quarter_end),
    operating: q.total_operating_cf ?? 0,
    cash: q.cash_at_end ?? 0,
    burn: q.burn_rate ? -Math.abs(q.burn_rate) : 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="quarter" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
          tickFormatter={v => `$${v}M`} />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, fontSize: 12 }}
          labelStyle={{ color: '#94a3b8' }}
          formatter={(v) => [`$${Number(v).toFixed(1)}M`, '']}
        />
        <ReferenceLine y={0} stroke="#334155" />
        <Bar dataKey="operating" name="Operating CF"
          fill="#0e7490" radius={[2, 2, 0, 0]}
          label={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}
