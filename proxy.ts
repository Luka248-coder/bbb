import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { cinflixStreamApiUrl } from '@/lib/cinflix-url'
import { resolveCinflixApiUrl } from '@/lib/cinflix'

const BYPASS_PATHS = [
  '/maintenance',
  '/admin',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/session',
  '/api/auth/discord',
  '/api/auth/register',
  '/api/auth/admin',
  '/api/cinflix-resolve',
  '/api/cinflix-play',
  '/api/proxy-download',
  '/sw-cinflix.js',
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  console.log('[PROXY] pathname:', pathname)

  if (pathname === '/api/cinflix-resolve' || pathname === '/api/cinflix-play') {
    const { searchParams } = request.nextUrl
    const type = searchParams.get('type') === 'tv' || searchParams.get('type') === 'series' ? 'tv' : 'movie'
    const id = Number(searchParams.get('id') || 0)
    const season = Number(searchParams.get('s') || 1)
    const episode = Number(searchParams.get('e') || 1)
    if (!id) {
      if (pathname === '/api/cinflix-play') {
        return new NextResponse('id manquant', { status: 400 })
      }
      return NextResponse.json({ url: null }, { status: 400 })
    }
    const apiUrl = cinflixStreamApiUrl(type, id, season, episode)
    const media = await Promise.race([
      resolveCinflixApiUrl(apiUrl),
      new Promise<string | null>(resolve => setTimeout(() => resolve(null), 3000)),
    ])
    if (pathname === '/api/cinflix-play') {
      if (!media) {
        return new NextResponse('Cinflix n\'a pas renvoyé de flux', {
          status: 502,
          headers: { 'Cache-Control': 'no-store' },
        })
      }
      const dest = new URL('/api/proxy-download', request.url)
      dest.searchParams.set('url', media)
      const redirect = NextResponse.redirect(dest, 307)
      redirect.headers.set('Cache-Control', 'no-store')
      return redirect
    }
    return NextResponse.json({ url: media }, { headers: { 'Cache-Control': 'no-store' } })
  }

  // Toujours autoriser les chemins bypass
  if (BYPASS_PATHS.some((p) => pathname.startsWith(p))) {
    console.log('[PROXY] bypass → next()')
    return NextResponse.next()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let maintenanceMode = false
  let maintenanceMessage = ''

  if (supabaseUrl && supabaseKey) {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/site_settings?key=in.(maintenance_mode,maintenance_message)&select=key,value`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          cache: 'no-store',
        }
      )
      if (res.ok) {
        const data: Array<{ key: string; value: string }> = await res.json()
        maintenanceMode = data.find((r) => r.key === 'maintenance_mode')?.value === 'true'
        maintenanceMessage = data.find((r) => r.key === 'maintenance_message')?.value || ''
        console.log('[PROXY] maintenanceMode:', maintenanceMode)
      }
    } catch {}
  }

  if (!maintenanceMode) {
    return NextResponse.next()
  }

  // Maintenance ON — vérifier si admin via JWT
  const token = request.cookies.get('session')?.value
  console.log('[PROXY] token present:', !!token)

  if (token) {
    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'streamself-secret-key-change-in-production'
      )
      const { payload } = await jwtVerify(token, secret)
      const user = (payload as any)?.user
      console.log('[PROXY] user:', JSON.stringify(user))
      if (user && (user.is_admin === true || user.discord_id === '1195798936049422376')) {
        console.log('[PROXY] admin bypass → next()')
        return NextResponse.next()
      }
    } catch (e) {
      console.log('[PROXY] jwt error:', e)
    }
  }

  console.log('[PROXY] → redirect maintenance')
  const url = request.nextUrl.clone()
  url.pathname = '/maintenance'
  url.search = ''
  if (maintenanceMessage) {
    url.searchParams.set('message', encodeURIComponent(maintenanceMessage))
  }
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}