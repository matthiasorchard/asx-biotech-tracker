'use client'
import { useState } from 'react'

interface CompetitorTrial {
  id: number
  indication: string
  nct_id: string
  brief_title: string | null
  phase: string | null
  status: string | null
  sponsor: string | null
  enrollment_target: number | null
  primary_completion_date: string | null
  registry_url: string | null
}

interface ApprovedDrug {
  id: number
  indication: string
  drug_name: string
  brand_name: string | null
  sponsor: string | null
  label_date: string | null
  application_number: string | null
  source_url: string | null
}

interface PipelineAsset {
  indication: string | null
}

const PHASE_ORDER: Record<string, number> = {
  PHASE4: 0, PHASE3: 1, 'PHASE2/PHASE3': 2, PHASE2: 3,
}

const PHASE_LABEL: Record<string, string> = {
  PHASE4: 'Ph4', PHASE3: 'Ph3', 'PHASE2/PHASE3': 'Ph2/3', PHASE2: 'Ph2',
}

const PHASE_COLOR: Record<string, string> = {
  PHASE4:         'bg-fuchsia-950 text-fuchsia-400',
  PHASE3:         'bg-purple-950 text-purple-400',
  'PHASE2/PHASE3': 'bg-violet-950 text-violet-400',
  PHASE2:         'bg-indigo-950 text-indigo-400',
}

const STATUS_COLOR: Record<string, string> = {
  RECRUITING:              'text-emerald-400',
  NOT_YET_RECRUITING:      'text-green-400',
  ACTIVE_NOT_RECRUITING:   'text-blue-400',
  ENROLLING_BY_INVITATION: 'text-teal-400',
}

function phaseLabel(p: string | null) {
  if (!p) return null
  return PHASE_LABEL[p] ?? p.replace('PHASE', 'Ph').replace('_', '/')
}

function statusLabel(s: string | null) {
  if (!s) return null
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

function IndicationSection({
  indication,
  trials,
  drugs,
}: {
  indication: string
  trials: CompetitorTrial[]
  drugs: ApprovedDrug[]
}) {
  const [expanded, setExpanded] = useState(false)

  const sorted = [...trials].sort((a, b) =>
    (PHASE_ORDER[a.phase ?? ''] ?? 9) - (PHASE_ORDER[b.phase ?? ''] ?? 9)
  )

  // Phase distribution counts
  const phaseCounts: Record<string, number> = {}
  for (const t of trials) {
    if (t.phase) phaseCounts[t.phase] = (phaseCounts[t.phase] ?? 0) + 1
  }
  const phaseEntries = Object.entries(phaseCounts).sort(
    ([a], [b]) => (PHASE_ORDER[a] ?? 9) - (PHASE_ORDER[b] ?? 9)
  )

  const displayName = indication.replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div className="border-b border-slate-800 last:border-0">
      {/* Indication header */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-medium text-slate-200">{displayName}</span>
              {trials.length > 0 && (
                <span className="text-xs text-slate-600">{trials.length} active trial{trials.length !== 1 ? 's' : ''}</span>
              )}
            </div>

            {/* Phase distribution */}
            {phaseEntries.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {phaseEntries.map(([phase, count]) => (
                  <span key={phase} className={`text-xs px-1.5 py-0.5 rounded font-medium ${PHASE_COLOR[phase] ?? 'bg-slate-800 text-slate-400'}`}>
                    {count} {phaseLabel(phase)}
                  </span>
                ))}
              </div>
            )}

            {trials.length === 0 && drugs.length === 0 && (
              <span className="text-xs text-slate-700">No competitor data fetched yet — run fetch_competitors.py</span>
            )}
          </div>

          {/* Approved drugs */}
          {drugs.length > 0 && (
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-xs text-slate-600">Approved</span>
              <div className="flex flex-wrap gap-1 justify-end">
                {drugs.map(d => (
                  <a
                    key={d.id}
                    href={d.source_url ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={[
                      d.drug_name,
                      d.sponsor,
                      d.label_date ? `Label: ${d.label_date.slice(0, 7)}` : null,
                      d.application_number,
                    ].filter(Boolean).join(' · ')}
                    className="text-xs px-1.5 py-0.5 rounded bg-green-950/60 text-green-400 hover:text-green-300 border border-green-900/40"
                  >
                    {d.brand_name ?? d.drug_name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trial list toggle */}
      {sorted.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2 border-t border-slate-800/60 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 transition-colors"
          >
            <span>{expanded ? 'Hide' : 'Show'} {sorted.length} competitor trial{sorted.length !== 1 ? 's' : ''}</span>
            <span className="text-slate-700">{expanded ? '▲' : '▼'}</span>
          </button>

          {expanded && (
            <div className="divide-y divide-slate-800/40 border-t border-slate-800/40">
              {sorted.map(t => (
                <div key={t.id} className="px-4 py-2.5 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        {t.phase && (
                          <span className={`px-1.5 py-0.5 rounded font-medium ${PHASE_COLOR[t.phase] ?? 'bg-slate-800 text-slate-400'}`}>
                            {phaseLabel(t.phase)}
                          </span>
                        )}
                        {t.status && (
                          <span className={STATUS_COLOR[t.status] ?? 'text-slate-500'}>
                            {statusLabel(t.status)}
                          </span>
                        )}
                      </div>
                      <a
                        href={t.registry_url ?? `https://clinicaltrials.gov/study/${t.nct_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-300 hover:text-white"
                      >
                        {t.brief_title ?? t.nct_id}
                      </a>
                      {t.sponsor && (
                        <div className="text-slate-600 mt-0.5">{t.sponsor}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0 space-y-0.5 text-slate-600">
                      <div className="font-mono">{t.nct_id}</div>
                      {t.enrollment_target && (
                        <div>{t.enrollment_target.toLocaleString()} pts</div>
                      )}
                      {t.primary_completion_date && (
                        <div>{t.primary_completion_date.slice(0, 7)}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function CompetitiveLandscape({
  pipeline,
  competitorTrials,
  approvedDrugs,
}: {
  pipeline: PipelineAsset[]
  competitorTrials: CompetitorTrial[]
  approvedDrugs: ApprovedDrug[]
}) {
  // Build ordered list of indications from pipeline (deduplicated, preserving order)
  const indications: string[] = []
  const seen = new Set<string>()
  for (const p of pipeline) {
    const key = p.indication?.toLowerCase().trim()
    if (key && !seen.has(key)) {
      seen.add(key)
      indications.push(key)
    }
  }

  // Group competitor trials and approved drugs by indication
  const trialsByInd = new Map<string, CompetitorTrial[]>()
  const drugsByInd  = new Map<string, ApprovedDrug[]>()
  for (const ind of indications) {
    trialsByInd.set(ind, [])
    drugsByInd.set(ind, [])
  }
  for (const t of competitorTrials) {
    trialsByInd.get(t.indication)?.push(t)
  }
  for (const d of approvedDrugs) {
    drugsByInd.get(d.indication)?.push(d)
  }

  // Only show indications that have at least some data
  const activeIndications = indications.filter(
    ind => (trialsByInd.get(ind)?.length ?? 0) > 0 || (drugsByInd.get(ind)?.length ?? 0) > 0
  )

  if (activeIndications.length === 0) return null

  const totalTrials = competitorTrials.length
  const totalDrugs  = approvedDrugs.length

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-medium text-slate-300">Competitive Landscape</h2>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {totalDrugs > 0 && (
            <span className="text-green-600">{totalDrugs} approved drug{totalDrugs !== 1 ? 's' : ''}</span>
          )}
          {totalTrials > 0 && (
            <span>{totalTrials} competitor trial{totalTrials !== 1 ? 's' : ''}</span>
          )}
          <span className="text-slate-700">Phase 2+ · Non-ASX</span>
        </div>
      </div>

      {activeIndications.map(ind => (
        <IndicationSection
          key={ind}
          indication={ind}
          trials={trialsByInd.get(ind) ?? []}
          drugs={drugsByInd.get(ind) ?? []}
        />
      ))}

      <div className="px-4 py-2.5 border-t border-slate-800/60 text-xs text-slate-700">
        Competitor trials from{' '}
        <a href="https://clinicaltrials.gov" target="_blank" rel="noopener noreferrer" className="hover:text-slate-500">ClinicalTrials.gov</a>
        {' '}(Phase 2+, active/recruiting, non-ASX sponsors).{' '}
        Approved drugs from{' '}
        <a href="https://open.fda.gov" target="_blank" rel="noopener noreferrer" className="hover:text-slate-500">OpenFDA</a>
        {' '}(NDA/BLA only).{' '}
        Updated weekly via fetch_competitors.py.
      </div>
    </div>
  )
}
