'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import GlobalSearch from '@/components/GlobalSearch'

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
  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-screen-xl mx-auto px-4 flex items-center h-14 gap-8">
        <Link href="/" className="flex items-center gap-2 text-green-400 font-semibold text-sm tracking-wide shrink-0">
          <span className="text-lg">⬡</span> ASX Biotech
        </Link>
        <div className="flex items-center gap-1">
          {links.map(l => {
            const active = l.href === '/' ? path === '/' : path.startsWith(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  active
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {l.label}
              </Link>
            )
          })}
        </div>
        <div className="ml-auto flex items-center gap-4">
          <GlobalSearch />
          <span className="text-xs text-slate-600 hidden lg:block">27 ASX Biotechs</span>
        </div>
      </div>
    </nav>
  )
}
