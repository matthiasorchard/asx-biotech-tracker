import type { Metadata } from 'next'
import { Geist, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import AlphaBanner from '@/components/AlphaBanner'
import CommandPalette from '@/components/CommandPalette'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'

const geist        = Geist({ subsets: ['latin'], variable: '--font-geist' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', weight: ['400', '500', '700'] })

export const metadata: Metadata = {
  title: 'ASX Biotech Tracker',
  description: 'Track ASX-listed biotech and medtech companies',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ASX Biotech',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'theme-color': '#16a34a',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="min-h-full bg-[--background] text-slate-200 font-sans antialiased">
        <ServiceWorkerRegistration />
        <Navbar />
        <AlphaBanner />
        <CommandPalette />
        <main className="max-w-screen-xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
