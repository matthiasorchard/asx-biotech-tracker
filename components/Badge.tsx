import { stageLabel, stageColor, categoryLabel, categoryColor } from '@/lib/utils'

export function StageBadge({ stage }: { stage: string | null }) {
  if (!stage) return <span className="text-slate-600">—</span>
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${stageColor(stage)}`}>
      {stageLabel(stage)}
    </span>
  )
}

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${categoryColor(category)}`}>
      {categoryLabel(category)}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-950 text-emerald-400',
    inactive: 'bg-slate-800 text-slate-400',
    suspended: 'bg-rose-950 text-rose-400',
    upcoming: 'bg-blue-950 text-blue-400',
    completed: 'bg-slate-800 text-slate-400',
    delayed: 'bg-amber-950 text-amber-400',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? 'bg-slate-800 text-slate-400'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export function ImpactBadge({ impact }: { impact: string }) {
  return (
    <span className={`text-xs font-medium ${impact === 'high' ? 'text-amber-400' : 'text-slate-500'}`}>
      {impact === 'high' ? '▲ High' : '◼ Med'}
    </span>
  )
}

export function ConfidenceBadge({ confidence }: { confidence: string }) {
  const map: Record<string, string> = {
    confirmed: 'text-emerald-400',
    expected: 'text-green-400',
    speculative: 'text-slate-500',
  }
  return (
    <span className={`text-xs ${map[confidence] ?? 'text-slate-500'}`}>
      {confidence.charAt(0).toUpperCase() + confidence.slice(1)}
    </span>
  )
}
