import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import TrialsTable from '@/components/TrialsTable'

export const revalidate = 3600

async function getTrials() {
  const { data } = await supabase
    .from('clinical_trial')
    .select('*')
    .order('status')
    .order('phase')
  return data ?? []
}

export default async function TrialsPage() {
  const trials = await getTrials()

  const active = trials.filter((t: any) =>
    ['RECRUITING', 'NOT_YET_RECRUITING', 'ACTIVE_NOT_RECRUITING', 'ENROLLING_BY_INVITATION'].includes(t.status)
  )
  const byCompany = trials.reduce((m: Record<string, number>, t: any) => {
    m[t.ticker] = (m[t.ticker] ?? 0) + 1
    return m
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Clinical Trials</h1>
        <p className="text-slate-500 text-sm mt-1">Data from ClinicalTrials.gov</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Trials', value: String(trials.length), sub: 'all registered' },
          { label: 'Active', value: String(active.length), sub: 'recruiting / ongoing' },
          { label: 'Companies', value: String(Object.keys(byCompany).length), sub: 'with trial data' },
          { label: 'Has Results', value: String(trials.filter((t: any) => t.has_results).length), sub: 'published' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-xs text-slate-500 mb-1">{s.label}</div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-slate-600 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      <TrialsTable trials={trials} />
    </div>
  )
}
