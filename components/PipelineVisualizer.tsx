import { stageLabel } from '@/lib/utils'

const STAGES = [
  { key: 'discovery',   short: 'Discovery' },
  { key: 'preclinical', short: 'Preclinical' },
  { key: 'phase_1',     short: 'Ph 1' },
  { key: 'phase_1_2',   short: 'Ph 1/2' },
  { key: 'phase_2',     short: 'Ph 2' },
  { key: 'phase_2_3',   short: 'Ph 2/3' },
  { key: 'phase_3',     short: 'Ph 3' },
  { key: 'nda_filed',   short: 'NDA' },
  { key: 'approved',    short: 'Approved' },
]

const STAGE_INDEX: Record<string, number> = Object.fromEntries(STAGES.map((s, i) => [s.key, i]))

const STAGE_COLOR: Record<string, string> = {
  discovery:   'bg-slate-500 border-slate-400',
  preclinical: 'bg-slate-400 border-slate-300',
  phase_1:     'bg-blue-500 border-blue-400',
  phase_1_2:   'bg-blue-400 border-blue-300',
  phase_2:     'bg-violet-500 border-violet-400',
  phase_2_3:   'bg-violet-400 border-violet-300',
  phase_3:     'bg-amber-500 border-amber-400',
  nda_filed:   'bg-orange-500 border-orange-400',
  approved:    'bg-emerald-500 border-emerald-400',
}

export default function PipelineVisualizer({ pipeline }: { pipeline: any[] }) {
  const active = pipeline.filter(a => a.stage !== 'discontinued')
  const discontinued = pipeline.filter(a => a.stage === 'discontinued')

  if (active.length === 0 && discontinued.length === 0) return null

  return (
    <div className="px-4 py-4 space-y-1">
      {/* Stage column headers */}
      <div className="flex items-center pl-36 mb-3 overflow-x-auto">
        <div className="flex min-w-[420px] w-full">
          {STAGES.map(s => (
            <div key={s.key} className="flex-1 text-center">
              <span className="text-[10px] text-slate-600 leading-tight whitespace-nowrap">{s.short}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Asset rows */}
      <div className="space-y-3 overflow-x-auto">
        {active.map((asset: any) => {
          const idx = STAGE_INDEX[asset.stage] ?? -1
          const dotColor = STAGE_COLOR[asset.stage] ?? 'bg-green-500 border-green-400'
          return (
            <div key={asset.id} className="flex items-center min-w-[556px]">
              {/* Label */}
              <div className="w-36 shrink-0 pr-3 text-right">
                <div className="text-xs font-medium text-white truncate">{asset.drug_name}</div>
                {asset.indication && (
                  <div className="text-[10px] text-slate-500 truncate leading-tight">{asset.indication}</div>
                )}
              </div>

              {/* Track */}
              <div className="flex flex-1 items-center relative">
                {/* Background line */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-slate-800" />

                {/* Progress fill line up to current stage */}
                {idx >= 0 && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-px bg-slate-600"
                    style={{ width: `${((idx + 0.5) / STAGES.length) * 100}%` }}
                  />
                )}

                {/* Stage dots */}
                {STAGES.map((s, i) => {
                  const isCurrent = i === idx
                  const isPast    = i < idx
                  return (
                    <div key={s.key} className="flex-1 flex justify-center relative z-10">
                      <div
                        title={stageLabel(s.key)}
                        className={`rounded-full border-2 transition-all ${
                          isCurrent
                            ? `w-3.5 h-3.5 ${dotColor} shadow-sm`
                            : isPast
                              ? 'w-2 h-2 bg-slate-600 border-slate-500'
                              : 'w-2 h-2 bg-slate-900 border-slate-700'
                        }`}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Discontinued */}
      {discontinued.length > 0 && (
        <div className="pt-3 mt-3 border-t border-slate-800/60">
          <div className="text-[10px] text-slate-600 mb-1.5 pl-36">Discontinued</div>
          {discontinued.map((asset: any) => (
            <div key={asset.id} className="flex items-center min-w-[556px] opacity-40">
              <div className="w-36 shrink-0 pr-3 text-right">
                <div className="text-xs text-slate-500 truncate line-through">{asset.drug_name}</div>
                {asset.indication && (
                  <div className="text-[10px] text-slate-600 truncate">{asset.indication}</div>
                )}
              </div>
              <div className="flex flex-1 items-center relative">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-slate-800" />
                {STAGES.map(s => (
                  <div key={s.key} className="flex-1 flex justify-center relative z-10">
                    <div className="w-2 h-2 rounded-full bg-slate-900 border-2 border-slate-800" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
