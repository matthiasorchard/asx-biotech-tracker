import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import AlphaBanner from '@/components/AlphaBanner'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'ASX Biotech Tracker',
  description: 'Track ASX-listed biotech and medtech companies',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-slate-950 text-slate-200 font-sans antialiased">
        <Navbar />
        <AlphaBanner />
        <main className="max-w-screen-xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
