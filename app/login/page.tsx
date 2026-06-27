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
    <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-sm">

        {/* Back */}
        {step === 'form' ? (
          <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white/80 mb-8 transition-colors text-sm">
            ← Retour à l'accueil
          </Link>
        ) : (
          <button onClick={() => { setStep('form'); setLocalError('') }} className="inline-flex items-center gap-2 text-white/40 hover:text-white/80 mb-8 transition-colors text-sm">
            ← Modifier mes informations
          </button>
        )}

        <AnimatePresence mode="wait">
          {step === 'form' ? (
            <motion.div key="form" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
              {/* Title */}
              <div className="mb-8">
                <h1 className="text-4xl font-black text-white mb-2">
                  {tab === 'login' ? 'Bon retour' : 'Rejoindre l\'élite'}
                </h1>
                <p className="text-white/40 text-sm">
                  {isDownloadIntent
                    ? 'Connectez-vous pour télécharger ce contenu.'
                    : tab === 'login' ? 'Connectez-vous pour continuer votre session.' : 'Créez votre compte en quelques secondes.'}
                </p>
              </div>

              {/* Error */}
              <AnimatePresence>
                {displayError && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-4 mb-6 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{displayError}</span>
                    <button onClick={() => setLocalError('')} className="ml-auto"><X className="w-4 h-4" /></button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Discord button */}
              <Link href={`/api/auth/discord${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ''}`}>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-semibold text-white text-base mb-6 transition-all"
                  style={{ background: 'linear-gradient(135deg, #5865F2, #4752C4)' }}>
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                  Continuer avec Discord
                </motion.button>
              </Link>

              {/* Divider */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-white/30 text-xs font-medium tracking-widest">OU AVEC L'EMAIL</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Tab switcher */}
              <div className="flex bg-white/5 rounded-2xl p-1 mb-6 border border-white/10">
                {(['login', 'register'] as const).map(t => (
                  <button key={t} onClick={() => { setTab(t); setLocalError('') }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      tab === t ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white/70'
                    }`}>
                    {t === 'login' ? 'Se connecter' : 'Créer un compte'}
                  </button>
                ))}
              </div>

              {/* Fields */}
              <div className="space-y-3 mb-4">
                <AnimatePresence>
                  {tab === 'register' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                        <input
                          type="text"
                          placeholder="Nom d'utilisateur"
                          value={username}
                          onChange={e => setUsername(e.target.value)}
                          className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:bg-white/8 transition-all text-sm"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  <input
                    type="email"
                    placeholder="Adresse e-mail"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:bg-white/8 transition-all text-sm"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mot de passe"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-12 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:bg-white/8 transition-all text-sm"
                  />
                  <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={loading}
                className="w-full h-14 bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {tab === 'login' ? 'Accéder à mon espace' : 'Créer mon compte'}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>

              <p className="text-white/20 text-xs text-center mt-6">Connexion chiffrée de bout en bout</p>
            </motion.div>
          ) : (
            <motion.div key="verify" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
              {/* Title */}
              <div className="mb-2 flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                  <MailCheck className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-white">Vérifiez votre e-mail</h1>
                </div>
              </div>
              <p className="text-white/40 text-sm mb-8">
                On a envoyé un code à 6 chiffres à <span className="text-white/70">{pendingEmail}</span>. Entrez-le ci-dessous pour activer votre compte.
              </p>

              {/* Error */}
              <AnimatePresence>
                {displayError && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-4 mb-6 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{displayError}</span>
                    <button onClick={() => setLocalError('')} className="ml-auto"><X className="w-4 h-4" /></button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-center mb-8">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  onComplete={handleVerify}
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map(i => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="w-12 h-14 text-lg bg-white/5 border-white/10 text-white first:rounded-xl last:rounded-xl rounded-xl mx-1 border"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {/* Submit */}
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleVerify}
                disabled={loading || otp.length !== 6}
                className="w-full h-14 bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Confirmer mon compte
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>

              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || resending}
                className="w-full flex items-center justify-center gap-2 text-white/40 hover:text-white/70 disabled:opacity-40 text-sm mt-6 transition-colors"
              >
                <RotateCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
                {resendCooldown > 0 ? `Renvoyer le code (${resendCooldown}s)` : 'Renvoyer le code'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
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
