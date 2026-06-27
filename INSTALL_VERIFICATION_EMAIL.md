# Vérification par code e-mail — Installation

## 1. Fichiers à copier dans `bbb`

Dépose ces fichiers/dossiers dans ton repo en respectant l'arborescence (ils remplacent ou s'ajoutent) :

```
app/api/auth/register/route.ts        (remplacé)
app/api/auth/verify-email/route.ts    (nouveau)
app/api/auth/resend-code/route.ts     (nouveau)
app/login/page.tsx                    (remplacé)
lib/email/transporter.ts              (nouveau)
lib/email/verification-image.tsx      (nouveau)
lib/email/send-verification.ts        (nouveau)
lib/email/code.ts                     (nouveau)
assets/fonts/Poppins-600.woff         (nouveau)
assets/fonts/Poppins-700.woff         (nouveau)
assets/fonts/Poppins-900.woff         (nouveau)
assets/logo-transparent.png           (nouveau — logo sans fond blanc, pour l'image du mail)
scripts/006_pending_registrations.sql (nouveau)
package.json                          (remplacé — ajout de nodemailer)
```

## 2. Installer la dépendance

```bash
pnpm install
```
(ajoute `nodemailer` + `@types/nodemailer`, déjà dans le `package.json` fourni)

## 3. Base de données Supabase

Exécute `scripts/006_pending_registrations.sql` dans le SQL editor de Supabase. Ça crée la table `pending_registrations` (inscriptions en attente de code, RLS désactivée comme le reste du projet).

## 4. Variables d'environnement

### Option recommandée : Resend (bonne délivrabilité, gratuit jusqu'à 3000 mails/mois)

1. Crée un compte sur https://resend.com
2. **Domains** → ajoute `streamself.fr` → Resend te donne 2-3 enregistrements DNS (SPF, DKIM, parfois DMARC)
3. Ajoute ces enregistrements chez ton registrar / fournisseur DNS (OVH, Cloudflare...). La vérification peut prendre de quelques minutes à quelques heures.
4. **API Keys** → crée une clé → copie-la
5. Dans Vercel (Project Settings → Environment Variables), ajoute :
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   MAIL_FROM=verification@streamself.fr
   ```
   (`MAIL_FROM` doit être une adresse sur le domaine que tu viens de vérifier dans Resend, ex: `verification@streamself.fr` ou `noreply@streamself.fr` — pas besoin que la boîte existe réellement, Resend l'envoie pour toi)
6. Redéploie (Deployments → ... → Redeploy)

Une fois `RESEND_API_KEY` défini, il prend automatiquement le dessus sur Gmail — pas besoin de retirer les variables Gmail.

### Option de secours : Gmail (déjà en place, mais finit souvent en spam)

```
GMAIL_USER=cine.streamself@gmail.com
GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
```

⚠️ **Important** : `GMAIL_APP_PASSWORD` doit être un **mot de passe d'application** Google (16 caractères, sans tirets), pas le mot de passe normal du compte. Gmail refuse l'authentification SMTP classique. Pour le générer :
1. Active la validation en 2 étapes sur le compte `cine.streamself@gmail.com` (si pas déjà fait)
2. Va sur https://myaccount.google.com/apppasswords
3. Crée un mot de passe d'application "Mail" → copie le code généré → c'est cette valeur qui va dans `GMAIL_APP_PASSWORD`

Même bien configuré, un compte Gmail perso a une réputation d'envoi proche de zéro : les mails finissent quasi systématiquement en spam au début, peu importe le contenu. C'est une limite structurelle de Gmail SMTP, pas un bug du code. → Resend reste la vraie solution si la délivrabilité doit être fiable.

## 5. Comment ça marche

1. `POST /api/auth/register` ne crée plus le compte tout de suite : il stocke l'inscription dans `pending_registrations` avec un code à 6 chiffres (10 min de validité) et envoie l'e-mail avec l'image générée à la volée.
2. Le front (`/login`, onglet "Créer un compte") passe automatiquement à un écran de saisie du code (composant OTP déjà présent dans le projet).
3. `POST /api/auth/verify-email` vérifie le code → crée enfin le vrai compte dans `users` → ouvre la session.
4. `POST /api/auth/resend-code` permet de renvoyer un code (bouton avec cooldown de 45s côté front).
5. Max 5 tentatives de code, après quoi il faut redemander un envoi.

## 6. L'image envoyée par e-mail

Générée dynamiquement (next/og — Satori) à chaque envoi, donc toujours avec le bon code : logo (sans fond blanc), cadre avec les 6 chiffres en bleu `#0068FF` (comme ton image de référence), confettis argentés/pailletés tout autour, "streamself.fr" en petit en bas. Aucune dépendance externe à l'exécution (police + logo sont inclus dans `assets/`).

Aperçu joint : `apercu-code-verification.png`.
