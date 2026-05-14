'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { ShieldOff, LogOut } from 'lucide-react'
import Link from 'next/link'

function DisabledContent() {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason') ? decodeURIComponent(searchParams.get('reason')!) : 'Votre compte a été désactivé temporairement par un administrateur.'

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className="max-w-md w-full text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 250, damping: 20 }}
          className="w-24 h-24 rounded-3xl bg-orange-950 border-2 border-orange-800 flex items-center justify-center mx-auto mb-8"
        >
          <ShieldOff className="w-12 h-12 text-orange-400" />
        </motion.div>

        {/* Title */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <h1 className="text-3xl font-black text-white mb-3">Compte désactivé</h1>
          <div className="w-16 h-1 bg-orange-500 rounded-full mx-auto mb-6" />
        </motion.div>

        {/* Reason box */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-orange-950/40 border border-orange-800/60 rounded-2xl p-5 mb-8"
        >
          <p className="text-orange-200 text-sm leading-relaxed font-medium">
            {reason}
          </p>
        </motion.div>

        {/* Info */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-zinc-500 text-sm mb-8"
        >
          Si tu penses que c'est une erreur, contacte le support via Discord.
        </motion.p>

        {/* Logout button */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <Link href="/api/auth/logout"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-semibold text-sm transition-colors">
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default function DisabledPage() {
  return (
    <Suspense>
      <DisabledContent />
    </Suspense>
  )
}