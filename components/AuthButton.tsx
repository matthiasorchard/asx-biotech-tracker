import { getUser } from '@/lib/supabase-server'
import AuthButtonClient from './AuthButtonClient'

/** Server component — fetches auth state, passes to client shell. */
export default async function AuthButton() {
  const user = await getUser()
  return <AuthButtonClient email={user?.email ?? null} />
}
