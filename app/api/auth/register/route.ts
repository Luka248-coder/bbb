import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

const ADMIN_EMAILS = ['dua.lipa140@outlook.fr']
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  const { email, password, username } = await request.json()

  if (!email || !password || !username) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const supabase = await createClient()

  // Vérifier si l'email existe déjà
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .single()

  if (existing) {
    return NextResponse.json({ error: 'email_exists' }, { status: 409 })
  }

  const password_hash = await bcrypt.hash(password, 12)
  const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase())

  const { data: user, error } = await supabase
    .from('users')
    .insert({
      email: email.toLowerCase(),
      username,
      password_hash,
      is_admin: isAdmin,
      discord_id: `email_${Date.now()}`,
    })
    .select()
    .single()

  if (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'db_failed' }, { status: 500 })
  }

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