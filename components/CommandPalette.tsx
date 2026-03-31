'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ── Types ────────────────────────────────────────────────────────────────────

type CompanyResult    = { type: 'company';      ticker: string; name: string; area: string | null }
type CatalystResult   = { type: 'catalyst';     id: number;    ticker: string; title: string; date: string }
type AnnouncResult    = { type: 'announcement'; id: number;    ticker: string; title: string; url: string; date: string }
type SearchResult     = CompanyResult | CatalystResult | AnnouncResult

const PAGE_LINKS = [
  { label: 'Dashboard',      href: '/' },
  { label: 'Companies',      href: '/companies' },
  { label: 'Catalysts',      href: '/catalysts' },
  { label: 'Risk Matrix',    href: '/risk-matrix' },
  { label: 'Trials',         href: '/trials' },
  { label: 'Announcements',  href: '/announcements' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function match(haystack: string | null | undefined, needle: string) {
  return (haystack ?? '').toLowerCase().includes(needle.toLowerCase())
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CommandPalette() {
  const router = useRouter()
  const [open, setOpen]         = useState(false)
  const [query, setQuery]       = useState('')
  const [cursor, setCursor]     = useState(0)
  const [loaded, setLoaded]     = useState(false)
  const [companies, setCompanies]       = useState<CompanyResult[]>([])
  const [catalysts, setCatalysts]       = useState<CatalystResult[]>([])
  const [announcements, setAnnouncements] = useState<AnnouncResult[]>([])
  const inputRef  = useRef<HTMLInputElement>(null)

  // ── Data fetch (lazy: only on first open) ─────────────────────────────────
  const fetchData = useCallback(async () => {
    if (loaded) return
    const [coRes, catRes, annRes] = await Promise.all([
      supabase.from('company').select('ticker,name,therapeutic_area').eq('status', 'active').order('ticker'),
      supabase.from('catalyst').select('id,ticker,title,expected_date').eq('status', 'upcoming').order('expected_date', { ascending: true }).limit(60),
      supabase.from('announcement').select('id,ticker,title,asx_url,release_date').order('release_date', { ascending: false }).limit(60),
    ])
    setCompanies((coRes.data ?? []).map(c => ({ type: 'company',      ticker: c.ticker, name: c.name, area: c.therapeutic_area })))
    setCatalysts((catRes.data ?? []).map(c => ({ type: 'catalyst',    id: c.id, ticker: c.ticker, title: c.title, date: c.expected_date })))
    setAnnouncements((annRes.data ?? []).map(a => ({ type: 'announcement', id: a.id, ticker: a.ticker, title: a.title, url: a.asx_url, date: a.release_date })))
    setLoaded(true)
  }, [loaded])

  // ── Open/close ────────────────────────────────────────────────────────────
  function openPalette() {
    setOpen(true)
    fetchData()
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function closePalette() {
    setOpen(false)
    setQuery('')
    setCursor(0)
  }

  // ── Global shortcut: Cmd+K / Ctrl+K ──────────────────────────────────────
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        open ? closePalette() : openPalette()
      }
      if (e.key === 'Escape' && open) closePalette()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, fetchData])

  // ── Filtered results ──────────────────────────────────────────────────────
  const q = query.trim()
  const filteredCompanies    = q.length < 2 ? [] : companies.filter(c =>
    match(c.ticker, q) || match(c.name, q) || match(c.area, q)
  ).slice(0, 5)
  const filteredCatalysts    = q.length < 2 ? [] : catalysts.filter(c =>
    match(c.ticker, q) || match(c.title, q)
  ).slice(0, 4)
  const filteredAnnouncements = q.length < 2 ? [] : announcements.filter(a =>
    match(a.ticker, q) || match(a.title, q)
  ).slice(0, 4)

  const allResults: SearchResult[] = [...filteredCompanies, ...filteredCatalysts, ...filteredAnnouncements]
  const hasResults = allResults.length > 0

  // ── Navigation ────────────────────────────────────────────────────────────
  function navigate(result: SearchResult) {
    if (result.type === 'company')      router.push(`/companies/${result.ticker}`)
    else if (result.type === 'catalyst') router.push(`/companies/${result.ticker}`)
    else window.open(result.url, '_blank', 'noopener,noreferrer')
    closePalette()
  }

  function navigatePage(href: string) {
    router.push(href)
    closePalette()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const max = q.length < 2 ? PAGE_LINKS.length : allResults.length
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, max - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter') {
      if (q.length < 2) { navigatePage(PAGE_LINKS[cursor]?.href ?? '/') }
      else if (allResults[cursor]) navigate(allResults[cursor])
    }
  }

  if (!open) return null

  // ── Result index tracking (for cursor highlight) ───────────────────────────
  let idx = -1
  function nextIdx() { return ++idx }

  return (
    <div
      className="fixed inset-0 z-[500] flex items-start justify-center pt-[12vh] px-4"
      onMouseDown={e => { if (e.target === e.currentTarget) closePalette() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />

      {/* Palette */}
      <div className="relative w-full max-w-lg glass-card shadow-2xl overflow-hidden !rounded-xl">

        {/* Search input */}
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-800">
          <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setCursor(0) }}
            onKeyDown={onKeyDown}
            placeholder="Search companies, catalysts, announcements…"
            className="flex-1 bg-transparent text-slate-200 text-sm placeholder-slate-600 outline-none"
          />
          <kbd className="text-xs text-slate-600 font-mono border border-slate-700 rounded px-1.5 py-0.5 shrink-0">esc</kbd>
        </div>

        {/* Results / empty state */}
        <div className="max-h-[60vh] overflow-y-auto overscroll-contain">

          {/* Loading */}
          {!loaded && q.length >= 2 && (
            <div className="px-4 py-6 text-center text-xs text-slate-600">Loading…</div>
          )}

          {/* No results */}
          {loaded && q.length >= 2 && !hasResults && (
            <div className="px-4 py-6 text-center text-xs text-slate-600">No results for &ldquo;{q}&rdquo;</div>
          )}

          {/* Quick navigation (empty state) */}
          {q.length < 2 && (
            <div className="py-1.5">
              <div className="px-3 py-1.5 text-xs text-slate-600 uppercase tracking-wide font-medium">Quick links</div>
              {PAGE_LINKS.map((link, i) => (
                <button
                  key={link.href}
                  onMouseEnter={() => setCursor(i)}
                  onMouseDown={() => navigatePage(link.href)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors text-sm ${
                    i === cursor ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <span className="text-green-600 text-xs">→</span>
                  {link.label}
                </button>
              ))}
            </div>
          )}

          {/* Companies group */}
          {filteredCompanies.length > 0 && (
            <div className="py-1.5">
              <div className="px-3 py-1.5 text-xs text-slate-600 uppercase tracking-wide font-medium">Companies</div>
              {filteredCompanies.map(c => {
                const i = nextIdx()
                return (
                  <button
                    key={c.ticker}
                    onMouseEnter={() => setCursor(i)}
                    onMouseDown={() => navigate(c)}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                      i === cursor ? 'bg-slate-800' : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="font-mono font-bold text-green-400 text-sm w-10 shrink-0">{c.ticker}</span>
                    <div className="min-w-0">
                      <div className="text-slate-200 text-sm truncate">{c.name}</div>
                      {c.area && <div className="text-slate-600 text-xs truncate">{c.area}</div>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Catalysts group */}
          {filteredCatalysts.length > 0 && (
            <div className="py-1.5 border-t border-slate-800/60">
              <div className="px-3 py-1.5 text-xs text-slate-600 uppercase tracking-wide font-medium">Upcoming Catalysts</div>
              {filteredCatalysts.map(c => {
                const i = nextIdx()
                return (
                  <button
                    key={c.id}
                    onMouseEnter={() => setCursor(i)}
                    onMouseDown={() => navigate(c)}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                      i === cursor ? 'bg-slate-800' : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="font-mono font-bold text-green-400 text-sm w-10 shrink-0">{c.ticker}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-200 text-sm truncate">{c.title}</div>
                      <div className="text-slate-600 text-xs">{c.date?.slice(0, 10)}</div>
                    </div>
                    <span className="text-xs text-slate-600 shrink-0">catalyst ↗</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Announcements group */}
          {filteredAnnouncements.length > 0 && (
            <div className="py-1.5 border-t border-slate-800/60">
              <div className="px-3 py-1.5 text-xs text-slate-600 uppercase tracking-wide font-medium">Announcements</div>
              {filteredAnnouncements.map(a => {
                const i = nextIdx()
                return (
                  <button
                    key={a.id}
                    onMouseEnter={() => setCursor(i)}
                    onMouseDown={() => navigate(a)}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                      i === cursor ? 'bg-slate-800' : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="font-mono font-bold text-green-400 text-sm w-10 shrink-0">{a.ticker}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-200 text-sm truncate">{a.title}</div>
                      <div className="text-slate-600 text-xs">{a.date?.slice(0, 10)}</div>
                    </div>
                    <span className="text-xs text-slate-600 shrink-0">ASX ↗</span>
                  </button>
                )
              })}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-800 flex items-center gap-3 text-xs text-slate-700">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">esc</kbd> close</span>
          <span className="ml-auto"><kbd className="font-mono">⌘K</kbd> toggle</span>
        </div>
      </div>
    </div>
  )
}
