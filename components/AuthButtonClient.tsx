'use client'
import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AuthButtonClient() {
  const [email,   setEmail]   = useState<string | null>(null)
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router  = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null)
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Always show Sign in by default; updates to avatar once session resolves
  if (!email) {
    return (
      <Link
        href="/auth/login"
        className="text-xs px-3 py-1.5 rounded bg-green-800/60 hover:bg-green-700/60
                   border border-green-700/40 text-green-300 transition-colors"
      >
        Sign in
      </Link>
    )
  }

  const initials = email.slice(0, 2).toUpperCase()

  async function signOut() {
    setLoading(true)
    setOpen(false)
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-7 h-7 rounded-full bg-green-800 border border-green-600 flex items-center
                   justify-center text-xs font-semibold text-green-200 hover:bg-green-700 transition-colors"
        title={email}
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-52 bg-slate-900 border border-slate-700 rounded-lg
                        shadow-xl shadow-black/50 py-1.5 z-50">
          <div className="px-3 py-2 border-b border-slate-800">
            <p className="text-xs text-slate-400 truncate">{email}</p>
          </div>
          <Link
            href="/watchlist"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            My Watchlist
          </Link>
          <button
            onClick={signOut}
            disabled={loading}
            className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-800
                       hover:text-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  )
}
