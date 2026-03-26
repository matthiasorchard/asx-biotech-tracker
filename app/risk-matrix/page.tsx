import { supabase } from '@/lib/supabase'
import RiskMatrix from '@/components/RiskMatrix'

export const revalidate = 900

async function getRiskMatrixData() {
  const today = new Date().toISOString().split('T')[0]

  // Get one upcoming catalyst per company (the nearest one)
  const { data } = await supabase
    .from('catalyst')
    .select(`
      ticker,
      title,
      event_type,
      expected_date,
      impact,
      confidence,
      company_dashboard!inner(runway_months, cash_at_end, is_cf_positive)
    `)
    .eq('status', 'upcoming')
    .gte('expected_date', today)
    .order('expected_date', { ascending: true })

  if (!data) return []

  const today_ms = new Date().getTime()

  // One dot per company — pick nearest catalyst per ticker
  const seen = new Set<string>()
  const points = []

  for (const row of data) {
    const cd = (row as any).company_dashboard
    const runway = Number(cd?.runway_months ?? 0)
    const isCfPos = cd?.is_cf_positive === true

    // runway_display: cap at 24 for display, CF+ or 999 → 25 (above top reference line)
    const runway_display = isCfPos || runway >= 999 ? 25 : Math.min(runway, 24)
    const runway_label = isCfPos || runway >= 999
      ? 'CF+'
      : `${runway}mo`

    const catalyst_date = new Date(row.expected_date).getTime()
    const days = Math.max(0, Math.round((catalyst_date - today_ms) / 86400000))

    // Show nearest catalyst per company, but allow multiple if different event types
    const key = `${row.ticker}-${row.event_type}`
    if (seen.has(key)) continue
    seen.add(key)

    points.push({
      ticker: row.ticker,
      title: row.title,
      event_type: row.event_type,
      impact: row.impact,
      confidence: row.confidence,
      days_to_catalyst: days,
      runway_display,
      runway_label,
      cash_at_end: cd?.cash_at_end ?? null,
      is_cf_positive: isCfPos,
    })
  }

  return points
}

export default async function RiskMatrixPage() {
  const data = await getRiskMatrixData()

  const highImpact = data.filter(d => d.impact === 'high' && d.days_to_catalyst <= 90)
  const dangerZone = data.filter(d => d.runway_display <= 6 && !d.is_cf_positive)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Risk Matrix</h1>
        <p className="text-sm text-slate-500 mt-1">
          Cash runway vs days to next catalyst — spot binary event risk at a glance
        </p>
      </div>

      {/* Summary callouts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Catalysts tracked', value: data.length },
          { label: 'High impact (≤90d)', value: highImpact.length, color: 'text-cyan-400' },
          { label: 'Danger zone (<6mo)', value: dangerZone.length, color: dangerZone.length > 0 ? 'text-rose-400' : 'text-slate-400' },
          { label: 'CF positive', value: data.filter(d => d.is_cf_positive).length, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">{s.label}</div>
            <div className={`text-2xl font-semibold ${s.color ?? 'text-white'}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <RiskMatrix data={data} />
      </div>
    </div>
  )
}
