'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import GlobalSearch from '@/components/GlobalSearch'
import AuthButtonClient from '@/components/AuthButtonClient'

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/companies', label: 'Companies' },
  { href: '/catalysts', label: 'Catalysts' },
  { href: '/announcements', label: 'Announcements' },
  { href: '/risk-matrix', label: 'Risk Matrix' },
  { href: '/trials', label: 'Trials' },
  { href: '/feedback', label: 'Feedback' },
]

export default function Navbar() {
  const path = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-screen-xl mx-auto px-4 flex items-center h-14 gap-4">
        {/* Logo */}
        <Link href="/" onClick={() => setOpen(false)}
          className="flex items-center gap-2 text-green-400 font-semibold text-sm tracking-wide shrink-0">
          <span className="text-lg">⬡</span> ASX Biotech
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(l => {
            const active = l.href === '/' ? path === '/' : path.startsWith(l.href)
            return (
              <Link key={l.href} href={l.href}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}>
                {l.label}
              </Link>
            )
          })}
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          <GlobalSearch />
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
            className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-400 border border-slate-800 rounded px-2 py-1 transition-colors"
            title="Open command palette"
          >
            <span>⌘K</span>
          </button>
          <span className="text-xs text-slate-600 hidden lg:block">27 ASX Biotechs</span>
          <AuthButtonClient />
          {/* Hamburger — mobile only */}
          <button
            className="md:hidden p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            onClick={() => setOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {open ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {open && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-3 space-y-1">
          {links.map(l => {
            const active = l.href === '/' ? path === '/' : path.startsWith(l.href)
            return (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                className={`block px-3 py-2.5 rounded text-sm transition-colors ${
                  active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}>
                {l.label}
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}
