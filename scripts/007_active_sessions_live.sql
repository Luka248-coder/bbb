-- Garantit un identifiant unique par visiteur (IP) pour le suivi live admin
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_sessions_ip_unique ON public.active_sessions (ip);

ALTER TABLE public.active_sessions ADD COLUMN IF NOT EXISTS page TEXT;
ALTER TABLE public.active_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
