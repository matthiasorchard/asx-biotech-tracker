'use client'
import { useState } from 'react'

const SUPABASE_URL = 'https://zdnhdbkjwlzvzdxjctai.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkbmhkYmtqd2x6dnpkeGpjdGFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTAwOTQsImV4cCI6MjA4OTc4NjA5NH0._GAcI7-mFZoVAJxQhJwNo1G6e5EXba2HVoWghBCqTuM'

const TYPES = [
  { value: 'bug',     label: 'Bug report',      desc: 'Something is broken or incorrect' },
  { value: 'feature', label: 'Feature request',  desc: 'Something you would like to see added' },
  { value: 'data',    label: 'Data issue',       desc: 'Wrong, missing or outdated data' },
  { value: 'other',   label: 'Other',            desc: 'General feedback or question' },
]

export default function FeedbackForm({ ticker }: { ticker?: string }) {
  const [type, setType] = useState('feature')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [tickerField, setTickerField] = useState(ticker ?? '')
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setState('loading')
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/feedback`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          message: message.trim(),
          email: email.trim() || null,
          ticker: tickerField.trim().toUpperCase() || null,
        }),
      })
      if (res.ok || res.status === 201) {
        setState('done')
      } else {
        setState('error')
      }
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div className="bg-emerald-950/40 border border-emerald-900 rounded-lg p-8 text-center space-y-2">
        <div className="text-2xl">✓</div>
        <div className="text-emerald-400 font-medium">Thanks for your feedback</div>
        <div className="text-slate-500 text-sm">We review every submission.</div>
        <button onClick={() => { setState('idle'); setMessage('') }}
          className="mt-3 text-xs text-slate-500 hover:text-slate-300 underline">
          Submit another
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Type selector */}
      <div>
        <label className="block text-xs text-slate-400 mb-2 font-medium">Type</label>
        <div className="grid grid-cols-2 gap-2">
          {TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                type === t.value
                  ? 'border-green-700 bg-green-950/40 text-green-300'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <div className="font-medium">{t.label}</div>
              <div className="text-xs text-slate-600 mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div>
        <label className="block text-xs text-slate-400 mb-1.5 font-medium">
          Message <span className="text-rose-500">*</span>
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          required
          rows={4}
          placeholder={
            type === 'bug' ? 'Describe what happened and what you expected...' :
            type === 'data' ? 'Which company/field is wrong and what the correct data is...' :
            type === 'feature' ? 'Describe the feature and why it would be useful...' :
            'Your message...'
          }
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-green-700 resize-none"
        />
      </div>

      {/* Optional fields */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium">Company ticker (optional)</label>
          <input
            type="text"
            value={tickerField}
            onChange={e => setTickerField(e.target.value.toUpperCase())}
            placeholder="e.g. TLX"
            maxLength={6}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-green-700 font-mono"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium">Email (optional, for follow-up)</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-green-700"
          />
        </div>
      </div>

      {state === 'error' && (
        <div className="text-rose-400 text-xs">Something went wrong — please try again.</div>
      )}

      <button
        type="submit"
        disabled={state === 'loading' || !message.trim()}
        className="w-full py-2.5 bg-green-700 hover:bg-green-600 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {state === 'loading' ? 'Submitting…' : 'Submit feedback'}
      </button>
    </form>
  )
}
