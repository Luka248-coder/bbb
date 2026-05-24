'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

export function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className="relative flex items-center justify-center">
        <motion.div
          className="absolute w-24 h-24 rounded-full"
          style={{
            border: '2px solid transparent',
            borderTopColor: '#e50914',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <Image
          src="/images/logo.png"
          alt="Logo"
          width={80}
          height={24}
          className="object-contain relative z-10"
          priority
        />
      </div>
    </div>
  )
}

export function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
    >
      <div className="relative flex items-center justify-center">
        <motion.div
          className="absolute w-32 h-32 rounded-full"
          style={{
            border: '2px solid transparent',
            borderTopColor: '#e50914',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <Image
          src="/images/logo.png"
          alt="Logo"
          width={100}
          height={30}
          className="object-contain relative z-10"
          priority
        />
      </div>
    </motion.div>
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
