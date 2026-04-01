import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <Suspense fallback={<div className="text-slate-500 text-sm">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
