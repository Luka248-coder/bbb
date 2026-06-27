-- Table pour les inscriptions en attente de vérification par code email
CREATE TABLE IF NOT EXISTS public.pending_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  code TEXT NOT NULL,
  attempts INT DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON public.pending_registrations(email);

-- Cohérent avec le reste du projet : RLS désactivée, les routes API (service role / anon) gèrent l'accès
ALTER TABLE public.pending_registrations DISABLE ROW LEVEL SECURITY;
