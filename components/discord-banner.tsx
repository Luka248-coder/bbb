'use client'

import { motion } from 'framer-motion'

export function DiscordBanner() {
  return (
    <section className="container mx-auto px-4 pb-16">
      <motion.a
        href="https://discord.gg/RcTnjZGM5d"
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.4 }}
        className="block relative overflow-hidden rounded-3xl cursor-pointer"
        style={{
          background: 'linear-gradient(120deg, #0a0e2e 0%, #0d1554 30%, #111c7a 60%, #0a1245 100%)',
          border: '1px solid rgba(99, 120, 255, 0.2)',
          boxShadow: '0 0 60px rgba(88, 101, 242, 0.15), 0 20px 40px rgba(0,0,0,0.4)',
        }}
      >
        {/* Animated glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #5865F2, transparent 70%)' }} />
          <div className="absolute -bottom-20 right-1/4 w-64 h-64 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)' }} />
          <div className="absolute top-0 right-0 w-96 h-full opacity-10"
            style={{ background: 'linear-gradient(to left, #5865F2, transparent)' }} />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }} />
        </div>

        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-8 px-8 py-7">
          {/* Left */}
          <div className="flex items-center gap-5">
            {/* Icon */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #5865F2, #3b4bd4)',
                  boxShadow: '0 8px 24px rgba(88,101,242,0.5)',
                }}>
                <svg viewBox="0 0 24 24" className="w-9 h-9 fill-white">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                </svg>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-[#0d1554]
                shadow-lg shadow-green-400/50" />
            </div>

            <div>
              <h3 className="text-white font-black text-2xl mb-1 tracking-tight"
                style={{ textShadow: '0 0 30px rgba(88,101,242,0.5)' }}>
                Rejoins la communauté
              </h3>
              <p className="text-white/50 text-sm leading-relaxed max-w-sm">
                Actus exclusives, entraide, demandes de contenu et discussions sur le serveur officiel.
              </p>
              <div className="flex items-center gap-3 mt-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                  </span>
                  <span className="text-green-400 text-xs font-semibold">Serveur actif</span>
                </div>
                <span className="text-white/20">·</span>
                <span className="text-white/30 text-xs">Gratuit</span>
              </div>
            </div>
          </div>

          {/* Right — CTA */}
          <div className="flex-shrink-0">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2.5 text-white font-bold px-7 py-3.5 rounded-full text-sm"
              style={{
                background: 'linear-gradient(135deg, #5865F2, #4752C4)',
                boxShadow: '0 4px 20px rgba(88,101,242,0.5)',
              }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
              Rejoindre Discord
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M7 17 17 7M7 7h10v10"/>
              </svg>
            </motion.div>
          </div>
        </div>
      </motion.a>
    </section>
  )
}