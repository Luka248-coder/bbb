import nodemailer from 'nodemailer'

let cachedTransporter: nodemailer.Transporter | null = null

/**
 * Transporteur SMTP Gmail, réutilisé entre les invocations (warm lambda).
 * Nécessite GMAIL_USER + GMAIL_APP_PASSWORD dans les variables d'environnement.
 * GMAIL_APP_PASSWORD doit être un "mot de passe d'application" généré depuis
 * https://myaccount.google.com/apppasswords (le mot de passe normal du compte
 * ne fonctionne pas avec le SMTP de Gmail si la validation en 2 étapes est activée,
 * et Google bloque de plus en plus les connexions par mot de passe simple).
 */
export function getMailTransporter() {
  if (cachedTransporter) return cachedTransporter

  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD

  if (!user || !pass) {
    throw new Error(
      'GMAIL_USER et GMAIL_APP_PASSWORD doivent être définis dans les variables d\'environnement.',
    )
  }

  cachedTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })

  return cachedTransporter
}
