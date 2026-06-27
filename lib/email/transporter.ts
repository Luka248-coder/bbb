import nodemailer from 'nodemailer'

let cachedTransporter: nodemailer.Transporter | null = null

/**
 * Transporteur d'email, réutilisé entre les invocations (warm lambda).
 *
 * Priorité à Resend (RESEND_API_KEY) : meilleure délivrabilité car les mails
 * sont envoyés via un domaine authentifié (SPF/DKIM/DMARC), au lieu d'un
 * compte Gmail personnel qui n'a aucune réputation d'envoi et finit
 * systématiquement en spam.
 *
 * Si RESEND_API_KEY n'est pas défini, on retombe sur Gmail (GMAIL_USER +
 * GMAIL_APP_PASSWORD) pour ne pas casser ce qui marche déjà pendant la transition.
 */
export function getMailTransporter() {
  if (cachedTransporter) return cachedTransporter

  if (process.env.RESEND_API_KEY) {
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: { user: 'resend', pass: process.env.RESEND_API_KEY },
    })
    return cachedTransporter
  }

  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD

  if (!user || !pass) {
    throw new Error(
      'Aucune config email trouvée : définis soit RESEND_API_KEY (recommandé), soit GMAIL_USER + GMAIL_APP_PASSWORD.',
    )
  }

  cachedTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })

  return cachedTransporter
}
