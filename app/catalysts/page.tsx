import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { ImpactBadge, ConfidenceBadge, StatusBadge } from '@/components/Badge'

export const revalidate = 1800

export default async function CatalystsPage() {
  const { data: catalysts } = await supabase
    .from('catalyst')
    .select('*')
    .order('expected_date', { ascending: true })

  const upcoming = (catalysts ?? []).filter((c: any) => c.status === 'upcoming')
  const completed = (catalysts ?? []).filter((c: any) => c.status !== 'upcoming')

  const byType = (upcoming ?? []).reduce((acc: Record<string, number>, c: any) => {
    acc[c.event_type] = (acc[c.event_type] || 0) + 1
    return acc
  }, {})

  const typeLabel = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Catalyst Calendar</h1>
        <p className="text-slate-500 text-sm mt-1">Upcoming clinical, regulatory and commercial milestones</p>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(byType).map(([type, count]) => (
          <div key={type} className="bg-slate-900 border border-slate-800 rounded-full px-3 py-1 text-xs text-slate-300">
            {typeLabel(type)} <span className="text-cyan-400 font-semibold ml-1">{count}</span>
          </div>
        ))}
      </div>

      {/* Upcoming */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg">
        <div className="px-4 py-3 border-b border-slate-800">
          <h2 className="text-sm font-medium text-slate-300">Upcoming ({upcoming.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-800">
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Ticker</th>
                <th className="text-left px-4 py-2">Event</th>
                <th className="text-left px-4 py-2 hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-2 hidden md:table-cell">Confidence</th>
                <th className="text-left px-4 py-2 hidden md:table-cell">Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {upcoming.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                    {formatDate(c.expected_date)}
                    {c.times_delayed ? (
                      <div className="text-amber-600 text-xs">{c.times_delayed}× delayed</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/companies/${c.ticker}`} className="font-mono font-bold text-cyan-400 hover:text-cyan-300">{c.ticker}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-200">{c.title}</div>
                    {c.description && <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{c.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">{typeLabel(c.event_type)}</td>
                  <td className="px-4 py-3 hidden md:table-cell"><ConfidenceBadge confidence={c.confidence} /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><ImpactBadge impact={c.impact} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg">
          <div className="px-4 py-3 border-b border-slate-800">
            <h2 className="text-sm font-medium text-slate-300">Completed ({completed.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-800">
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Ticker</th>
                  <th className="text-left px-4 py-2">Event</th>
                  <th className="text-left px-4 py-2 hidden md:table-cell">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 opacity-70">
                {completed.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">{formatDate(c.actual_date || c.expected_date)}</td>
                    <td className="px-4 py-2.5">
                      <Link href={`/companies/${c.ticker}`} className="font-mono text-sm text-cyan-500 hover:text-cyan-400">{c.ticker}</Link>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{c.title}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      {c.outcome ? (
                        <span className={c.outcome_sentiment === 'positive' ? 'text-emerald-400 text-xs' : c.outcome_sentiment === 'negative' ? 'text-rose-400 text-xs' : 'text-slate-400 text-xs'}>
                          {c.outcome}
                        </span>
                      ) : <span className="text-slate-600 text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
