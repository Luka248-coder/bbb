import { NextRequest, NextResponse } from 'next/server'

/**
 * Valide et retourne l'URL MP4 telle quelle.
 * L'admin doit coller le lien direct MP4 (obtenu via "Copier l'adresse de la vidéo").
 */
export async function POST(request: NextRequest) {
  const { url } = await request.json()
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL manquante' }, { status: 400 })
  }
  return NextResponse.json({ url })
}
