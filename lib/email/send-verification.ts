import { getMailTransporter } from './transporter'
import { renderVerificationCodeImage } from './verification-image'

export async function sendVerificationCodeEmail(to: string, code: string) {
  const imageBuffer = await renderVerificationCodeImage(code)
  const transporter = getMailTransporter()

  const html = `
    <div style="background:#000000;padding:32px 0;">
      <div style="max-width:600px;margin:0 auto;">
        <img src="cid:verification-code@streamself" width="600" alt="Code de vérification StreamSelf" style="display:block;width:100%;border-radius:12px;" />
        <p style="text-align:center;color:#666;font-size:12px;font-family:Arial,sans-serif;margin-top:16px;">
          Vous n'avez pas demandé ce code ? Vous pouvez ignorer cet e-mail.
        </p>
      </div>
    </div>
  `

  await transporter.sendMail({
    from: `"StreamSelf" <${process.env.GMAIL_USER}>`,
    to,
    subject: `${code} — Votre code de vérification StreamSelf`,
    html,
    text: `Votre code de vérification StreamSelf est : ${code} (valide 10 minutes).`,
    attachments: [
      {
        filename: 'code.png',
        content: imageBuffer,
        cid: 'verification-code@streamself',
      },
    ],
  })
}
