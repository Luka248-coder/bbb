import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Envoyer une notification à tous les users ou à un user spécifique
export async function POST(request: NextRequest) {
  const { title, message, type, image_url, content_id, content_type, user_id } = await request.json()
  const supabase = await createClient()

  if (user_id) {
    // Notification ciblée
    await supabase.from('notifications').insert({
      user_id, title, message, type, image_url, content_id, content_type,
    })
  } else {
    // Notification à tous les utilisateurs
    const { data: users } = await supabase.from('users').select('id')
    if (users && users.length > 0) {
      const notifications = users.map(u => ({
        user_id: u.id, title, message, type, image_url, content_id, content_type,
      }))
      await supabase.from('notifications').insert(notifications)
    }
  }

  return NextResponse.json({ success: true })
}