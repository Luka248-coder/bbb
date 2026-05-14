import { NextRequest, NextResponse } from 'next/server'
import { searchContent } from '@/lib/fastflux'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  
  if (!query) {
    return NextResponse.json({ movies: [], series: [] })
  }

  const results = await searchContent(query)
  return NextResponse.json(results)
}
