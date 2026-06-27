import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSession } from '@/lib/auth'
import { MAX_VERIFICATION_ATTEMPTS } from '@/lib/email/code'

const ADMIN_EMAILS = ['dua.lipa140@outlook.fr']

export async function POST(request: NextRequest) {
  const { email, code } = await request.json()

  if (!email || !code) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()
  const supabase = await createClient()

  const { data: pending, error: fetchError } = await supabase
    .from('pending_registrations')
    .select('*')
    .eq('email', normalizedEmail)
    .single()

  if (fetchError || !pending) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (new Date(pending.expires_at).getTime() < Date.now()) {
    await supabase.from('pending_registrations').delete().eq('email', normalizedEmail)
    return NextResponse.json({ error: 'code_expired' }, { status: 410 })
  }

  if (pending.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    await supabase.from('pending_registrations').delete().eq('email', normalizedEmail)
    return NextResponse.json({ error: 'too_many_attempts' }, { status: 429 })
  }

  if (pending.code !== String(code).trim()) {
    await supabase
      .from('pending_registrations')
      .update({ attempts: pending.attempts + 1 })
      .eq('email', normalizedEmail)
    return NextResponse.json({ error: 'invalid_code' }, { status: 400 })
  }

  // Code correct : on crée enfin le vrai compte
  const isAdmin = ADMIN_EMAILS.includes(normalizedEmail)

  const { data: user, error: insertError } = await supabase
    .from('users')
    .insert({
      email: normalizedEmail,
      username: pending.username,
      password_hash: pending.password_hash,
      is_admin: isAdmin,
      discord_id: `email_${Date.now()}`,
    })
    .select()
    .single()

  if (insertError) {
    console.error('Register (verify) error:', insertError)
    return NextResponse.json({ error: 'db_failed' }, { status: 500 })
  }

  await supabase.from('pending_registrations').delete().eq('email', normalizedEmail)

  const sessionUser = {
    id: user.id,
    discord_id: user.discord_id,
    username: user.username,
    avatar: user.avatar,
    email: user.email,
    is_admin: user.is_admin,
  }

  const token = await createSession(sessionUser)
  const response = NextResponse.json({ success: true })
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
}
