'use client'
import { useState } from 'react'

interface OptionTranche {
  id: number
  director_name: string
  option_type: string
  grant_date: string | null
  expiry_date: string | null
  exercise_price: number | null
  quantity: number
  exercised_quantity: number
  lapsed_quantity: number
  status: string
  vesting_conditions: string | null
  notes: string | null
  source_url: string | null
}

const STATUS_STYLE: Record<string, string> = {
  outstanding:          'bg-slate-800 text-slate-300',
  partially_exercised:  'bg-blue-950 text-blue-400',
  fully_exercised:      'bg-green-950 text-green-400',
  fully_lapsed:         'bg-rose-950 text-rose-400',
  cancelled:            'bg-slate-800 text-slate-500',
}

const TYPE_LABEL: Record<string, string> = {
  options:             'Options',
  performance_rights:  'Perf. Rights',
  warrants:            'Warrants',
}

function daysToExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null
  return Math.round((new Date(expiryDate).getTime() - Date.now()) / 86400000)
}

function moneyStatus(exercisePrice: number | null, currentPrice: number | null) {
  if (exercisePrice === null || currentPrice === null) return null
  if (currentPrice >= exercisePrice) {
    const pct = ((currentPrice - exercisePrice) / exercisePrice * 100).toFixed(0)
    return { label: `+${pct}%`, inMoney: true }
  }
  const pct = ((exercisePrice - currentPrice) / exercisePrice * 100).toFixed(0)
  return { label: `-${pct}%`, inMoney: false }
}

function ExpiryBadge({ days }: { days: number | null }) {
  if (days === null) return null
  if (days < 0) return <span className="text-xs text-slate-600">Expired</span>
  if (days <= 30) return <span className="text-xs text-rose-400 font-medium">{days}d left</span>
  if (days <= 90) return <span className="text-xs text-amber-500">{days}d left</span>
  return null
}

function TrancheRow({ t, currentPrice }: { t: OptionTranche; currentPrice: number | null }) {
  const outstanding = t.quantity - t.exercised_quantity - t.lapsed_quantity
  const days = daysToExpiry(t.expiry_date)
  const money = moneyStatus(t.exercise_price, currentPrice)
  const isActive = t.status === 'outstanding' || t.status === 'partially_exercised'

  return (
    <div className={`px-4 py-3 flex items-center gap-4 text-sm ${!isActive ? 'opacity-50' : ''}`}>
      {/* Director + type */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-200 font-medium">{t.director_name}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_STYLE[t.status] ?? 'bg-slate-800 text-slate-400'}`}>
            {t.status.replace(/_/g, ' ')}
          </span>
          <span className="text-xs text-slate-600">{TYPE_LABEL[t.option_type] ?? t.option_type}</span>
        </div>
        {t.vesting_conditions && (
          <div className="text-xs text-slate-600 mt-0.5 truncate max-w-sm">{t.vesting_conditions}</div>
        )}
      </div>

      {/* Quantities */}
      <div className="text-right shrink-0 min-w-20">
        <div className="text-slate-300 font-mono text-xs">{outstanding.toLocaleString()}</div>
        <div className="text-slate-600 text-xs">outstanding</div>
        {t.lapsed_quantity > 0 && (
          <div className="text-rose-500 text-xs">{t.lapsed_quantity.toLocaleString()} lapsed</div>
        )}
        {t.exercised_quantity > 0 && (
          <div className="text-green-500 text-xs">{t.exercised_quantity.toLocaleString()} exercised</div>
        )}
      </div>

      {/* Exercise price + in/out of money */}
      <div className="text-right shrink-0 min-w-20">
        {t.exercise_price !== null ? (
          <>
            <div className="text-slate-300 font-mono text-xs">${Number(t.exercise_price).toFixed(3)}</div>
            {money && (
              <div className={`text-xs font-medium ${money.inMoney ? 'text-green-400' : 'text-slate-500'}`}>
                {money.label}
              </div>
            )}
          </>
        ) : (
          <div className="text-slate-600 text-xs">nil cost</div>
        )}
      </div>

      {/* Expiry */}
      <div className="text-right shrink-0 min-w-24">
        {t.expiry_date ? (
          <>
            <div className="text-slate-500 text-xs">{t.expiry_date.slice(0, 10)}</div>
            <ExpiryBadge days={days} />
          </>
        ) : (
          <div className="text-slate-700 text-xs">no expiry</div>
        )}
      </div>

      {/* Source */}
      {t.source_url && (
        <a href={t.source_url} target="_blank" rel="noopener noreferrer"
          className="text-green-700 hover:text-green-400 text-xs shrink-0">↗</a>
      )}
    </div>
  )
}

export default function DirectorOptions({
  options,
  currentPrice,
}: {
  options: OptionTranche[]
  currentPrice: number | null
}) {
  const [showInactive, setShowInactive] = useState(false)

  const active = options.filter(o => o.status === 'outstanding' || o.status === 'partially_exercised')
  const inactive = options.filter(o => o.status !== 'outstanding' && o.status !== 'partially_exercised')

  const totalOutstanding = active.reduce((sum, o) => sum + o.quantity - o.exercised_quantity - o.lapsed_quantity, 0)
  const inMoney = active.filter(o => o.exercise_price !== null && currentPrice !== null && currentPrice >= Number(o.exercise_price))
  const expiringSoon = active.filter(o => { const d = daysToExpiry(o.expiry_date); return d !== null && d >= 0 && d <= 90 })
  const lapses = options.filter(o => o.lapsed_quantity > 0)

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-medium text-slate-300 min-w-0">Director Options & Rights</h2>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {totalOutstanding > 0 && (
            <span>{totalOutstanding.toLocaleString()} outstanding</span>
          )}
          {inMoney.length > 0 && (
            <span className="text-green-500">{inMoney.length} in money</span>
          )}
          {expiringSoon.length > 0 && (
            <span className="text-amber-500">{expiringSoon.length} expiring &lt;90d</span>
          )}
          {lapses.length > 0 && (
            <span className="text-rose-500">{lapses.length} lapsed</span>
          )}
        </div>
      </div>

      {/* Column headers */}
      <div className="px-4 py-1.5 flex items-center gap-4 text-xs text-slate-600 border-b border-slate-800/50">
        <div className="flex-1">Director</div>
        <div className="min-w-20 text-right">Outstanding</div>
        <div className="min-w-20 text-right">Ex. Price</div>
        <div className="min-w-24 text-right">Expiry</div>
        <div className="w-4" />
      </div>

      {options.length === 0 ? (
        <div className="px-4 py-6 text-center text-slate-600 text-sm">
          No option data entered yet
        </div>
      ) : active.length > 0 ? (
        <div className="divide-y divide-slate-800/50">
          {active.map(o => <TrancheRow key={o.id} t={o} currentPrice={currentPrice} />)}
        </div>
      ) : (
        <div className="px-4 py-6 text-center text-slate-600 text-sm">No outstanding options</div>
      )}

      {inactive.length > 0 && (
        <>
          <button
            onClick={() => setShowInactive(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 transition-colors"
          >
            <span>{showInactive ? 'Hide' : 'Show'} {inactive.length} exercised / lapsed / cancelled</span>
            <span className="text-slate-600">{showInactive ? '▲' : '▼'}</span>
          </button>
          {showInactive && (
            <div className="divide-y divide-slate-800/50 border-t border-slate-800">
              {inactive.map(o => <TrancheRow key={o.id} t={o} currentPrice={currentPrice} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
