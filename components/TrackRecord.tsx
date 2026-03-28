'use client'
import { useState } from 'react'

function InfoTooltip() {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-4 h-4 rounded-full border border-slate-600 text-slate-500 hover:text-slate-300 hover:border-slate-400 text-xs flex items-center justify-center transition-colors"
        aria-label="How is this score calculated?"
      >
        ?
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-6 z-20 w-72 bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl text-xs text-slate-300 space-y-2">
            <p className="font-semibold text-white">How the execution score works</p>
            <p>Two dimensions are scored independently, then averaged:</p>
            <div className="space-y-1.5">
              <div>
                <span className="text-slate-200 font-medium">Delivery</span>
                <span className="text-slate-400"> — Did catalysts arrive on time? Tolerance is phase-adjusted: Phase 1 allows ±180 days, Phase 2 ±120 days, Phase 3 ±60 days. High-impact catalysts carry more weight. Requires 3+ completed catalysts.</span>
              </div>
              <div>
                <span className="text-slate-200 font-medium">Capital discipline</span>
                <span className="text-slate-400"> — How stable is the quarterly burn rate? Large sudden spikes lower the score; sustained reductions improve it.</span>
              </div>
            </div>
            <p className="text-slate-500 border-t border-slate-700 pt-2">Science outcomes (positive/negative readouts) are intentionally excluded — a drug failing is not a management failure.</p>
            <p className="text-slate-500">Default view shows the rolling 2-year window. Toggle to full history for the complete picture.</p>
          </div>
        </>
      )}
    </div>
  )
}

interface Catalyst {
  id: number
  title: string
  event_type: string
  status: string
  original_expected_date: string | null
  expected_date: string | null
  actual_date: string | null
  times_delayed: number
  outcome: string | null
  outcome_sentiment: string | null
  impact: string | null
  asset_id: number | null
}

interface QuarterlyCashflow {
  quarter_end: string
  burn_rate: number | null
  cash_at_end: number | null
}

interface PipelineAsset {
  id: number
  stage: string
}

interface ExplainerEvent {
  sentiment: 'positive' | 'negative' | 'neutral'
  label: string
  detail: string
}

interface ScoreResult {
  score: number | null
  events: ExplainerEvent[]
  sampleSize: number
  minSample: number
}

// Phase-adjusted tolerance window in days
function getPhaseTolerance(stage: string | null): number {
  switch (stage) {
    case 'phase_1':
    case 'phase_1_2': return 180
    case 'phase_2':
    case 'phase_2_3': return 120
    case 'phase_3': return 60
    case 'approved': return 30
    default: return 90
  }
}

function impactWeight(impact: string | null): number {
  if (impact === 'high') return 3
  if (impact === 'medium') return 2
  return 1
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-700 text-sm font-bold text-slate-500">
        –
      </span>
    )
  }
  const { label, cls } =
    score >= 80 ? { label: 'A', cls: 'bg-emerald-950 text-emerald-400 border-emerald-800' } :
    score >= 65 ? { label: 'B', cls: 'bg-green-950 text-green-400 border-green-800' } :
    score >= 50 ? { label: 'C', cls: 'bg-amber-950 text-amber-400 border-amber-800' } :
    score >= 35 ? { label: 'D', cls: 'bg-orange-950 text-orange-400 border-orange-800' } :
                  { label: 'F', cls: 'bg-rose-950 text-rose-400 border-rose-800' }
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full border text-sm font-bold ${cls}`}>
      {label}
    </span>
  )
}

function computeDeliveryScore(
  catalysts: Catalyst[],
  pipeline: PipelineAsset[],
  cutoff: Date | null
): ScoreResult {
  const assetMap = new Map(pipeline.map(a => [a.id, a]))
  const MIN_SAMPLE = 3

  const completed = catalysts.filter(c =>
    c.status === 'completed' &&
    c.actual_date &&
    c.original_expected_date &&
    (!cutoff || new Date(c.actual_date) >= cutoff)
  )

  if (completed.length < MIN_SAMPLE) {
    // Still surface delayed upcoming catalysts as informational events
    const events: ExplainerEvent[] = catalysts
      .filter(c => c.status === 'upcoming' && (c.times_delayed ?? 0) > 0)
      .map(c => ({
        sentiment: 'negative' as const,
        label: c.title,
        detail: `Upcoming — delayed ${c.times_delayed}× from original date`,
      }))
    return { score: null, events, sampleSize: completed.length, minSample: MIN_SAMPLE }
  }

  let weightedScore = 0
  let totalWeight = 0
  const events: ExplainerEvent[] = []

  for (const cat of completed) {
    const asset = cat.asset_id ? assetMap.get(cat.asset_id) : null
    const tolerance = getPhaseTolerance(asset?.stage ?? null)
    const weight = impactWeight(cat.impact)
    const daysLate = daysBetween(cat.original_expected_date!, cat.actual_date!)

    totalWeight += weight

    if (daysLate <= tolerance) {
      weightedScore += weight * 100
      events.push({
        sentiment: daysLate < 0 ? 'positive' : 'neutral',
        label: cat.title,
        detail: daysLate < 0
          ? `Delivered ${Math.abs(daysLate)}d early`
          : daysLate === 0
          ? 'Delivered on time'
          : `${daysLate}d late — within ${tolerance}d phase tolerance`,
      })
    } else {
      const excessDays = daysLate - tolerance
      const penalty = Math.min(60, Math.round((excessDays / 30) * 10))
      const catScore = Math.max(0, 100 - penalty)
      weightedScore += weight * catScore
      events.push({
        sentiment: 'negative',
        label: cat.title,
        detail: `${excessDays}d beyond ${tolerance}d tolerance${cat.times_delayed > 0 ? ` (${cat.times_delayed}× delayed)` : ''}`,
      })
    }
  }

  // Delayed upcoming — informational only, not scored
  for (const cat of catalysts.filter(c => c.status === 'upcoming' && (c.times_delayed ?? 0) > 0)) {
    events.push({
      sentiment: 'negative',
      label: cat.title,
      detail: `Upcoming — already delayed ${cat.times_delayed}× from original date`,
    })
  }

  return {
    score: Math.round(weightedScore / totalWeight),
    events,
    sampleSize: completed.length,
    minSample: MIN_SAMPLE,
  }
}

function computeCapitalScore(
  cashflow: QuarterlyCashflow[],
  cutoff: Date | null
): ScoreResult {
  const MIN_SAMPLE = 2

  const relevant = cashflow
    .filter(q => q.burn_rate !== null && (!cutoff || new Date(q.quarter_end) >= cutoff))
    .sort((a, b) => a.quarter_end.localeCompare(b.quarter_end))

  if (relevant.length < MIN_SAMPLE) {
    return { score: null, events: [], sampleSize: relevant.length, minSample: MIN_SAMPLE }
  }

  // Only evaluate quarters with meaningful burn (negative operating CF)
  const burns = relevant.map(q => Math.abs(q.burn_rate!))
  const mean = burns.reduce((s, b) => s + b, 0) / burns.length

  if (mean < 0.1) {
    // CF-positive company — capital discipline not applicable
    return { score: null, events: [{ sentiment: 'positive', label: 'Cash-flow positive', detail: 'Capital discipline metric not applicable' }], sampleSize: relevant.length, minSample: MIN_SAMPLE }
  }

  const variance = burns.reduce((s, b) => s + Math.pow(b - mean, 2), 0) / burns.length
  const cv = Math.sqrt(variance) / mean

  // QoQ changes
  const qoqChanges: number[] = []
  for (let i = 1; i < burns.length; i++) {
    if (burns[i - 1] > 0) qoqChanges.push((burns[i] - burns[i - 1]) / burns[i - 1])
  }

  const spikes = qoqChanges.filter(c => c > 0.5)
  const reductions = qoqChanges.filter(c => c < -0.3)

  let score = 80
  if (cv < 0.10) score = Math.min(100, score + 15)
  else if (cv < 0.20) score = Math.min(100, score + 8)
  else if (cv > 0.45) score -= 20
  else if (cv > 0.30) score -= 10

  score -= spikes.length * 10
  score += reductions.length * 3
  score = Math.max(0, Math.min(100, score))

  const events: ExplainerEvent[] = []

  if (cv < 0.20) {
    events.push({
      sentiment: 'positive',
      label: 'Stable burn rate',
      detail: `${Math.round(cv * 100)}% quarterly variation — consistent spend`,
    })
  } else if (cv > 0.35) {
    events.push({
      sentiment: 'negative',
      label: 'Volatile burn rate',
      detail: `${Math.round(cv * 100)}% quarterly variation — inconsistent spend`,
    })
  }

  if (spikes.length > 0) {
    events.push({
      sentiment: 'negative',
      label: `${spikes.length} burn spike${spikes.length > 1 ? 's' : ''}`,
      detail: 'Quarter-on-quarter spend increase >50%',
    })
  }

  if (reductions.length > 0) {
    events.push({
      sentiment: 'positive',
      label: 'Burn reductions achieved',
      detail: `${reductions.length} quarter${reductions.length > 1 ? 's' : ''} with >30% spend reduction`,
    })
  }

  return { score, events, sampleSize: relevant.length, minSample: MIN_SAMPLE }
}

function DimensionCard({ label, description, result }: {
  label: string
  description: string
  result: ScoreResult
}) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
      <div className="text-xs text-slate-500 font-medium">{label}</div>
      <div className="flex items-center gap-2">
        <ScoreBadge score={result.score} />
        <span className="text-sm font-semibold text-white">
          {result.score !== null ? `${result.score}/100` : 'Insufficient data'}
        </span>
      </div>
      {result.score === null && result.sampleSize < result.minSample && (
        <div className="text-xs text-slate-600">{result.sampleSize}/{result.minSample} data points needed</div>
      )}
      <div className="text-xs text-slate-600">{description}</div>
    </div>
  )
}

export default function TrackRecord({
  catalysts,
  cashflow = [],
  pipeline = [],
}: {
  catalysts: Catalyst[]
  cashflow?: QuarterlyCashflow[]
  pipeline?: PipelineAsset[]
}) {
  const [fullHistory, setFullHistory] = useState(false)

  const cutoff = fullHistory ? null : (() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 2)
    return d
  })()

  const delivery = computeDeliveryScore(catalysts, pipeline, cutoff)
  const capital = computeCapitalScore(cashflow, cutoff)

  const scores = [delivery.score, capital.score].filter((s): s is number => s !== null)
  const overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : null

  const allEvents = [...delivery.events, ...capital.events].sort((a, b) => {
    const order = { negative: 0, positive: 1, neutral: 2 }
    return order[a.sentiment] - order[b.sentiment]
  })

  const completedWithDates = catalysts.filter(c =>
    c.status === 'completed' &&
    c.actual_date &&
    c.original_expected_date &&
    (!cutoff || new Date(c.actual_date) >= cutoff)
  )

  const totalDelays = catalysts.reduce((s, c) => s + (c.times_delayed ?? 0), 0)

  if (catalysts.filter(c => c.status === 'completed').length === 0 && totalDelays === 0 && cashflow.length < 2) {
    return (
      <div className="text-xs text-slate-600 italic">No completed catalysts yet — track record will build over time.</div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ScoreBadge score={overallScore} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Execution score</span>
              <InfoTooltip />
            </div>
            <div className="text-sm font-semibold text-white">
              {overallScore !== null ? `${overallScore}/100` : 'Insufficient data'}
            </div>
          </div>
        </div>
        <button
          onClick={() => setFullHistory(h => !h)}
          className="text-xs text-slate-500 hover:text-slate-300 border border-slate-700 hover:border-slate-600 rounded px-2 py-1 transition-colors"
        >
          {fullHistory ? '← 2yr window' : 'Full history →'}
        </button>
      </div>

      {/* Dimension cards */}
      <div className="grid grid-cols-2 gap-3">
        <DimensionCard
          label="Delivery"
          description={`Timeline adherence · phase-adjusted tolerance · min ${delivery.minSample} catalysts`}
          result={delivery}
        />
        <DimensionCard
          label="Capital discipline"
          description="Burn rate stability · quarterly spend consistency"
          result={capital}
        />
      </div>

      {/* Explainer */}
      {allEvents.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">
            What drove this score{!fullHistory ? ' · rolling 2yr' : ' · full history'}
          </div>
          {allEvents.map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className={`mt-0.5 shrink-0 font-bold ${
                e.sentiment === 'positive' ? 'text-emerald-500' :
                e.sentiment === 'negative' ? 'text-rose-400' : 'text-slate-600'
              }`}>
                {e.sentiment === 'positive' ? '▲' : e.sentiment === 'negative' ? '▼' : '·'}
              </span>
              <div className="min-w-0">
                <span className="text-slate-300">{e.label}</span>
                <span className="text-slate-500"> — {e.detail}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed catalyst list with outcomes */}
      {completedWithDates.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-slate-800">
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Completed catalysts</div>
          {completedWithDates.map(c => {
            const slippage = daysBetween(c.original_expected_date!, c.actual_date!)
            return (
              <div key={c.id} className="flex items-start justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <span className={`inline-block mr-1.5 font-bold ${slippage <= 30 ? 'text-emerald-500' : 'text-rose-400'}`}>
                    {slippage <= 30 ? '✓' : '✗'}
                  </span>
                  <span className="text-slate-300">{c.title}</span>
                  {c.outcome && (
                    <span className={`ml-2 ${
                      c.outcome_sentiment === 'positive' ? 'text-emerald-400' :
                      c.outcome_sentiment === 'negative' ? 'text-rose-400' : 'text-slate-500'
                    }`}>
                      — {c.outcome}
                    </span>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  {slippage > 0
                    ? <span className="text-amber-400">+{slippage}d late</span>
                    : slippage < 0
                    ? <span className="text-emerald-400">{Math.abs(slippage)}d early</span>
                    : <span className="text-emerald-400">On time</span>
                  }
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-slate-600 italic">
        Outcome quality (positive/negative readouts) reflects the science, not execution — shown above but excluded from the score.
      </p>
    </div>
  )
}
