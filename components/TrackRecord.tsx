'use client'

interface Catalyst {
  id: number
  title: string
  status: string
  original_expected_date: string | null
  expected_date: string | null
  actual_date: string | null
  times_delayed: number
  outcome: string | null
  outcome_sentiment: string | null
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

function ScoreBadge({ score }: { score: number }) {
  const grade =
    score >= 80 ? { label: 'A', cls: 'bg-emerald-950 text-emerald-400 border-emerald-800' } :
    score >= 60 ? { label: 'B', cls: 'bg-green-950 text-green-400 border-green-800' } :
    score >= 40 ? { label: 'C', cls: 'bg-amber-950 text-amber-400 border-amber-800' } :
                  { label: 'D', cls: 'bg-rose-950 text-rose-400 border-rose-800' }
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full border text-sm font-bold ${grade.cls}`}>
      {grade.label}
    </span>
  )
}

export default function TrackRecord({ catalysts }: { catalysts: Catalyst[] }) {
  const completed = catalysts.filter(c => c.status === 'completed')
  const totalDelays = catalysts.reduce((s, c) => s + (c.times_delayed ?? 0), 0)
  const delayedCatalysts = catalysts.filter(c => (c.times_delayed ?? 0) > 0)

  // Slippage for completed catalysts that have both dates
  const withSlippage = completed.filter(c => c.actual_date && c.original_expected_date).map(c => ({
    ...c,
    slippage: daysBetween(c.original_expected_date!, c.actual_date!),
  }))

  const onTime = withSlippage.filter(c => c.slippage <= 30)
  const hitRate = withSlippage.length > 0 ? Math.round((onTime.length / withSlippage.length) * 100) : null
  const avgSlippage = withSlippage.length > 0
    ? Math.round(withSlippage.reduce((s, c) => s + c.slippage, 0) / withSlippage.length)
    : null

  // Nothing useful to show
  if (completed.length === 0 && totalDelays === 0) {
    return (
      <div className="text-xs text-slate-600 italic">No completed catalysts yet — track record will build over time.</div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Score strip */}
      <div className="flex flex-wrap gap-4">
        {hitRate !== null && (
          <div className="flex items-center gap-2">
            <ScoreBadge score={hitRate} />
            <div>
              <div className="text-xs text-slate-500">Delivery score</div>
              <div className="text-sm font-semibold text-white">{hitRate}% on time</div>
            </div>
          </div>
        )}
        <div className="bg-slate-800/50 rounded-lg px-3 py-2">
          <div className="text-xs text-slate-500">Completed</div>
          <div className="text-sm font-semibold text-white">{completed.length}</div>
        </div>
        {totalDelays > 0 && (
          <div className="bg-slate-800/50 rounded-lg px-3 py-2">
            <div className="text-xs text-slate-500">Total delays</div>
            <div className="text-sm font-semibold text-amber-400">{totalDelays}</div>
          </div>
        )}
        {avgSlippage !== null && (
          <div className="bg-slate-800/50 rounded-lg px-3 py-2">
            <div className="text-xs text-slate-500">Avg slippage</div>
            <div className={`text-sm font-semibold ${avgSlippage > 60 ? 'text-rose-400' : avgSlippage > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {avgSlippage > 0 ? `+${avgSlippage}d` : avgSlippage === 0 ? 'On time' : `${avgSlippage}d early`}
            </div>
          </div>
        )}
      </div>

      {/* Completed catalyst detail */}
      {withSlippage.length > 0 && (
        <div className="space-y-2">
          {withSlippage.map(c => (
            <div key={c.id} className="flex items-start justify-between gap-3 text-xs">
              <div className="min-w-0">
                <span className={`inline-block mr-2 ${c.slippage <= 30 ? 'text-emerald-500' : 'text-rose-400'}`}>
                  {c.slippage <= 30 ? '✓' : '✗'}
                </span>
                <span className="text-slate-300">{c.title}</span>
                {c.outcome && (
                  <span className={`ml-2 ${c.outcome_sentiment === 'positive' ? 'text-emerald-400' : c.outcome_sentiment === 'negative' ? 'text-rose-400' : 'text-slate-500'}`}>
                    — {c.outcome}
                  </span>
                )}
              </div>
              <div className="shrink-0 text-right">
                {c.slippage > 0
                  ? <span className="text-amber-400">+{c.slippage}d late</span>
                  : c.slippage < 0
                  ? <span className="text-emerald-400">{Math.abs(c.slippage)}d early</span>
                  : <span className="text-emerald-400">On time</span>
                }
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delays on upcoming */}
      {delayedCatalysts.length > 0 && completed.length === 0 && (
        <div className="space-y-1">
          <div className="text-xs text-slate-500 mb-1">Upcoming catalysts with delays</div>
          {delayedCatalysts.map(c => (
            <div key={c.id} className="flex items-center justify-between text-xs">
              <span className="text-slate-400 truncate">{c.title}</span>
              <span className="text-amber-400 shrink-0 ml-2">{c.times_delayed}× delayed</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
