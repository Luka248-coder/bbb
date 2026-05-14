import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isAdmin } from '@/lib/auth'

export async function GET() {
  const supabase = await createClient()
  const user = await getSession()

  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('site_settings')
    .select('*')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Convert to key-value object
  const settings: Record<string, string> = {}
  data.forEach((setting) => {
    settings[setting.key] = setting.value || ''
  })

  return NextResponse.json(settings)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const user = await getSession()

  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Update each setting
  for (const [key, value] of Object.entries(body)) {
    await supabase
      .from('site_settings')
      .upsert({
        key,
        value: value as string,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })
  }

  return NextResponse.json({ success: true })
}
