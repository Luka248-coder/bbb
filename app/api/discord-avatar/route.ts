import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const discordId = request.nextUrl.searchParams.get('id')
  if (!discordId || !/^\d{17,20}$/.test(discordId)) {
    return NextResponse.json({ error: 'ID Discord invalide (17-20 chiffres)' }, { status: 400 })
  }

  const headers = { 'Accept': 'application/json', 'User-Agent': 'StreamSelf/1.0' }
  const timeout = AbortSignal.timeout(5000)

  // === Essai 1 : Lanyard (fonctionne si l'user a le bot) ===
  try {
    const r = await fetch(`https://api.lanyard.rest/v1/users/${discordId}`, { headers, signal: timeout })
    if (r.ok) {
      const d = await r.json()
      const user = d?.data?.discord_user
      // Vérifier que l'avatar est bien présent (pas null)
      if (user?.id && user?.avatar) {
        const ext = user.avatar.startsWith('a_') ? 'gif' : 'png'
        const url = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`
        return NextResponse.json({ url, username: user.username || user.global_name || null })
      }
    }
  } catch {}

  // === Essai 2 : discord.id (API publique tierce) ===
  try {
    const r = await fetch(`https://discord.id/api/fetch/?userid=${discordId}`, { headers, signal: AbortSignal.timeout(5000) })
    if (r.ok) {
      const d = await r.json()
      if (d?.avatar_url && !d.avatar_url.includes('embed/avatars')) {
        return NextResponse.json({ url: d.avatar_url, username: d.tag?.split('#')[0] || d.username || null })
      }
    }
  } catch {}

  // === Essai 3 : japi.rest ===
  try {
    const r = await fetch(`https://japi.rest/discord/v1/user/${discordId}`, { headers, signal: AbortSignal.timeout(5000) })
    if (r.ok) {
      const d = await r.json()
      const user = d?.data?.user
      if (user?.avatar) {
        const ext = user.avatar.startsWith('a_') ? 'gif' : 'png'
        const url = `https://cdn.discordapp.com/avatars/${discordId}/${user.avatar}.${ext}?size=256`
        return NextResponse.json({ url, username: user.global_name || user.username || null })
      }
    }
  } catch {}

  // === Essai 4 : If DISCORD_BOT_TOKEN is set, use official API ===
  const token = process.env.DISCORD_BOT_TOKEN
  if (token) {
    try {
      const r = await fetch(`https://discord.com/api/v10/users/${discordId}`, {
        headers: { ...headers, Authorization: `Bot ${token}` },
        signal: AbortSignal.timeout(5000),
      })
      if (r.ok) {
        const user = await r.json()
        if (user?.avatar) {
          const ext = user.avatar.startsWith('a_') ? 'gif' : 'png'
          const url = `https://cdn.discordapp.com/avatars/${discordId}/${user.avatar}.${ext}?size=256`
          return NextResponse.json({ url, username: user.global_name || user.username || null })
        }
      }
    } catch {}
  }

  return NextResponse.json({
    error: 'Impossible de récupérer l\'avatar. Essayez d\'uploader directement votre photo.',
    suggestion: 'upload'
  }, { status: 404 })
}
