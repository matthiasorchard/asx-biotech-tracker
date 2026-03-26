export type PipelineStage =
  | 'discovery' | 'preclinical' | 'phase_1' | 'phase_1_2'
  | 'phase_2' | 'phase_2_3' | 'phase_3' | 'nda_filed'
  | 'approved' | 'discontinued'

export type AnnouncementCategory =
  | 'quarterly_4c' | 'half_year_report' | 'annual_report' | 'quarterly_activities'
  | 'capital_raise' | 'director_appointment' | 'director_resignation' | 'insider_trade'
  | 'trial_results' | 'regulatory' | 'partnership' | 'agm' | 'presentation'
  | 'trading_halt' | 'other'

export interface Company {
  ticker: string
  name: string
  sector: string | null
  therapeutic_area: string | null
  market_cap_m: number | null
  shares_outstanding_m: number | null
  status: string
  description: string | null
  website: string | null
  asx_url: string | null
  tier: number | null
  gics_industry: string | null
}

export interface CompanyDashboard extends Company {
  latest_quarter: string | null
  op_receipts: number | null
  rd_expenditure: number | null
  staff_costs: number | null
  admin_and_corporate: number | null
  total_operating_cf: number | null
  investing_cf: number | null
  total_financing_cf: number | null
  cash_at_start: number | null
  cash_at_end: number | null
  burn_rate: number | null
  filing_url: string | null
  runway_months: number | null
  cash_qoq_change: number | null
  is_cf_positive: boolean | null
  pipeline_assets: number
  most_advanced_stage: PipelineStage | null
  updated_at: string
}

export interface ExecutionScore {
  ticker: string
  completed: number
  on_time: number
  late: number
  currently_delayed: number
  cancelled: number
  upcoming: number
  avg_delays_per_catalyst: number | null
  positive_outcomes: number
  negative_outcomes: number
  on_time_pct: number | null
  reliability_grade: string
}

export interface PipelineAsset {
  id: number
  ticker: string
  drug_name: string
  indication: string | null
  stage: PipelineStage
  target: string | null
  mechanism: string | null
  stage_entered: string | null
  expected_next_milestone: string | null
  partner: string | null
  regulatory_body: string | null
  notes: string | null
  designations: string[] | null
  exclusivity_expiry: string | null
  reimbursement_status: string | null
}

export interface Catalyst {
  id: number
  ticker: string
  asset_id: number | null
  event_type: string
  title: string
  description: string | null
  expected_date: string | null
  actual_date: string | null
  confidence: string
  impact: string
  status: string
  source_url: string | null
  original_expected_date: string | null
  times_delayed: number | null
  delay_notes: string | null
  outcome: string | null
  outcome_sentiment: string | null
}

export interface ClinicalTrial {
  id: number
  ticker: string
  nct_id: string
  title: string | null
  brief_title: string | null
  acronym: string | null
  status: string
  phase: string | null
  study_type: string | null
  conditions: string[] | null
  interventions: string[] | null
  enrollment_target: number | null
  enrollment_actual: number | null
  start_date: string | null
  primary_completion_date: string | null
  completion_date: string | null
  locations_count: number | null
  countries: string[] | null
  sponsor: string | null
  has_results: boolean
  ct_url: string | null
}

export interface Quarterly4C {
  id: number
  ticker: string
  quarter_end: string
  cash_receipts_from_customers: number | null
  rd_expenditure: number | null
  staff_costs: number | null
  admin_and_corporate: number | null
  total_operating_cf: number | null
  total_financing_cf: number | null
  cash_at_start: number | null
  cash_at_end: number | null
  burn_rate: number | null
  filing_url: string | null
}

export interface Announcement {
  id: number
  ticker: string
  title: string
  asx_url: string
  release_date: string
  category: AnnouncementCategory
  is_price_sensitive: boolean
  needs_processing: boolean
  asx_id: string | null
  size: string | null
}

export interface PartnershipDeal {
  id: number
  ticker: string
  partner_name?: string
  deal_type?: string
  value_m?: number | null
  announced_date?: string | null
  description?: string | null
}
