import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const discordId = request.nextUrl.searchParams.get('id')
  if (!discordId || !/^\d+$/.test(discordId)) {
    return NextResponse.json({ error: 'ID Discord invalide' }, { status: 400 })
  }

  try {
    // Essai 1 : Lanyard API (utilisateurs qui ont Lanyard bot)
    const lanyardRes = await fetch(`https://api.lanyard.rest/v1/users/${discordId}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000),
    })

    if (lanyardRes.ok) {
      const data = await lanyardRes.json()
      const user = data?.data?.discord_user
      if (user?.avatar) {
        const ext = user.avatar.startsWith('a_') ? 'gif' : 'png'
        const url = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`
        return NextResponse.json({ url, username: user.username })
      }
    }

    // Essai 2 : avatar par défaut Discord basé sur l'ID
    const discriminator = (BigInt(discordId) >> 22n) % 6n
    const defaultUrl = `https://cdn.discordapp.com/embed/avatars/${discriminator}.png`
    return NextResponse.json({ url: defaultUrl, username: null, default: true })

  } catch (err: any) {
    return NextResponse.json({ error: 'Impossible de contacter Discord' }, { status: 502 })
  }
}
