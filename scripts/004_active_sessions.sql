-- Table pour tracker les sessions actives (IP + géoloc + contenu en cours)
CREATE TABLE IF NOT EXISTS public.active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip TEXT NOT NULL,
  city TEXT,
  country TEXT,
  region TEXT,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  username TEXT,
  content_type TEXT CHECK (content_type IN ('movie', 'series')),
  tmdb_id INTEGER,
  title TEXT,
  poster TEXT,
  season INTEGER,
  episode INTEGER,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_active_sessions_ip ON public.active_sessions(ip);
CREATE INDEX IF NOT EXISTS idx_active_sessions_last_seen ON public.active_sessions(last_seen DESC);

-- Table historique IP (persistant même après déconnexion)
CREATE TABLE IF NOT EXISTS public.ip_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip TEXT NOT NULL,
  city TEXT,
  country TEXT,
  region TEXT,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  username TEXT,
  content_type TEXT,
  tmdb_id INTEGER,
  title TEXT,
  poster TEXT,
  season INTEGER,
  episode INTEGER,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_history_ip ON public.ip_history(ip);
CREATE INDEX IF NOT EXISTS idx_ip_history_viewed_at ON public.ip_history(viewed_at DESC);

-- Désactiver RLS pour ces tables (accès admin uniquement via service role)
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_history ENABLE ROW LEVEL SECURITY;

-- Policy : lecture/écriture pour tout le monde (le filtrage admin se fait côté API)
CREATE POLICY "allow_all_active_sessions" ON public.active_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_ip_history" ON public.ip_history FOR ALL USING (true) WITH CHECK (true);
