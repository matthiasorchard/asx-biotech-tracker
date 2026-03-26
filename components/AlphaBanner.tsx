'use client'
import { useState, useEffect } from 'react'

export default function AlphaBanner() {
  const [dismissed, setDismissed] = useState(true) // true initially to avoid SSR flash

  useEffect(() => {
    if (!localStorage.getItem('alpha-banner-v1')) setDismissed(false)
  }, [])

  if (dismissed) return null

  return (
    <div className="bg-amber-950/70 border-b border-amber-900/50 px-4 py-2.5 text-xs text-amber-300 flex items-center justify-between gap-4">
      <span>
        <strong className="text-amber-200">Alpha build</strong> — Data is incomplete and may not be up to date.
        Not financial advice. For informational purposes only. Use at your own risk.
      </span>
      <button
        onClick={() => { localStorage.setItem('alpha-banner-v1', '1'); setDismissed(true) }}
        className="text-amber-600 hover:text-amber-300 shrink-0 text-base leading-none"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}
