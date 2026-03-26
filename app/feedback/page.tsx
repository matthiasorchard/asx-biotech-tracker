import FeedbackForm from '@/components/FeedbackForm'

export const metadata = { title: 'Feedback — ASX Biotech Tracker' }

export default function FeedbackPage() {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Feedback</h1>
        <p className="text-slate-500 text-sm mt-1">
          Bug reports, data corrections, feature requests — all welcome.
          This is an alpha build and your input directly shapes what gets built next.
        </p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <FeedbackForm />
      </div>
    </div>
  )
}
