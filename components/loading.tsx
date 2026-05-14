'use client'

import Image from 'next/image'

// Spinner arc rouge identique au splash screen — pour les chargements de pages
export function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
      <Image
        src="/images/logo.png"
        alt="StreamSelf"
        width={160}
        height={46}
        className="object-contain opacity-90"
        priority
      />
      <svg
        className="animate-spin"
        width="32"
        height="32"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="18"
          cy="18"
          r="15"
          stroke="#e50914"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="50 94"
        />
      </svg>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="flex-shrink-0 w-40 md:w-48">
      <div className="aspect-[2/3] rounded-lg shimmer" />
      <div className="mt-3 space-y-2">
        <div className="h-4 w-3/4 rounded shimmer" />
        <div className="h-3 w-1/2 rounded shimmer" />
      </div>
    </div>
  )
}

export function RowSkeleton() {
  return (
    <section className="py-8">
      <div className="container mx-auto px-4 mb-4">
        <div className="h-8 w-48 rounded shimmer" />
      </div>
      <div className="flex gap-4 overflow-x-auto hide-scrollbar px-4 md:px-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </section>
  )
}

export function HeroSkeleton() {
  return (
    <section className="relative h-[85vh] min-h-[600px] overflow-hidden">
      <div className="absolute inset-0 shimmer" />
      <div className="relative h-full container mx-auto px-4 flex items-center">
        <div className="max-w-2xl space-y-4">
          <div className="h-8 w-32 rounded shimmer" />
          <div className="h-16 w-96 rounded shimmer" />
          <div className="h-24 w-full rounded shimmer" />
          <div className="flex gap-4">
            <div className="h-12 w-32 rounded shimmer" />
            <div className="h-12 w-40 rounded shimmer" />
          </div>
        </div>
      </div>
    </section>
  )
}