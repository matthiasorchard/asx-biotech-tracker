import { redirect } from 'next/navigation'
import { getUser, createSupabaseServer } from '@/lib/supabase-server'
import Link from 'next/link'
import TickerLink from '@/components/TickerLink'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function getWatchlist(userId: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/watchlist?user_id=eq.${userId}&select=ticker,created_at&order=created_at.desc`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, cache: 'no-store' }
  )
  return res.ok ? (res.json() as Promise<{ ticker: string; created_at: string }[]>) : []
}

async function getCompanyNames(tickers: string[]) {
  if (!tickers.length) return {} as Record<string, string>
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/company?ticker=in.(${tickers.join(',')})&select=ticker,name`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, cache: 'no-store' }
  )
  const rows: { ticker: string; name: string }[] = res.ok ? await res.json() : []
  return Object.fromEntries(rows.map(r => [r.ticker, r.name]))
}

export default async function WatchlistPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login?next=/watchlist')

  const items   = await getWatchlist(user.id)
  const tickers = items.map(i => i.ticker)
  const names   = await getCompanyNames(tickers)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">My Watchlist</h1>
        <p className="text-sm text-slate-400 mt-1">Companies you&apos;re tracking</p>
      </div>

      {items.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-6 py-10 text-center">
          <p className="text-slate-400 text-sm">Your watchlist is empty.</p>
          <p className="text-slate-500 text-xs mt-1">
            Visit any{' '}
            <Link href="/companies" className="text-green-500 hover:text-green-400">company page</Link>
            {' '}and click ★ to add it.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
          {items.map(item => (
            <div key={item.ticker} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <TickerLink ticker={item.ticker} className="font-mono text-sm font-semibold text-green-400 hover:text-green-300" />
                <p className="text-xs text-slate-400 mt-0.5">{names[item.ticker] ?? ''}</p>
              </div>
              <WatchlistRemoveButton ticker={item.ticker} userId={user.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Inline client component for remove button — avoids extra file
function WatchlistRemoveButton({ ticker, userId }: { ticker: string; userId: string }) {
  // This is a placeholder — actual removal handled by the WatchlistToggle component on company pages
  // For the watchlist page we use a form + server action
  return (
    <form action={async () => {
      'use server'
      const supabase = await createSupabaseServer()
      await supabase.from('watchlist').delete().eq('user_id', userId).eq('ticker', ticker)
    }}>
      <button
        type="submit"
        className="text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-slate-800"
      >
        Remove
      </button>
    </form>
  )
}
