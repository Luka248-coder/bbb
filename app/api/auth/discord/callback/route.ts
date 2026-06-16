import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSession } from '@/lib/auth'

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1498406329751044216'
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/discord/callback`
const ADMIN_DISCORD_ID = '1195798936049422376'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // "state" porte l'URL de retour souhaitée (transmise par /api/auth/discord).
  // On ne garde que les chemins relatifs internes, jamais une URL externe.
  const state = searchParams.get('state')
  const safeRedirect = state && state.startsWith('/') && !state.startsWith('//') ? state : '/'
  const redirectQuery = safeRedirect !== '/' ? `&redirect=${encodeURIComponent(safeRedirect)}` : ''

  if (error || !code) {
    return NextResponse.redirect(new URL(`/login?error=discord_denied${redirectQuery}`, appUrl))
  }

  try {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    })

    if (!tokenRes.ok) {
      console.error('Token error:', await tokenRes.text())
      return NextResponse.redirect(new URL(`/login?error=token_failed${redirectQuery}`, appUrl))
    }

    const { access_token } = await tokenRes.json()

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    if (!userRes.ok) {
      return NextResponse.redirect(new URL(`/login?error=user_failed${redirectQuery}`, appUrl))
    }

    const discordUser = await userRes.json()
    const isAdminUser = discordUser.id === ADMIN_DISCORD_ID

    const supabase = await createClient()
    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('discord_id', discordUser.id)
      .single()

    let dbUser

    if (existing) {
      const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || null
      const { data } = await supabase
        .from('users')
        .update({
          username: discordUser.global_name || discordUser.username,
          avatar: discordUser.avatar,
          email: discordUser.email || null,
          is_admin: existing.is_admin || isAdminUser,
          last_ip: clientIp,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('discord_id', discordUser.id)
        .select()
        .single()
      dbUser = data || existing
    } else {
      const { data, error: insertErr } = await supabase
        .from('users')
        .insert({
          discord_id: discordUser.id,
          username: discordUser.global_name || discordUser.username,
          avatar: discordUser.avatar,
          email: discordUser.email || null,
          is_admin: isAdminUser,
        })
        .select()
        .single()
      if (insertErr) {
        console.error('Insert error:', insertErr)
        return NextResponse.redirect(new URL(`/login?error=db_failed${redirectQuery}`, appUrl))
      }
      dbUser = data
    }

    // Check banned / disabled before creating session
    if (dbUser.is_banned) {
      return NextResponse.redirect(new URL(`/login?error=banned${redirectQuery}`, appUrl))
    }
    if (dbUser.is_disabled) {
      const reason = encodeURIComponent(dbUser.disabled_reason || 'Compte désactivé temporairement.')
      return NextResponse.redirect(new URL(`/disabled?reason=${reason}`, appUrl))
    }

    const sessionUser = {
      id: dbUser.id,
      discord_id: dbUser.discord_id,
      username: dbUser.username,
      avatar: dbUser.avatar,
      email: dbUser.email,
      is_admin: dbUser.is_admin || isAdminUser,
      role: dbUser.role || 'user',
    }

    console.log('Auth OK:', sessionUser.username, '| admin:', sessionUser.is_admin)

    const token = await createSession(sessionUser)

    const response = NextResponse.redirect(new URL(safeRedirect, appUrl))
    response.cookies.set({
      name: 'session',
      value: token,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (err) {
    console.error('Auth error:', err)
    return NextResponse.redirect(new URL(`/login?error=auth_failed${redirectQuery}`, appUrl))
  }
}