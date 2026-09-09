import { NextRequest } from 'next/server'
import { proxyTopstreamMedia } from '@/lib/hls-proxy'

export const runtime = 'edge'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  return proxyTopstreamMedia(request)
}
