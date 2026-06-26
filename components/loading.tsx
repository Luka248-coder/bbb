'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

export function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div
        style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.1)',
          borderTopColor: 'rgba(255,255,255,0.4)',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background: '#000000' }}
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-28"
      >
        <Image
          src="/images/logo.png"
          alt="Logo"
          width={90}
          height={90}
          className="object-contain"
          priority
        />
      </motion.div>

      {/* Blue gradient line */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{ originX: 0 }}
        className="relative w-64"
      >
        <div
          style={{
            height: '1.5px',
            background: 'linear-gradient(90deg, transparent 0%, #1d6fe8 30%, #60a5fa 60%, transparent 100%)',
            boxShadow: '0 0 12px rgba(29, 111, 232, 0.7), 0 0 24px rgba(29, 111, 232, 0.3)',
          }}
        />
      </motion.div>
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
