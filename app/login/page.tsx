'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from '@/components/session-provider'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, AlertCircle, X, MailCheck, RotateCw } from 'lucide-react'
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
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden px-4 py-10" style={{ background: '#060608' }}>

      {/* Ambiance cinéma : projecteur rouge + vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(90% 60% at 50% -10%, rgba(220,38,38,0.22) 0%, transparent 55%)' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(120% 120% at 50% 100%, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
      {/* Grain */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'120\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />

      {/* Bandes de pellicule perforées (signature) */}
      <div className="hidden sm:block absolute left-0 top-0 bottom-0 w-9" style={{ background: '#0c0c0e', backgroundImage: 'radial-gradient(circle at 50% 15px, rgba(255,255,255,0.10) 3px, transparent 4px)', backgroundSize: '100% 30px', borderRight: '1px solid rgba(255,255,255,0.05)' }} />
      <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-9" style={{ background: '#0c0c0e', backgroundImage: 'radial-gradient(circle at 50% 15px, rgba(255,255,255,0.10) 3px, transparent 4px)', backgroundSize: '100% 30px', borderLeft: '1px solid rgba(255,255,255,0.05)' }} />

      <motion.div initial={{ opacity: 0, y: 26, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md">

        {/* Carte-ticket */}
        <div className="relative rounded-[28px] overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(24,24,27,0.9), rgba(12,12,14,0.94))', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 40px 100px -30px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}>

          {/* Liseré rouge en haut */}
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, transparent, #ef4444 25%, #b91c1c 50%, #ef4444 75%, transparent)' }} />

          <div className="p-7 sm:p-9">

            {/* Marque + retour */}
            <div className="flex items-center justify-between mb-7">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', boxShadow: '0 6px 18px rgba(220,38,38,0.4)' }}>
                  <span className="text-white font-black text-lg leading-none">S</span>
                </div>
                <span className="text-white font-black text-lg tracking-tight">StreamSelf</span>
              </div>
              {step === 'form' ? (
                <Link href="/" className="text-white/35 hover:text-white/80 transition-colors text-xs font-medium">Accueil</Link>
              ) : (
                <button onClick={() => { setStep('form'); setLocalError('') }} className="text-white/35 hover:text-white/80 transition-colors text-xs font-medium">Modifier</button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {step === 'form' ? (
                <motion.div key="form" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
                  {/* Titre */}
                  <div className="mb-6">
                    <p className="text-red-400 text-[11px] font-bold uppercase tracking-[0.2em] mb-2">
                      {tab === 'login' ? 'Séance privée' : 'Nouveau membre'}
                    </p>
                    <h1 className="text-[2rem] leading-none font-black text-white tracking-tight">
                      {tab === 'login' ? 'Bon retour' : 'Crée ton compte'}
                    </h1>
                    <p className="text-white/40 text-sm mt-2.5">
                      {isDownloadIntent
                        ? 'Connecte-toi pour télécharger ce contenu.'
                        : tab === 'login' ? 'Reprends là où tu t\'étais arrêté.' : 'Rejoins la communauté en quelques secondes.'}
                    </p>
                  </div>

                  {/* Erreur */}
                  <AnimatePresence>
                    {displayError && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-3.5 mb-5 text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span className="flex-1">{displayError}</span>
                        <button onClick={() => setLocalError('')}><X className="w-4 h-4" /></button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Discord */}
                  <a href={`/api/auth/discord${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ''}`}>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className="w-full h-13 py-3.5 rounded-2xl flex items-center justify-center gap-3 font-semibold text-white text-sm mb-5 transition-all"
                      style={{ background: 'linear-gradient(135deg, #5865F2, #4752C4)', boxShadow: '0 8px 24px rgba(88,101,242,0.28)' }}>
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                      </svg>
                      Continuer avec Discord
                    </motion.button>
                  </a>

                  {/* Séparateur */}
                  <div className="flex items-center gap-4 mb-5">
                    <div className="flex-1 h-px bg-white/8" />
                    <span className="text-white/25 text-[10px] font-bold tracking-[0.2em]">OU PAR E-MAIL</span>
                    <div className="flex-1 h-px bg-white/8" />
                  </div>

                  {/* Tabs à indicateur glissant */}
                  <div className="relative flex p-1 rounded-2xl mb-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {(['login', 'register'] as const).map(t => (
                      <button key={t} onClick={() => { setTab(t); setLocalError('') }} className="relative flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                        {tab === t && (
                          <motion.div layoutId="authTabIndicator" transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                            className="absolute inset-0 rounded-xl" style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', boxShadow: '0 6px 16px rgba(220,38,38,0.35)' }} />
                        )}
                        <span className={`relative z-10 ${tab === t ? 'text-white' : 'text-white/45'}`}>
                          {t === 'login' ? 'Se connecter' : 'Créer un compte'}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Champs */}
                  <div className="space-y-3 mb-5">
                    <AnimatePresence>
                      {tab === 'register' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="group flex items-center gap-3 h-14 px-4 rounded-2xl transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)' }}
                            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.55)'; e.currentTarget.style.background = 'rgba(239,68,68,0.05)' }}
                            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}>
                            <User className="w-5 h-5 text-white/30 shrink-0" />
                            <input type="text" placeholder="Nom d'utilisateur" value={username} onChange={e => setUsername(e.target.value)}
                              className="flex-1 bg-transparent text-white placeholder-white/30 focus:outline-none text-sm" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="group flex items-center gap-3 h-14 px-4 rounded-2xl transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)' }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.55)'; e.currentTarget.style.background = 'rgba(239,68,68,0.05)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}>
                      <Mail className="w-5 h-5 text-white/30 shrink-0" />
                      <input type="email" placeholder="Adresse e-mail" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        className="flex-1 bg-transparent text-white placeholder-white/30 focus:outline-none text-sm" />
                    </div>

                    <div className="group flex items-center gap-3 h-14 px-4 rounded-2xl transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)' }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.55)'; e.currentTarget.style.background = 'rgba(239,68,68,0.05)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}>
                      <Lock className="w-5 h-5 text-white/30 shrink-0" />
                      <input type={showPassword ? 'text' : 'password'} placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        className="flex-1 bg-transparent text-white placeholder-white/30 focus:outline-none text-sm" />
                      <button onClick={() => setShowPassword(!showPassword)} className="text-white/30 hover:text-white/60 transition-colors shrink-0">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmit} disabled={loading}
                    className="group w-full h-14 disabled:opacity-50 rounded-2xl text-white font-bold text-[15px] flex items-center justify-center gap-2 transition-all"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', boxShadow: '0 10px 30px rgba(220,38,38,0.35)' }}>
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        {tab === 'login' ? 'Accéder à mon espace' : 'Créer mon compte'}
                        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </motion.button>

                  <p className="text-white/20 text-[11px] text-center mt-5">Connexion chiffrée de bout en bout</p>
                </motion.div>
              ) : (
                <motion.div key="verify" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.25 }}>
                  <div className="mb-3 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                      <MailCheck className="w-6 h-6 text-primary" />
                    </div>
                    <h1 className="text-2xl font-black text-white leading-tight">Vérifie ton e-mail</h1>
                  </div>
                  <p className="text-white/40 text-sm mb-7">
                    On a envoyé un code à 6 chiffres à <span className="text-white/70 font-medium">{pendingEmail}</span>. Entre-le pour activer ton compte.
                    <br />
                    <span className="text-amber-400/80">Pense à vérifier tes spams si tu ne le vois pas.</span>
                  </p>

                  <AnimatePresence>
                    {displayError && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-3.5 mb-5 text-sm">
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

                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleVerify} disabled={loading || otp.length !== 6}
                    className="group w-full h-14 disabled:opacity-50 rounded-2xl text-white font-bold text-[15px] flex items-center justify-center gap-2 transition-all"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', boxShadow: '0 10px 30px rgba(220,38,38,0.35)' }}>
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Confirmer mon compte<ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" /></>
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
        </div>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
      <LoginContent />
    </Suspense>
  )
}
