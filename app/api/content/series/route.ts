import { NextResponse } from 'next/server'
import { getSeries } from '@/lib/fastflux'

export async function GET() {
  const series = await getSeries()
  return NextResponse.json(series)
}
