'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Company {
  ticker: string
  name: string
  therapeutic_area: string | null
}

export default function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [companies, setCompanies] = useState<Company[]>([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch company list once on mount
  useEffect(() => {
    supabase
      .from('company')
      .select('ticker,name,therapeutic_area')
      .eq('status', 'active')
      .order('ticker')
      .then(({ data, error }) => {
        if (data) setCompanies(data)
        if (!error) setLoaded(true)
      })
  }, [])

  const results = query.length < 1 ? [] : companies.filter(c =>
    c.ticker.toLowerCase().includes(query.toLowerCase()) ||
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    (c.therapeutic_area ?? '').toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Global shortcut: / to focus
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  function navigate(ticker: string) {
    router.push(`/companies/${ticker}`)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && results[cursor]) navigate(results[cursor].ticker)
    if (e.key === 'Escape') { setQuery(''); setOpen(false); inputRef.current?.blur() }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 w-48 focus-within:border-green-700 focus-within:w-64 transition-all duration-150">
        <svg className="w-3.5 h-3.5 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setCursor(0) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search…"
          className="bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none w-full"
        />
        {!query && (
          <kbd className="text-slate-700 text-xs font-mono shrink-0">/</kbd>
        )}
      </div>

      {open && query.length > 0 && !loaded && (
        <div className="absolute top-full mt-1.5 left-0 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-[200] px-3 py-2.5 text-xs text-slate-500">
          Loading…
        </div>
      )}
      {open && loaded && query.length > 0 && results.length === 0 && (
        <div className="absolute top-full mt-1.5 left-0 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-[200] px-3 py-2.5 text-xs text-slate-500">
          No results for "{query}"
        </div>
      )}
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1.5 left-0 w-72 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-[200] overflow-hidden">
          {results.map((c, i) => (
            <button
              key={c.ticker}
              onMouseEnter={() => setCursor(i)}
              onMouseDown={() => navigate(c.ticker)}
              className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${
                i === cursor ? 'bg-slate-800' : 'hover:bg-slate-800/50'
              }`}
            >
              <span className="font-mono font-bold text-green-400 text-sm w-10 shrink-0">{c.ticker}</span>
              <div className="min-w-0">
                <div className="text-slate-200 text-sm truncate">{c.name}</div>
                {c.therapeutic_area && (
                  <div className="text-slate-600 text-xs truncate">{c.therapeutic_area}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
