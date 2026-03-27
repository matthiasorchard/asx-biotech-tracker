'use client'
import { useState } from 'react'

interface EnrollmentSnapshot {
  snapshot_date: string
  enrollment_actual: number
  source?: string | null
}

function calcVelocity(snapshots: EnrollmentSnapshot[]): number | null {
  if (snapshots.length < 2) return null
  const first = snapshots[0]
  const last = snapshots[snapshots.length - 1]
  const days = (new Date(last.snapshot_date).getTime() - new Date(first.snapshot_date).getTime()) / 86400000
  if (days < 3) return null
  return Math.round((last.enrollment_actual - first.enrollment_actual) / days * 7)
}

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

const ACTIVE_STATUSES = new Set(['RECRUITING', 'NOT_YET_RECRUITING', 'ACTIVE_NOT_RECRUITING', 'ENROLLING_BY_INVITATION'])

function phaseLabel(p: string) {
  return p?.replace('EARLY_PHASE1', 'Early Ph1').replace('PHASE', 'Ph').replace('_', '/') ?? p
}

function statusLabel(s: string) {
  return s?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()) ?? s
}

function TrialCard({ t, dimmed, snapshots }: { t: any; dimmed: boolean; snapshots: EnrollmentSnapshot[] }) {
  const drugs = t.interventions?.slice(0, 3) ?? []
  const enrollPct = t.enrollment_target && t.enrollment_actual != null
    ? Math.min(100, Math.round((t.enrollment_actual / t.enrollment_target) * 100))
    : null
  const velocity = calcVelocity(snapshots)
  const sparkMax = snapshots.length > 0 ? Math.max(...snapshots.map(s => s.enrollment_actual)) : 0

  const lastSnap = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null
  const isActiveStatus = ACTIVE_STATUSES.has(t.status)
  const daysSinceSnap = lastSnap && isActiveStatus
    ? Math.floor((Date.now() - new Date(lastSnap.snapshot_date).getTime()) / 86400000)
    : null
  const isStale = daysSinceSnap !== null && daysSinceSnap > 90

  return (
    <div className={`px-4 py-4 ${dimmed ? 'opacity-55' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            {t.phase && (
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${PHASE_STYLE[t.phase] ?? 'bg-slate-800 text-slate-400'}`}>
                {phaseLabel(t.phase)}
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLE[t.status] ?? 'bg-slate-800 text-slate-400'}`}>
              {statusLabel(t.status)}
            </span>
            {t.has_results && <span className="text-xs bg-green-950 text-green-400 px-2 py-0.5 rounded">Results</span>}
            {t.study_type && t.study_type !== 'INTERVENTIONAL' && (
              <span className="text-xs bg-slate-800 text-slate-500 px-2 py-0.5 rounded">{t.study_type}</span>
            )}
          </div>

          {drugs.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {drugs.map((d: string, i: number) => (
                <span key={i} className="text-xs font-medium text-green-300 bg-green-950/40 px-2 py-0.5 rounded">{d}</span>
              ))}
            </div>
          )}

          <div className="text-sm text-slate-200 leading-snug">{t.brief_title || t.title}</div>

          {t.conditions && t.conditions.length > 0 && (
            <div className="text-xs text-slate-500 mt-1">
              {t.conditions.slice(0, 3).join(' · ')}
              {t.conditions.length > 3 && <span className="text-slate-700"> +{t.conditions.length - 3} more</span>}
            </div>
          )}

          {t.enrollment_target && (
            <div className="mt-2 space-y-1 max-w-xs">
              <div className="flex justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  Enrollment
                  {velocity !== null && velocity > 0 && (
                    <span className="text-emerald-500 font-medium">+{velocity}/wk</span>
                  )}
                  {velocity !== null && velocity === 0 && (
                    <span className="text-slate-600">no change</span>
                  )}
                </span>
                <span>
                  {t.enrollment_actual != null ? `${t.enrollment_actual} / ` : ''}{t.enrollment_target}
                  {enrollPct != null && <span className="text-slate-400 ml-1">({enrollPct}%)</span>}
                </span>
              </div>
              {enrollPct != null && (
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-600 rounded-full transition-all" style={{ width: `${enrollPct}%` }} />
                </div>
              )}
              {snapshots.length >= 3 && sparkMax > 0 && (
                <div className="flex items-end gap-px h-5 mt-1">
                  {snapshots.map((s, i) => {
                    const h = Math.max(15, Math.round((s.enrollment_actual / sparkMax) * 100))
                    const isLatest = i === snapshots.length - 1
                    return (
                      <div
                        key={i}
                        title={`${s.snapshot_date}: ${s.enrollment_actual}${s.source && s.source !== 'manual' ? ` (${s.source})` : ''}`}
                        className={`flex-1 rounded-sm ${isLatest ? 'bg-violet-400' : 'bg-violet-800'}`}
                        style={{ height: `${h}%` }}
                      />
                    )
                  })}
                </div>
              )}
              {lastSnap && (
                <div className="flex items-center gap-2 mt-1 text-xs">
                  {lastSnap.source && lastSnap.source !== 'manual' ? (
                    <span className="text-slate-600">via {lastSnap.source}</span>
                  ) : (
                    <span className="text-slate-700">manually recorded</span>
                  )}
                  {isStale && (
                    <span className="text-amber-700">· {daysSinceSnap}d since update</span>
                  )}
                </div>
              )}
              {isActiveStatus && !lastSnap && (
                <div className="text-xs text-slate-700 mt-1">no manual snapshots — enter via record_enrollment.py</div>
              )}
            </div>
          )}

          {t.countries && t.countries.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {t.countries.slice(0, 5).map((c: string, i: number) => (
                <span key={i} className="text-xs text-slate-600 bg-slate-800/50 px-1.5 py-0.5 rounded">{c}</span>
              ))}
              {t.countries.length > 5 && <span className="text-xs text-slate-700">+{t.countries.length - 5}</span>}
            </div>
          )}
        </div>

        <div className="text-xs text-slate-600 shrink-0 text-right space-y-1.5 min-w-24">
          <a href={t.registry_url || t.ct_url || (t.registry_source === 'anzctr' ? `https://www.anzctr.org.au/Trial/Registration/TrialReview.aspx?id=${t.nct_id}` : `https://clinicaltrials.gov/study/${t.nct_id}`)}
            target="_blank" rel="noopener noreferrer"
            className="block text-green-600 hover:text-green-400 font-mono">{t.nct_id} ↗</a>
          {t.registry_source === 'anzctr' ? (
            <span className="text-xs text-teal-600 mt-0.5 block">ANZCTR</span>
          ) : (
            <span className="text-xs text-slate-700 mt-0.5 block">CT.gov</span>
          )}
          {t.start_date && (
            <div>
              <div className="text-slate-700 text-xs">Start</div>
              <div>{t.start_date.slice(0, 7)}</div>
            </div>
          )}
          {t.primary_completion_date && (
            <div>
              <div className="text-slate-700 text-xs">Primary end</div>
              <div>{t.primary_completion_date.slice(0, 7)}</div>
            </div>
          )}
          {t.locations_count > 0 && (
            <div>{t.locations_count} site{t.locations_count !== 1 ? 's' : ''}</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ClinicalTrialsSection({ trials, companyName, enrollmentSnapshots = {} }: { trials: any[]; companyName: string; enrollmentSnapshots?: Record<string, EnrollmentSnapshot[]> }) {
  const [showInactive, setShowInactive] = useState(false)

  const sorted = [...trials].sort((a, b) => {
    const sa = STATUS_ORDER[a.status] ?? 9
    const sb = STATUS_ORDER[b.status] ?? 9
    return sa !== sb ? sa - sb : (a.phase ?? '').localeCompare(b.phase ?? '')
  })

  const active = sorted.filter(t => ACTIVE_STATUSES.has(t.status))
  const inactive = sorted.filter(t => !ACTIVE_STATUSES.has(t.status))

  if (trials.length === 0) return null

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-300">Clinical Trials ({trials.length})</h2>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {active.length > 0 && <span className="text-emerald-500">{active.length} active</span>}
          <a href={`https://clinicaltrials.gov/search?spons=${encodeURIComponent(companyName)}`}
            target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-400">
            ClinicalTrials.gov ↗
          </a>
        </div>
      </div>

      {/* Active trials */}
      {active.length > 0 ? (
        <div className="divide-y divide-slate-800">
          {active.map(t => <TrialCard key={t.id} t={t} dimmed={false} snapshots={enrollmentSnapshots[t.nct_id] ?? []} />)}
        </div>
      ) : (
        <div className="px-4 py-6 text-center text-slate-600 text-sm">No active trials</div>
      )}

      {/* Inactive trials toggle */}
      {inactive.length > 0 && (
        <>
          <button
            onClick={() => setShowInactive(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 transition-colors"
          >
            <span>{showInactive ? 'Hide' : 'Show'} {inactive.length} completed / terminated trial{inactive.length !== 1 ? 's' : ''}</span>
            <span className="text-slate-600">{showInactive ? '▲' : '▼'}</span>
          </button>
          {showInactive && (
            <div className="divide-y divide-slate-800 border-t border-slate-800">
              {inactive.map(t => <TrialCard key={t.id} t={t} dimmed={true} snapshots={enrollmentSnapshots[t.nct_id] ?? []} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
