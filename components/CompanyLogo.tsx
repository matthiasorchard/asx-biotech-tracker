'use client'
import { useState } from 'react'

export default function CompanyLogo({
  website,
  name,
  size = 32,
}: {
  website?: string | null
  name: string
  size?: number
}) {
  const [failed, setFailed] = useState(false)

  const domain = website
    ? (() => { try { return new URL(website).hostname.replace(/^www\./, '') } catch { return null } })()
    : null

  const initials = name
    .replace(/\b(limited|ltd|pty|pharmaceuticals|therapeutics|technologies|medical|biosurgery|bionics)\b/gi, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  if (!domain || failed) {
    return (
      <div
        className="rounded bg-slate-800 flex items-center justify-center text-slate-400 font-bold shrink-0 select-none"
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {initials}
      </div>
    )
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
      alt={name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="rounded object-contain shrink-0"
      style={{ width: size, height: size }}
    />
  )
}
