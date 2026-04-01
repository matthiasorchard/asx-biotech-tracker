'use client'
import { useEffect, useState } from 'react'

const ALL_SECTIONS = [
  { id: 'pipeline',       label: 'Pipeline' },
  { id: 'cashflow',       label: 'Cash Flow' },
  { id: 'raises',         label: 'Raises' },
  { id: 'director-tx',   label: 'Director Tx' },
  { id: 'substantial',   label: 'Shareholders' },
  { id: 'options',        label: 'Options' },
  { id: 'short-interest', label: 'Short Interest' },
  { id: 'grants',         label: 'Grants' },
  { id: 'rdti',           label: 'R&D Tax' },
  { id: 'publications',   label: 'Publications' },
  { id: 'landscape',      label: 'Competitors' },
  { id: 'catalysts',      label: 'Catalysts' },
  { id: 'trials',         label: 'Trials' },
  { id: 'announcements',  label: 'Announcements' },
]

export default function CompanySectionNav({ available }: { available: string[] }) {
  const [active, setActive] = useState<string>('')
  const sections = ALL_SECTIONS.filter(s => available.includes(s.id))

  useEffect(() => {
    if (sections.length === 0) return
    const visible = new Map<string, number>()

    const observers = sections.map(s => {
      const el = document.getElementById(s.id)
      if (!el) return null
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            visible.set(s.id, entry.boundingClientRect.top)
          } else {
            visible.delete(s.id)
          }
          if (visible.size > 0) {
            // Highlight the topmost visible section
            const topmost = [...visible.entries()].sort((a, b) => a[1] - b[1])[0][0]
            setActive(topmost)
          }
        },
        { rootMargin: '-10% 0px -55% 0px' }
      )
      obs.observe(el)
      return obs
    })

    return () => observers.forEach(o => o?.disconnect())
  }, [sections.length])

  function scrollTo(id: string) {
    const el = document.getElementById(id)
    if (!el) return
    const offset = 110 // navbar + section nav height
    const top = el.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top, behavior: 'smooth' })
    setActive(id)
  }

  return (
    <div className="sticky top-14 z-30 -mx-4 px-4 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800/60">
      <div
        className="flex gap-0.5 overflow-x-auto py-1.5"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => scrollTo(s.id)}
            className={`px-3 py-1 rounded text-xs whitespace-nowrap transition-colors shrink-0 ${
              active === s.id
                ? 'bg-slate-800 text-white'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
