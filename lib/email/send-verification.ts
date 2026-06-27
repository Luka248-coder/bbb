import { getMailTransporter } from './transporter'
import { renderVerificationCodeImage } from './verification-image'

export async function sendVerificationCodeEmail(to: string, code: string) {
  const imageBuffer = await renderVerificationCodeImage(code)
  const transporter = getMailTransporter()

  const html = `
    <div style="background:#000000;padding:32px 0;">
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
        <img src="cid:verification-code@streamself" width="600" alt="Code de vérification StreamSelf : ${code}" style="display:block;width:100%;border-radius:12px;" />
        <p style="text-align:center;color:#aaa;font-size:14px;margin-top:20px;">
          Si l'image ne s'affiche pas, votre code de vérification est :
        </p>
        <p style="text-align:center;color:#ffffff;font-size:28px;font-weight:bold;letter-spacing:6px;margin:8px 0 20px;">
          ${code}
        </p>
        <p style="text-align:center;color:#666;font-size:12px;margin-top:16px;">
          Ce code expire dans 10 minutes. Vous n'avez pas demandé ce code ? Vous pouvez ignorer cet e-mail.
        </p>
        <p style="text-align:center;color:#444;font-size:11px;margin-top:24px;">
          StreamSelf — <a href="https://streamself.fr" style="color:#666;">streamself.fr</a>
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
