'use client'

import { useState, useMemo } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell, ReferenceArea } from 'recharts'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const EVENT_COLORS: Record<string, string> = {
  data_readout:            '#06b6d4',
  regulatory_decision:     '#f59e0b',
  financing:               '#ef4444',
  commercial_milestone:    '#10b981',
  conference_presentation: '#8b5cf6',
  other:                   '#64748b',
}

const EVENT_LABELS: Record<string, string> = {
  data_readout:            'Data Readout',
  regulatory_decision:     'Regulatory',
  financing:               'Financing',
  commercial_milestone:    'Commercial',
  conference_presentation: 'Conference',
  other:                   'Other',
}

const IMPACT_SIZE: Record<string, number> = { high: 140, medium: 70, low: 30 }
const CONFIDENCE_OPACITY: Record<string, number> = { confirmed: 1.0, expected: 0.75, speculative: 0.45 }

interface DataPoint {
  ticker: string
  title: string
  event_type: string
  impact: string
  confidence: string
  days_to_catalyst: number
  runway_display: number
  runway_label: string
  cash_at_end: number | null
  is_cf_positive: boolean | null
}

const HORIZONS = [
  { label: 'All', days: 9999 },
  { label: '30d', days: 30 },
  { label: '60d', days: 60 },
  { label: '90d', days: 90 },
  { label: '180d', days: 180 },
]

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d: DataPoint = payload[0].payload
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs shadow-xl max-w-56 pointer-events-none">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono font-bold text-cyan-400 text-sm">{d.ticker}</span>
        <span className="text-slate-500">{EVENT_LABELS[d.event_type] ?? d.event_type}</span>
      </div>
      <div className="text-slate-200 mb-2 leading-snug">{d.title}</div>
      <div className="space-y-0.5 text-slate-400">
        <div>In <span className="text-white">{d.days_to_catalyst}d</span></div>
        <div>Runway <span className="text-white">{d.runway_label}</span></div>
        {d.cash_at_end && <div>Cash <span className="text-white">${Number(d.cash_at_end).toFixed(1)}M</span></div>}
        <div className="capitalize">{d.impact} impact · {d.confidence}</div>
      </div>
      <div className="mt-2 text-cyan-500 text-xs">Click to view →</div>
    </div>
  )
}

export default function RiskMatrix({ data }: { data: DataPoint[] }) {
  const router = useRouter()
  const [horizon, setHorizon] = useState(9999)
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set())
  const [impactFilter, setImpactFilter] = useState<string>('')

  const presentTypes = useMemo(() => [...new Set(data.map(d => d.event_type))], [data])

  function toggleType(type: string) {
    setSelectedTypes(prev => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  const filtered = useMemo(() => data.filter(d => {
    if (d.days_to_catalyst > horizon) return false
    if (selectedTypes.size > 0 && !selectedTypes.has(d.event_type)) return false
    if (impactFilter && d.impact !== impactFilter) return false
    return true
  }), [data, horizon, selectedTypes, impactFilter])

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-64 text-slate-600 text-sm">No upcoming catalyst data</div>
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Horizon */}
        <div className="flex rounded overflow-hidden border border-slate-700">
          {HORIZONS.map(h => (
            <button key={h.days}
              onClick={() => setHorizon(h.days)}
              className={`px-3 py-1 text-xs transition-colors ${horizon === h.days ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
              {h.label}
            </button>
          ))}
        </div>

        {/* Event type toggles */}
        <div className="flex flex-wrap gap-1">
          {presentTypes.map(type => {
            const active = selectedTypes.size === 0 || selectedTypes.has(type)
            return (
              <button key={type} onClick={() => toggleType(type)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs border transition-colors ${active ? 'border-slate-600 text-slate-300' : 'border-slate-800 text-slate-600'}`}>
                <div className="w-2 h-2 rounded-full" style={{ background: active ? EVENT_COLORS[type] : '#334155' }} />
                {EVENT_LABELS[type] ?? type}
              </button>
            )
          })}
        </div>

        {/* Impact filter */}
        <select value={impactFilter} onChange={e => setImpactFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none">
          <option value="">All impact</option>
          <option value="high">High only</option>
          <option value="medium">Medium only</option>
          <option value="low">Low only</option>
        </select>

        {(selectedTypes.size > 0 || impactFilter || horizon !== 9999) && (
          <button onClick={() => { setSelectedTypes(new Set()); setImpactFilter(''); setHorizon(9999) }}
            className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 border border-slate-700 rounded">
            Reset
          </button>
        )}
        <span className="ml-auto text-xs text-slate-600">{filtered.length} catalysts</span>
      </div>

      {/* Quadrant legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {[
          { label: 'Binary Risk', desc: 'Low runway + near catalyst', color: 'border-rose-900 text-rose-400' },
          { label: 'Well Funded', desc: 'High runway + near catalyst', color: 'border-emerald-900 text-emerald-400' },
          { label: 'Runway Watch', desc: 'Low runway, time to act', color: 'border-amber-900 text-amber-400' },
          { label: 'Watch List', desc: 'Funded, catalyst upcoming', color: 'border-slate-700 text-slate-400' },
        ].map(q => (
          <div key={q.label} className={`border rounded p-2 ${q.color}`}>
            <div className="font-medium">{q.label}</div>
            <div className="text-slate-600 mt-0.5">{q.desc}</div>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={460}>
        <ScatterChart margin={{ top: 16, right: 24, bottom: 32, left: 16 }}>
          {/* Quadrant shading */}
          <ReferenceArea x1={0} x2={horizon < 9999 ? horizon / 2 : 90} y1={0} y2={6}
            fill="#ef4444" fillOpacity={0.04} />
          <ReferenceArea x1={0} x2={horizon < 9999 ? horizon / 2 : 90} y1={12} y2={26}
            fill="#10b981" fillOpacity={0.04} />

          <XAxis type="number" dataKey="days_to_catalyst" name="Days"
            label={{ value: 'Days to catalyst', position: 'insideBottom', offset: -16, fill: '#475569', fontSize: 12 }}
            tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
          <YAxis type="number" dataKey="runway_display" name="Runway"
            tickFormatter={v => v >= 24 ? 'CF+' : `${v}mo`}
            label={{ value: 'Cash runway', angle: -90, position: 'insideLeft', offset: 12, fill: '#475569', fontSize: 12 }}
            tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#1e293b' }}
            domain={[0, 26]} ticks={[0, 3, 6, 12, 18, 24]} />
          <ReferenceLine y={6} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.4}
            label={{ value: '6mo', fill: '#ef4444', fontSize: 10, opacity: 0.6 }} />
          <ReferenceLine y={12} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.3}
            label={{ value: '12mo', fill: '#f59e0b', fontSize: 10, opacity: 0.5 }} />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#334155' }} />
          <Scatter
            data={filtered}
            isAnimationActive={false}
            onClick={(d: any) => router.push(`/companies/${d.ticker}`)}
            style={{ cursor: 'pointer' }}
          >
            {filtered.map((entry, i) => (
              <Cell key={i}
                fill={EVENT_COLORS[entry.event_type] ?? '#64748b'}
                fillOpacity={CONFIDENCE_OPACITY[entry.confidence] ?? 0.6}
                r={Math.sqrt(IMPACT_SIZE[entry.impact] ?? 50)}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* Detail table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-slate-800">
              <th className="text-left py-2 pr-3">Company</th>
              <th className="text-left py-2 pr-3">Catalyst</th>
              <th className="text-left py-2 pr-3 hidden md:table-cell">Type</th>
              <th className="text-left py-2 pr-3">Days</th>
              <th className="text-left py-2 pr-3">Runway</th>
              <th className="text-left py-2 pr-3 hidden md:table-cell">Impact</th>
              <th className="text-left py-2">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {[...filtered].sort((a, b) => a.days_to_catalyst - b.days_to_catalyst).map((d, i) => (
              <tr key={i} className="hover:bg-slate-800/30">
                <td className="py-2 pr-3">
                  <Link href={`/companies/${d.ticker}`} className="font-mono text-cyan-400 hover:text-cyan-300">{d.ticker}</Link>
                </td>
                <td className="py-2 pr-3 text-slate-300 max-w-48 truncate">{d.title}</td>
                <td className="py-2 pr-3 text-slate-500 hidden md:table-cell capitalize">{EVENT_LABELS[d.event_type] ?? d.event_type}</td>
                <td className="py-2 pr-3 text-slate-300">{d.days_to_catalyst}d</td>
                <td className={`py-2 pr-3 ${d.runway_display <= 6 ? 'text-rose-400' : d.runway_display <= 12 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {d.runway_label}
                </td>
                <td className="py-2 pr-3 hidden md:table-cell capitalize text-slate-400">{d.impact}</td>
                <td className="py-2 capitalize text-slate-500">{d.confidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
