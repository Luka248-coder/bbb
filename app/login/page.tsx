'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from '@/components/session-provider'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, Eye, EyeOff, ArrowUpRight, AlertCircle, X, MailCheck, RotateCw, ShieldCheck } from 'lucide-react'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

const errorMessages: Record<string, string> = {
  discord_denied: 'Vous avez refusé la connexion Discord.',
  no_code: 'Aucun code de connexion reçu.',
  token_failed: 'Échec de la récupération du token Discord.',
  user_failed: 'Impossible de récupérer les informations utilisateur.',
  db_failed: 'Erreur lors de la création du compte.',
  auth_failed: 'Erreur d\'authentification. Veuillez réessayer.',
  invalid_credentials: 'Email ou mot de passe incorrect.',
  email_exists: 'Un compte avec cet email existe déjà.',
  missing_fields: 'Veuillez remplir tous les champs.',
  email_failed: "Impossible d'envoyer l'e-mail de vérification. Réessayez.",
  invalid_code: 'Code incorrect. Réessayez.',
  code_expired: 'Ce code a expiré, demandez-en un nouveau.',
  too_many_attempts: 'Trop de tentatives. Demandez un nouveau code.',
  not_found: 'Aucune demande en cours pour cet email.',
}

function LoginContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { refresh } = useSession()
  const error = searchParams.get('error')
  const redirectParam = searchParams.get('redirect')

  // N'accepte que les chemins relatifs internes (évite les redirections vers un autre domaine)
  const safeRedirect = redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
    ? redirectParam
    : '/'
  const isDownloadIntent = safeRedirect.includes('download=1')

  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')

  const [pendingEmail, setPendingEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending] = useState(false)

  const [posters, setPosters] = useState<string[]>([])

  useEffect(() => {
    let active = true
    fetch('/api/content/movies')
      .then(r => r.json())
      .then((list) => {
        if (!active || !Array.isArray(list)) return
        const urls = list
          .filter((m: any) => m?.poster_path)
          .slice(0, 12)
          .map((m: any) => `https://image.tmdb.org/t/p/w342${m.poster_path}`)
        setPosters(urls)
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown(s => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  const handleSubmit = async () => {
    setLocalError('')
    if (!email || !password || (tab === 'register' && !username)) {
      setLocalError(errorMessages.missing_fields)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/auth/${tab === 'login' ? 'login' : 'register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      })
      const data = await res.json()
      if (!res.ok) {
        setLocalError(errorMessages[data.error] || data.error || 'Une erreur est survenue.')
      } else if (tab === 'register' && data.step === 'verify') {
        setPendingEmail(data.email || email)
        setOtp('')
        setStep('verify')
        setResendCooldown(45)
      } else {
        window.location.replace(safeRedirect)
      }
    } catch (e) {
      setLocalError('Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    setLocalError('')
    if (otp.length !== 6) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, code: otp }),
      })
      const data = await res.json()
      if (!res.ok) {
        setLocalError(errorMessages[data.error] || data.error || 'Une erreur est survenue.')
        setOtp('')
      } else {
        window.location.replace(safeRedirect)
      }
    } catch (e) {
      setLocalError('Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return
    setResending(true)
    setLocalError('')
    try {
      const res = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail }),
      })
      const data = await res.json()
      if (!res.ok) {
        setLocalError(errorMessages[data.error] || data.error || 'Une erreur est survenue.')
      } else {
        setResendCooldown(45)
      }
    } catch (e) {
      setLocalError('Une erreur est survenue.')
    } finally {
      setResending(false)
    }
  }

  const displayError = localError || (error ? errorMessages[error] : '') || ''

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[860px] grid lg:grid-cols-2 rounded-3xl overflow-hidden"
        style={{ background: '#0a0a0b', border: '1px solid rgba(255,255,255,0.07)' }}
      >

        {/* ── Panneau gauche : mur de posters ── */}
        <div className="relative hidden lg:block overflow-hidden">
          {/* Mur de posters */}
          <div className="absolute inset-0 grid grid-cols-3 gap-3 p-3">
            {[0, 1, 2].map(col => (
              <div key={col} className="flex flex-col gap-3" style={{ transform: `translateY(${col === 1 ? '-28px' : col === 2 ? '14px' : '0px'})` }}>
                {(posters.length ? posters : Array(12).fill('')).slice(col * 4, col * 4 + 4).map((src, i) => (
                  <div key={i} className="relative w-full rounded-xl overflow-hidden bg-zinc-900" style={{ aspectRatio: '2/3' }}>
                    {src && <Image src={src || "/placeholder.svg"} alt="" fill className="object-cover" sizes="180px" />}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Voile dégradé pour lisibilité */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(115deg, rgba(10,10,11,0.97) 0%, rgba(10,10,11,0.85) 34%, rgba(10,10,11,0.45) 62%, rgba(10,10,11,0.25) 100%)' }} />

          {/* Contenu éditorial */}
          <div className="relative z-10 h-full flex flex-col justify-between p-10">
            <p className="flex items-center gap-3 text-white/45 text-xs font-semibold tracking-[0.28em]">
              <span className="w-8 h-px bg-white/40" /> STREAMSELF
            </p>

            <div>
              <h2 className="text-white font-black tracking-tight leading-[0.95] text-balance" style={{ fontSize: 'clamp(2rem, 3.6vw, 2.75rem)' }}>
                Entrez<br />dans<br />l&apos;image.
              </h2>
              <p className="text-white/55 text-[15px] leading-relaxed mt-6 max-w-xs">
                Votre espace personnel. Reprises, favoris, historique — tout en un seul endroit.
              </p>
            </div>

            <div className="flex items-center gap-4 text-white/40 text-xs font-semibold tracking-widest uppercase">
              <span>12K Titres</span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span>4K Ready</span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span>Sans pub</span>
            </div>
          </div>
        </div>

        {/* ── Panneau droit : formulaire ── */}
        <div className="relative flex flex-col justify-center p-8 sm:p-12">

          {/* Fermer */}
          <Link
            href="/"
            aria-label="Fermer"
            className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <X className="w-4 h-4" />
          </Link>

          <AnimatePresence mode="wait">
            {step === 'form' ? (
              <motion.div key="form" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.22 }}>

                {/* Onglets */}
                <div className="flex items-center gap-8 mb-10">
                  {(['login', 'register'] as const).map(t => (
                    <button key={t} onClick={() => { setTab(t); setLocalError('') }} className="relative pb-2 text-lg font-bold transition-colors">
                      <span className={tab === t ? 'text-white' : 'text-white/35 hover:text-white/60'}>
                        {t === 'login' ? 'Connexion' : 'Inscription'}
                      </span>
                      {tab === t && (
                        <motion.div layoutId="authUnderline" transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                          className="absolute -bottom-px left-0 right-0 h-0.5 bg-white rounded-full" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Sous-titre contextuel */}
                {isDownloadIntent && (
                  <p className="text-white/45 text-sm mb-6 -mt-4">Connectez-vous pour télécharger ce contenu.</p>
                )}

                {/* Erreur */}
                <AnimatePresence>
                  {displayError && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-3 bg-red-500/10 border border-red-500/25 text-red-400 rounded-2xl p-3.5 mb-5 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{displayError}</span>
                      <button onClick={() => setLocalError('')}><X className="w-4 h-4" /></button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Champs */}
                <div className="space-y-3.5 mb-7">
                  <AnimatePresence>
                    {tab === 'register' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <Field icon={<User className="w-5 h-5" />}>
                          <input type="text" placeholder="Pseudo" value={username} onChange={e => setUsername(e.target.value)}
                            className="flex-1 bg-transparent text-white placeholder-white/35 focus:outline-none text-[15px]" />
                        </Field>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Field icon={<Mail className="w-5 h-5" />}>
                    <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                      className="flex-1 bg-transparent text-white placeholder-white/35 focus:outline-none text-[15px]" />
                  </Field>

                  <Field icon={<Lock className="w-5 h-5" />}>
                    <input type={showPassword ? 'text' : 'password'} placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                      className="flex-1 bg-transparent text-white placeholder-white/35 focus:outline-none text-[15px]" />
                    <button onClick={() => setShowPassword(!showPassword)} className="text-white/35 hover:text-white/70 transition-colors shrink-0">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </Field>
                </div>

                {/* CTA blanc */}
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={handleSubmit} disabled={loading}
                  className="group w-full h-15 py-4 rounded-2xl bg-white text-black font-bold text-[15px] flex items-center justify-between px-6 disabled:opacity-60 transition-all">
                  {loading ? (
                    <span className="mx-auto w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{tab === 'login' ? 'Accéder' : 'Créer le compte'}</span>
                      <ArrowUpRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </>
                  )}
                </motion.button>

                {/* Lien secondaire */}
                {tab === 'login' && (
                  <div className="text-center mt-5">
                    <button className="text-white/40 hover:text-white/70 text-sm transition-colors">Mot de passe oublié ?</button>
                  </div>
                )}

                {/* Discord (secondaire) */}
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-white/8" />
                  <span className="text-white/25 text-[10px] font-bold tracking-[0.2em]">OU</span>
                  <div className="flex-1 h-px bg-white/8" />
                </div>
                <a href={`/api/auth/discord${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ''}`}>
                  <button className="w-full h-13 py-3.5 rounded-2xl flex items-center justify-center gap-3 font-semibold text-white/80 text-sm transition-all hover:text-white"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#5865F2]">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                    </svg>
                    Continuer avec Discord
                  </button>
                </a>

                {/* Note sécurité */}
                <p className="flex items-center justify-center gap-2 text-white/30 text-xs mt-7">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Données sécurisées · Compte StreamSelf
                </p>
              </motion.div>
            ) : (
              <motion.div key="verify" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.22 }}>
                <button onClick={() => { setStep('form'); setLocalError('') }} className="text-white/40 hover:text-white/80 text-sm mb-6 transition-colors">← Retour</button>

                <div className="w-12 h-12 rounded-2xl bg-white/8 border border-white/12 flex items-center justify-center mb-4">
                  <MailCheck className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-black text-white leading-tight mb-2">Vérifiez votre e-mail</h1>
                <p className="text-white/45 text-sm mb-7">
                  On a envoyé un code à 6 chiffres à <span className="text-white/80 font-medium">{pendingEmail}</span>.
                  <br /><span className="text-amber-400/80">Pensez à vérifier vos spams si vous ne le voyez pas.</span>
                </p>

                <AnimatePresence>
                  {displayError && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-3 bg-red-500/10 border border-red-500/25 text-red-400 rounded-2xl p-3.5 mb-5 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{displayError}</span>
                      <button onClick={() => setLocalError('')}><X className="w-4 h-4" /></button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex justify-center mb-7">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp} onComplete={handleVerify}>
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map(i => (
                        <InputOTPSlot key={i} index={i}
                          className="w-12 h-14 text-lg bg-white/5 border-white/10 text-white first:rounded-xl last:rounded-xl rounded-xl mx-1 border" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={handleVerify} disabled={loading || otp.length !== 6}
                  className="group w-full py-4 rounded-2xl bg-white text-black font-bold text-[15px] flex items-center justify-between px-6 disabled:opacity-50 transition-all">
                  {loading ? (
                    <span className="mx-auto w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Confirmer mon compte</span>
                      <ArrowUpRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </>
                  )}
                </motion.button>

                <button onClick={handleResend} disabled={resendCooldown > 0 || resending}
                  className="w-full flex items-center justify-center gap-2 text-white/40 hover:text-white/70 disabled:opacity-40 text-sm mt-5 transition-colors">
                  <RotateCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 ? `Renvoyer le code (${resendCooldown}s)` : 'Renvoyer le code'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 h-14 px-4 rounded-2xl transition-colors focus-within:border-white/30 focus-within:bg-white/[0.07]"
      style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.09)' }}>
      <span className="text-white/35 shrink-0">{icon}</span>
      {children}
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <LoginContent />
    </Suspense>
  )
}
