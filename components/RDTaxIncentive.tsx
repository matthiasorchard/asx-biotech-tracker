interface RDTIRecord {
  id: number
  ticker: string
  financial_year: string
  amount_registered_m: number | null
  amount_received_m: number | null
  status: 'estimated' | 'registered' | 'received'
  date_received: string | null
  notes: string | null
}

const STATUS_STYLE: Record<string, string> = {
  estimated:  'bg-slate-800 text-slate-400',
  registered: 'bg-amber-950 text-amber-400',
  received:   'bg-emerald-950 text-emerald-400',
}

const STATUS_LABEL: Record<string, string> = {
  estimated:  'estimated',
  registered: 'registered',
  received:   'received',
}

export default function RDTaxIncentive({
  records,
  runwayMonths,
  adjRunwayMonths,
}: {
  records: RDTIRecord[]
  runwayMonths: number | null
  adjRunwayMonths: number | null
}) {
  if (records.length === 0) return null

  const totalReceived = records
    .filter(r => r.status === 'received')
    .reduce((s, r) => s + (r.amount_received_m ?? 0), 0)

  const totalPending = records
    .filter(r => r.status !== 'received')
    .reduce((s, r) => s + (r.amount_registered_m ?? 0), 0)

  const showAdjRunway =
    totalPending > 0 &&
    adjRunwayMonths !== null &&
    runwayMonths !== null &&
    adjRunwayMonths !== 999 &&
    adjRunwayMonths > runwayMonths

  const runwayGain = showAdjRunway ? (adjRunwayMonths! - runwayMonths!) : 0

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-medium text-slate-300 min-w-0">R&amp;D Tax Incentive</h2>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {totalPending > 0 && (
            <span className="text-amber-400">${totalPending.toFixed(1)}M pending</span>
          )}
          {totalReceived > 0 && (
            <span className="text-emerald-500">${totalReceived.toFixed(1)}M received</span>
          )}
          <span className="text-slate-700">43.5% ATO refund</span>
        </div>
      </div>

      {/* Adjusted runway callout */}
      {showAdjRunway && (
        <div className="mx-4 mt-3 px-3 py-2.5 bg-amber-950/40 border border-amber-900/50 rounded-lg">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs text-amber-400 font-medium">Adjusted Runway</span>
              <span className="text-xs text-slate-500 ml-2">including ${totalPending.toFixed(1)}M pending RDTI</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">{runwayMonths} mo</span>
              <span className="text-slate-700">→</span>
              <span className="text-amber-400 font-semibold">{adjRunwayMonths} mo</span>
              <span className="text-xs text-slate-600">(+{runwayGain} mo)</span>
            </div>
          </div>
        </div>
      )}

      <div className="divide-y divide-slate-800/60 mt-1">
        {records.map(r => (
          <div key={r.id} className={`px-4 py-3 ${r.status === 'received' ? 'opacity-70' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-medium text-slate-200">{r.financial_year}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_STYLE[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
                {r.notes && (
                  <div className="text-xs text-slate-600">{r.notes}</div>
                )}
              </div>
              <div className="text-right shrink-0 space-y-0.5">
                {r.status === 'received' ? (
                  <>
                    {r.amount_received_m != null && (
                      <div className="text-sm font-semibold text-emerald-400">
                        ${r.amount_received_m.toFixed(2)}M
                      </div>
                    )}
                    {r.date_received && (
                      <div className="text-xs text-slate-600">{r.date_received.slice(0, 10)}</div>
                    )}
                  </>
                ) : (
                  <>
                    {r.amount_registered_m != null && (
                      <div className="text-sm font-semibold text-amber-400">
                        ${r.amount_registered_m.toFixed(2)}M
                      </div>
                    )}
                    <div className="text-xs text-slate-600">expected</div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="mx-4 mb-3 mt-2 px-3 py-2.5 bg-slate-800/40 rounded-lg text-xs text-slate-500 space-y-1">
        <div className="font-medium text-slate-400">How the R&amp;D Tax Incentive works</div>
        <p>
          Australian biotechs with &lt; $20M aggregated turnover can claim a{' '}
          <span className="text-slate-300">43.5% refundable tax offset</span> on eligible R&amp;D expenditure
          each financial year (Jul–Jun). This is paid as a cash refund by the ATO — not a tax deduction —
          making it non-dilutive capital that directly extends cash runway.
        </p>
        <p>
          Companies register eligible R&amp;D activities with AusIndustry during the year,
          then lodge their tax return after 30 June. Refunds typically arrive{' '}
          <span className="text-slate-300">October–December</span> of the same calendar year.
          For a company spending $5M/year on R&amp;D, this is a ~$2.2M annual cash inflow.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="px-4 pb-3 border-t border-slate-800/60 pt-2.5 text-xs text-slate-700">
        <span className="text-slate-600 font-medium">Disclaimer: </span>
        Amounts shown as <span className="text-amber-500">estimated</span> or{' '}
        <span className="text-amber-500">registered</span> are forward-looking estimates based on
        disclosed R&amp;D expenditure and the 43.5% offset rate. Actual refunds may differ due to
        ATO assessments, eligibility rulings, or changes in R&amp;D spend. This is not financial
        advice. Manually curated from 4C filings and company disclosures — verify independently.
      </div>
    </div>
  )
}
