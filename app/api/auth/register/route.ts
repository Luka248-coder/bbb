import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'
import { generateVerificationCode, VERIFICATION_CODE_TTL_MS } from '@/lib/email/code'
import { sendVerificationCodeEmail } from '@/lib/email/send-verification'

export async function POST(request: NextRequest) {
  const { email, password, username } = await request.json()

  if (!email || !password || !username) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()
  const supabase = await createClient()

  // Vérifier si un compte existe déjà avec cet email
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', normalizedEmail)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'email_exists' }, { status: 409 })
  }

  const password_hash = await bcrypt.hash(password, 12)
  const code = generateVerificationCode()
  const expires_at = new Date(Date.now() + VERIFICATION_CODE_TTL_MS).toISOString()

  // On stocke l'inscription en attente plutôt que de créer le compte tout de suite
  const { error: pendingError } = await supabase
    .from('pending_registrations')
    .upsert(
      {
        email: normalizedEmail,
        username,
        password_hash,
        code,
        attempts: 0,
        expires_at,
      },
      { onConflict: 'email' },
    )

  if (pendingError) {
    console.error('Pending registration error:', pendingError)
    return NextResponse.json({ error: 'db_failed' }, { status: 500 })
  }

  try {
    await sendVerificationCodeEmail(normalizedEmail, code)
  } catch (e) {
    console.error('Verification email error:', e)
    return NextResponse.json({ error: 'email_failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true, step: 'verify', email: normalizedEmail })
}
