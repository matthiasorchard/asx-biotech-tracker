import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const next  = searchParams.get('next') ?? '/'
  const error = searchParams.get('error_description')

  if (error) {
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error)}`)
  }

  if (code) {
    const supabase = await createSupabaseServer()
    const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)
    if (!exchangeErr) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    return NextResponse.redirect(`${origin}/auth/login?error=Could+not+sign+in`)
  }

  return NextResponse.redirect(`${origin}/auth/login`)
}
