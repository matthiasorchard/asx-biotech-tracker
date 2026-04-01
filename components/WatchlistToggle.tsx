'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

interface Props {
  ticker: string
  initialWatched: boolean
  userId: string | null
}

export default function WatchlistToggle({ ticker, initialWatched, userId }: Props) {
  const [watched, setWatched] = useState(initialWatched)
  const [loading, setLoading] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  if (!userId) {
    return (
      <Link
        href="/auth/login"
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        title="Sign in to add to watchlist"
      >
        <span className="text-base">☆</span>
        <span className="hidden sm:inline">Watch</span>
      </Link>
    )
  }

  async function toggle() {
    setLoading(true)
    if (watched) {
      await supabase.from('watchlist').delete().eq('user_id', userId!).eq('ticker', ticker)
      setWatched(false)
    } else {
      await supabase.from('watchlist').insert({ user_id: userId!, ticker })
      setWatched(true)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={watched ? 'Remove from watchlist' : 'Add to watchlist'}
      className={`flex items-center gap-1.5 text-xs transition-colors disabled:opacity-50 ${
        watched
          ? 'text-yellow-400 hover:text-yellow-300'
          : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      <span className="text-base">{watched ? '★' : '☆'}</span>
      <span className="hidden sm:inline">{watched ? 'Watching' : 'Watch'}</span>
    </button>
  )
}
