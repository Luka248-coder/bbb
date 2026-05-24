import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getMovies, getSeries } from '@/lib/fastflux'
import { AdminDashboard } from '@/components/admin/admin-dashboard'
import { Loading } from '@/components/loading'

// Force dynamic : jamais de cache, données fraîches à chaque requête
export const dynamic = 'force-dynamic'

export const metadata = { title: 'Dashboard - Admin' }

async function DashboardContent() {
  const supabase = await createClient()

  const [
    movies,
    series,
    { count: usersCount },
    { count: requestsCount },
    { count: pendingCount },
    { count: approvedCount },
    { count: rejectedCount },
    { count: openTicketsCount },
    { count: closedTicketsCount },
    { count: bannedCount },
    { data: recentRequests },
    { data: recentUsers },
    { data: recentTickets },
    { data: requestsByDay },
    { data: usersByDay },
    { data: playerErrors },
  ] = await Promise.all([
    getMovies(),
    getSeries(),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('content_requests').select('*', { count: 'exact', head: true }),
    supabase.from('content_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('content_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('content_requests').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'closed'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_banned', true),
    supabase.from('content_requests')
      .select('*, user:users(username, avatar, discord_id)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('users')
      .select('id, username, avatar, discord_id, created_at, is_admin, is_banned')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('support_tickets')
      .select('*, users(username, avatar, discord_id)')
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase.from('content_requests')
      .select('created_at, status')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true }),
    supabase.from('users')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true }),
    supabase.from('player_errors')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return (
    <AdminDashboard
      stats={{
        movies: movies.length,
        series: series.length,
        users: usersCount || 0,
        requests: requestsCount || 0,
        pendingRequests: pendingCount || 0,
        approvedRequests: approvedCount || 0,
        rejectedRequests: rejectedCount || 0,
        openTickets: openTicketsCount || 0,
        closedTickets: closedTicketsCount || 0,
        bannedUsers: bannedCount || 0,
      }}
      recentRequests={recentRequests || []}
      recentUsers={recentUsers || []}
      recentTickets={recentTickets || []}
      requestsByDay={requestsByDay || []}
      usersByDay={usersByDay || []}
      playerErrors={playerErrors || []}
    />
  )
}

export default function AdminPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DashboardContent />
    </Suspense>
  )
}
