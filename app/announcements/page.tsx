import { supabase } from '@/lib/supabase'
import AnnouncementsFilter from '@/components/AnnouncementsFilter'

export const revalidate = 900

export default async function AnnouncementsPage() {
  const { data: announcements } = await supabase
    .from('announcement')
    .select('*')
    .order('release_date', { ascending: false })
    .limit(500)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Announcements</h1>
        <p className="text-slate-500 text-sm mt-1">All ASX announcements across tracked companies</p>
      </div>
      <AnnouncementsFilter announcements={announcements ?? []} />
    </div>
  )
}
