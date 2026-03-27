interface Grant {
  id: number
  funder: string
  program: string | null
  title: string
  investigator: string | null
  amount_m: number | null
  awarded_date: string | null
  status: string
  source_url: string | null
  notes: string | null
}

const FUNDER_STYLE: Record<string, string> = {
  MRFF:    'bg-blue-950 text-blue-400',
  NHMRC:   'bg-violet-950 text-violet-400',
  ARC:     'bg-purple-950 text-purple-400',
  'US NIH': 'bg-indigo-950 text-indigo-400',
}

const STATUS_STYLE: Record<string, string> = {
  active:    'text-emerald-400',
  completed: 'text-slate-500',
  pending:   'text-amber-400',
}

function funderBadge(funder: string) {
  const cls = FUNDER_STYLE[funder] ?? 'bg-slate-800 text-slate-400'
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cls}`}>{funder}</span>
  )
}

export default function GrantFunding({ grants }: { grants: Grant[] }) {
  if (grants.length === 0) return null

  const totalM = grants.reduce((s, g) => s + (g.amount_m ?? 0), 0)
  const active = grants.filter(g => g.status !== 'completed')

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-medium text-slate-300 min-w-0">Grant Funding</h2>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {active.length > 0 && <span className="text-emerald-500">{active.length} active</span>}
          {totalM > 0 && <span>${totalM.toFixed(1)}M total</span>}
          <span className="text-slate-700">Non-dilutive</span>
        </div>
      </div>

      <div className="divide-y divide-slate-800/60">
        {grants.map(g => (
          <div key={g.id} className={`px-4 py-3 ${g.status === 'completed' ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {funderBadge(g.funder)}
                  {g.program && (
                    <span className="text-xs text-slate-600 truncate max-w-xs">{g.program}</span>
                  )}
                  <span className={`text-xs ${STATUS_STYLE[g.status] ?? 'text-slate-500'}`}>
                    {g.status}
                  </span>
                </div>
                <div className="text-sm text-slate-200 leading-snug">
                  {g.source_url ? (
                    <a href={g.source_url} target="_blank" rel="noopener noreferrer"
                      className="hover:text-green-300 underline decoration-slate-700 underline-offset-2">
                      {g.title}
                    </a>
                  ) : g.title}
                </div>
                {g.investigator && (
                  <div className="text-xs text-slate-600 mt-0.5">Lead: {g.investigator}</div>
                )}
                {g.notes && (
                  <div className="text-xs text-slate-600 mt-0.5">{g.notes}</div>
                )}
              </div>
              <div className="text-right shrink-0">
                {g.amount_m != null && (
                  <div className="text-sm font-semibold text-green-400">${g.amount_m.toFixed(1)}M</div>
                )}
                {g.awarded_date && (
                  <div className="text-xs text-slate-600 mt-0.5">{g.awarded_date.slice(0, 7)}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-2.5 border-t border-slate-800/60 text-xs text-slate-700">
        Government grants sourced from{' '}
        <a href="https://www.health.gov.au/our-work/medical-research-future-fund/mrff-investments" target="_blank" rel="noopener noreferrer" className="hover:text-slate-500">MRFF</a>
        {', '}
        <a href="https://www.nhmrc.gov.au/funding/find-funding/grants" target="_blank" rel="noopener noreferrer" className="hover:text-slate-500">NHMRC</a>
        {' & other public registers. Manually curated.'}
      </div>
    </div>
  )
}
