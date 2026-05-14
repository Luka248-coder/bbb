'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function MaintenanceContent() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
    ? decodeURIComponent(searchParams.get('message')!)
    : 'Nous effectuons une maintenance pour améliorer votre expérience. Revenez très bientôt !'

  const [dots, setDots] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d + 1) % 4)
    }, 600)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background overflow-hidden relative flex items-center justify-center px-4">
      {/* Animated background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary)/0.15) 0%, transparent 70%)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary)/0.1) 0%, transparent 70%)',
          }}
          animate={{
            scale: [1, 1.15, 1],
            x: [0, -25, 0],
            y: [0, 25, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary)/0.08) 0%, transparent 70%)',
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Main content */}
      <div className="relative z-10 max-w-lg w-full text-center">
        {/* Gear icon with animated rings */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="relative mx-auto mb-10 w-32 h-32"
        >
          {/* Outer ring */}
          <motion.div
            className="absolute inset-0 rounded-full border border-primary/20"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
          />
          {/* Middle ring */}
          <motion.div
            className="absolute inset-3 rounded-full border border-primary/30"
            animate={{ scale: [1, 1.12, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
          />
          {/* Inner circle */}
          <div className="absolute inset-6 rounded-full bg-primary/10 border border-primary/40 flex items-center justify-center backdrop-blur-sm">
            {/* Spinning gear SVG */}
            <motion.svg
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth={1.5}
              stroke="hsl(var(--primary))"
              className="w-10 h-10"
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </motion.svg>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-4xl font-black text-foreground tracking-tight mb-2">
            Maintenance en cours
            <span className="text-primary inline-block w-8 text-left">
              {'.'.repeat(dots)}
            </span>
          </h1>
          <div className="w-20 h-1 bg-primary rounded-full mx-auto mt-3 mb-6" />
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-card/60 border border-border/60 rounded-2xl p-5 mb-8 backdrop-blur-sm"
        >
          <p className="text-muted-foreground text-sm leading-relaxed">
            {message}
          </p>
        </motion.div>

        {/* Animated loading bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <div className="h-1 bg-muted rounded-full overflow-hidden mx-auto max-w-xs">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, hsl(var(--primary)/0.5), hsl(var(--primary)), hsl(var(--primary)/0.5))' }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>

        {/* Status dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-2"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  )
}

export default function MaintenancePage() {
  return (
    <Suspense>
      <MaintenanceContent />
    </Suspense>
  )
}