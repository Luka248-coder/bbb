-- Historique et support pour les visiteurs non connectés (clé = IP)

ALTER TABLE public.watch_history
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.watch_history
  ADD COLUMN IF NOT EXISTS ip TEXT;

CREATE INDEX IF NOT EXISTS idx_watch_history_ip
  ON public.watch_history (ip, tmdb_id, content_type);

ALTER TABLE public.support_tickets
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS ip TEXT;

CREATE INDEX IF NOT EXISTS idx_support_tickets_ip
  ON public.support_tickets (ip);

ALTER TABLE public.support_messages
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS ip TEXT;
