import { PipelineStage } from './types'

export function formatMarketCap(m: number | null): string {
  if (m === null) return '—'
  if (m >= 1000) return `$${(m / 1000).toFixed(1)}B`
  return `$${m.toFixed(0)}M`
}

export function formatCash(m: number | null): string {
  if (m === null) return '—'
  const abs = Math.abs(m)
  const sign = m < 0 ? '-' : ''
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}B`
  return `${sign}$${abs.toFixed(1)}M`
}

export function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatQuarter(dateStr: string): string {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const year = d.getFullYear()
  // ASX financial year starts July, so Q1 = Jul-Sep
  const fyYear = month >= 7 ? year + 1 : year
  const fyQ = month >= 7 ? (month >= 10 ? 2 : 1) : (month >= 4 ? 4 : 3)
  return `Q${fyQ} FY${String(fyYear).slice(2)}`
}

export function stageLabel(stage: PipelineStage | string | null): string {
  if (!stage) return '—'
  const map: Record<string, string> = {
    discovery: 'Discovery',
    preclinical: 'Preclinical',
    phase_1: 'Phase 1',
    phase_1_2: 'Phase 1/2',
    phase_2: 'Phase 2',
    phase_2_3: 'Phase 2/3',
    phase_3: 'Phase 3',
    nda_filed: 'NDA Filed',
    approved: 'Approved',
    discontinued: 'Discontinued',
  }
  return map[stage] ?? stage
}

export function stageColor(stage: string | null): string {
  const map: Record<string, string> = {
    discovery: 'bg-slate-700 text-slate-300',
    preclinical: 'bg-slate-600 text-slate-200',
    phase_1: 'bg-blue-900 text-blue-300',
    phase_1_2: 'bg-blue-800 text-blue-200',
    phase_2: 'bg-violet-900 text-violet-300',
    phase_2_3: 'bg-violet-800 text-violet-200',
    phase_3: 'bg-amber-900 text-amber-300',
    nda_filed: 'bg-orange-900 text-orange-300',
    approved: 'bg-emerald-900 text-emerald-300',
    discontinued: 'bg-rose-950 text-rose-400',
  }
  return map[stage ?? ''] ?? 'bg-slate-700 text-slate-300'
}

export function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    quarterly_4c: 'Quarterly 4C',
    half_year_report: 'Half Year',
    annual_report: 'Annual Report',
    quarterly_activities: 'Quarterly Activities',
    capital_raise: 'Capital Raise',
    director_appointment: 'Director Appt',
    director_resignation: 'Director Resign',
    insider_trade: 'Insider Trade',
    trial_results: 'Trial Results',
    regulatory: 'Regulatory',
    partnership: 'Partnership',
    agm: 'AGM',
    presentation: 'Presentation',
    trading_halt: 'Trading Halt',
    other: 'Other',
  }
  return map[cat] ?? cat
}

export function categoryColor(cat: string): string {
  const map: Record<string, string> = {
    quarterly_4c: 'bg-green-900 text-green-300',
    half_year_report: 'bg-green-900 text-green-300',
    annual_report: 'bg-green-900 text-green-300',
    capital_raise: 'bg-violet-900 text-violet-300',
    trial_results: 'bg-emerald-900 text-emerald-300',
    regulatory: 'bg-amber-900 text-amber-300',
    presentation: 'bg-slate-700 text-slate-300',
    insider_trade: 'bg-slate-700 text-slate-300',
    partnership: 'bg-blue-900 text-blue-300',
    trading_halt: 'bg-rose-900 text-rose-300',
    agm: 'bg-slate-700 text-slate-300',
  }
  return map[cat] ?? 'bg-slate-800 text-slate-400'
}

export function impactColor(impact: string): string {
  if (impact === 'high') return 'text-amber-400'
  return 'text-slate-400'
}

export function confidenceColor(conf: string): string {
  if (conf === 'confirmed') return 'text-emerald-400'
  if (conf === 'expected') return 'text-green-400'
  return 'text-slate-500'
}

/** Returns { text, className } for runway display.
 *  - No 4C data (cash_at_end null)  → "No data" grey
 *  - CF positive (is_cf_positive)   → "CF+" green
 *  - Otherwise                      → "{n}mo" colour-coded
 */
export function formatRunway(c: {
  runway_months: number | string | null
  cash_at_end: number | string | null
  is_cf_positive: boolean | null
}): { text: string; className: string } {
  if (c.cash_at_end === null) return { text: 'No data', className: 'text-slate-600' }
  if (c.is_cf_positive) return { text: 'CF+', className: 'text-emerald-400' }
  const m = Number(c.runway_months)
  if (!m || m >= 999) return { text: 'CF+', className: 'text-emerald-400' }
  if (m >= 12) return { text: `${m}mo`, className: 'text-emerald-400' }
  if (m >= 6)  return { text: `${m}mo`, className: 'text-amber-400' }
  return { text: `${m}mo`, className: 'text-rose-400' }
}

