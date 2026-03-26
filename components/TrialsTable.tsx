'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'

const STATUS_STYLE: Record<string, string> = {
  RECRUITING: 'bg-emerald-950 text-emerald-400',
  NOT_YET_RECRUITING: 'bg-green-950 text-green-400',
  ACTIVE_NOT_RECRUITING: 'bg-blue-950 text-blue-400',
  ENROLLING_BY_INVITATION: 'bg-teal-950 text-teal-400',
  COMPLETED: 'bg-slate-800 text-slate-400',
  TERMINATED: 'bg-rose-950 text-rose-500',
  WITHDRAWN: 'bg-slate-800 text-slate-600',
  SUSPENDED: 'bg-amber-950 text-amber-400',
}

const STATUS_ORDER: Record<string, number> = {
  RECRUITING: 0, NOT_YET_RECRUITING: 1, ACTIVE_NOT_RECRUITING: 2,
  ENROLLING_BY_INVITATION: 3, COMPLETED: 4, TERMINATED: 5, WITHDRAWN: 6, SUSPENDED: 7,
}

const PHASE_STYLE: Record<string, string> = {
  PHASE1: 'bg-violet-950 text-violet-400',
  PHASE2: 'bg-purple-950 text-purple-400',
  PHASE3: 'bg-fuchsia-950 text-fuchsia-400',
  PHASE4: 'bg-pink-950 text-pink-400',
  EARLY_PHASE1: 'bg-indigo-950 text-indigo-400',
}

function phaseLabel(p: string) {
  if (!p) return null
  return p.replace('EARLY_PHASE1', 'Early Ph1').replace('PHASE', 'Ph').replace('_', '/')
}

function statusLabel(s: string) {
  return s?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) ?? s
}

const ACTIVE_STATUSES = new Set(['RECRUITING', 'NOT_YET_RECRUITING', 'ACTIVE_NOT_RECRUITING', 'ENROLLING_BY_INVITATION'])

export default function TrialsTable({ trials }: { trials: any[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [phaseFilter, setPhaseFilter] = useState('')
  const [tickerFilter, setTickerFilter] = useState('')

  const tickers = useMemo(() => [...new Set(trials.map((t: any) => t.ticker))].sort(), [trials])
  const phases = useMemo(() => [...new Set(trials.map((t: any) => t.phase).filter(Boolean))].sort(), [trials])

  const filtered = useMemo(() => {
    let r = trials
    if (statusFilter === 'active') r = r.filter((t: any) => ACTIVE_STATUSES.has(t.status))
    else if (statusFilter && statusFilter !== 'all') r = r.filter((t: any) => t.status === statusFilter)
    if (phaseFilter) r = r.filter((t: any) => t.phase === phaseFilter)
    if (tickerFilter) r = r.filter((t: any) => t.ticker === tickerFilter)
    if (search) {
      const q = search.toLowerCase()
      r = r.filter((t: any) =>
        t.brief_title?.toLowerCase().includes(q) ||
        t.title?.toLowerCase().includes(q) ||
        t.conditions?.some((c: string) => c.toLowerCase().includes(q)) ||
        t.interventions?.some((i: string) => i.toLowerCase().includes(q)) ||
        t.nct_id?.toLowerCase().includes(q)
      )
    }
    return [...r].sort((a: any, b: any) => {
      const sa = STATUS_ORDER[a.status] ?? 9
      const sb = STATUS_ORDER[b.status] ?? 9
      return sa !== sb ? sa - sb : (a.phase ?? '').localeCompare(b.phase ?? '')
    })
  }, [trials, search, statusFilter, phaseFilter, tickerFilter])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text" placeholder="Search title, drug, condition, NCT ID…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-green-700 w-64"
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none">
          <option value="active">Active only</option>
          <option value="all">All statuses</option>
          {Object.keys(STATUS_STYLE).map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
        <select value={phaseFilter} onChange={e => setPhaseFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none">
          <option value="">All phases</option>
          {phases.map(p => <option key={p} value={p}>{phaseLabel(p)}</option>)}
        </select>
        <select value={tickerFilter} onChange={e => setTickerFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none">
          <option value="">All companies</option>
          {tickers.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {(search || statusFilter !== 'active' || phaseFilter || tickerFilter) && (
          <button onClick={() => { setSearch(''); setStatusFilter('active'); setPhaseFilter(''); setTickerFilter('') }}
            className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1.5 border border-slate-700 rounded">
            Reset
          </button>
        )}
        <span className="ml-auto text-xs text-slate-600 self-center">{filtered.length} trials</span>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg py-12 text-center text-slate-600 text-sm">
            No trials match your filters
          </div>
        )}
        {filtered.map((t: any) => {
          const drugs = t.interventions?.slice(0, 3) ?? []
          const enrollPct = t.enrollment_target && t.enrollment_actual != null
            ? Math.min(100, Math.round((t.enrollment_actual / t.enrollment_target) * 100))
            : null

          return (
            <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {/* Top row: badges + ticker */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Link href={`/companies/${t.ticker}`}
                      className="font-mono text-xs font-bold text-green-400 hover:text-green-300 shrink-0">
                      {t.ticker}
                    </Link>
                    {t.phase && (
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${PHASE_STYLE[t.phase] ?? 'bg-slate-800 text-slate-400'}`}>
                        {phaseLabel(t.phase)}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLE[t.status] ?? 'bg-slate-800 text-slate-400'}`}>
                      {statusLabel(t.status)}
                    </span>
                    {t.has_results && <span className="text-xs bg-green-950 text-green-400 px-2 py-0.5 rounded">Results</span>}
                  </div>

                  {/* Drug names */}
                  {drugs.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {drugs.map((d: string, i: number) => (
                        <span key={i} className="text-xs font-medium text-green-300 bg-green-950/40 px-2 py-0.5 rounded">{d}</span>
                      ))}
                    </div>
                  )}

                  {/* Title */}
                  <div className="text-sm text-slate-200 leading-snug">{t.brief_title || t.title}</div>

                  {/* Conditions */}
                  {t.conditions && t.conditions.length > 0 && (
                    <div className="text-xs text-slate-500 mt-1">
                      {t.conditions.slice(0, 4).join(' · ')}
                      {t.conditions.length > 4 && <span className="text-slate-700"> +{t.conditions.length - 4} more</span>}
                    </div>
                  )}

                  {/* Enrollment bar */}
                  {t.enrollment_target && (
                    <div className="mt-2 space-y-1 max-w-xs">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Enrollment</span>
                        <span>
                          {t.enrollment_actual != null ? `${t.enrollment_actual} / ` : ''}{t.enrollment_target}
                          {enrollPct != null && <span className="text-slate-400 ml-1">({enrollPct}%)</span>}
                        </span>
                      </div>
                      {enrollPct != null && (
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-600 rounded-full" style={{ width: `${enrollPct}%` }} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Countries */}
                  {t.countries && t.countries.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {t.countries.slice(0, 6).map((c: string, i: number) => (
                        <span key={i} className="text-xs text-slate-600 bg-slate-800/50 px-1.5 py-0.5 rounded">{c}</span>
                      ))}
                      {t.countries.length > 6 && <span className="text-xs text-slate-700">+{t.countries.length - 6}</span>}
                    </div>
                  )}
                </div>

                {/* Right column */}
                <div className="text-xs text-slate-600 shrink-0 text-right space-y-2 min-w-28">
                  <a href={t.ct_url || `https://clinicaltrials.gov/study/${t.nct_id}`}
                    target="_blank" rel="noopener noreferrer"
                    className="block text-green-600 hover:text-green-400 font-mono">{t.nct_id} ↗</a>
                  {t.start_date && (
                    <div>
                      <div className="text-slate-700">Start</div>
                      <div>{t.start_date.slice(0, 7)}</div>
                    </div>
                  )}
                  {t.primary_completion_date && (
                    <div>
                      <div className="text-slate-700">Primary end</div>
                      <div>{t.primary_completion_date.slice(0, 7)}</div>
                    </div>
                  )}
                  {t.locations_count && t.locations_count > 0 && (
                    <div>{t.locations_count} site{t.locations_count !== 1 ? 's' : ''}</div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
