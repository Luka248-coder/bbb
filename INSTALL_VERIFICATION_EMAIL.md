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

À ajouter en local (`.env.local`) **et** dans Vercel (Project Settings → Environment Variables) :

```
GMAIL_USER=cine.streamself@gmail.com
GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
```

⚠️ **Important** : `GMAIL_APP_PASSWORD` doit être un **mot de passe d'application** Google (16 caractères, sans tirets), pas le mot de passe normal du compte. Gmail refuse l'authentification SMTP classique. Pour le générer :
1. Active la validation en 2 étapes sur le compte `cine.streamself@gmail.com` (si pas déjà fait)
2. Va sur https://myaccount.google.com/apppasswords
3. Crée un mot de passe d'application "Mail" → copie le code généré → c'est cette valeur qui va dans `GMAIL_APP_PASSWORD`

Le mot de passe que tu m'as donné dans le chat (`nebwur-xanxez-kUrno2`) ressemble à un mot de passe de compte classique, pas à un mot de passe d'application Google — il ne fonctionnera probablement pas tel quel avec le SMTP Gmail.

## 5. Comment ça marche

1. `POST /api/auth/register` ne crée plus le compte tout de suite : il stocke l'inscription dans `pending_registrations` avec un code à 6 chiffres (10 min de validité) et envoie l'e-mail avec l'image générée à la volée.
2. Le front (`/login`, onglet "Créer un compte") passe automatiquement à un écran de saisie du code (composant OTP déjà présent dans le projet).
3. `POST /api/auth/verify-email` vérifie le code → crée enfin le vrai compte dans `users` → ouvre la session.
4. `POST /api/auth/resend-code` permet de renvoyer un code (bouton avec cooldown de 45s côté front).
5. Max 5 tentatives de code, après quoi il faut redemander un envoi.

## 6. L'image envoyée par e-mail

Générée dynamiquement (next/og — Satori) à chaque envoi, donc toujours avec le bon code : logo (sans fond blanc), cadre avec les 6 chiffres en bleu `#0068FF` (comme ton image de référence), confettis argentés/pailletés tout autour, "streamself.fr" en petit en bas. Aucune dépendance externe à l'exécution (police + logo sont inclus dans `assets/`).

Aperçu joint : `apercu-code-verification.png`.
