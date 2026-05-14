import { NextResponse } from 'next/server'
import { getMovies } from '@/lib/fastflux'

export async function GET() {
  const movies = await getMovies()
  return NextResponse.json(movies)
}
