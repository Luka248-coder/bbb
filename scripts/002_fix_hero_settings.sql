-- Fix: policy INSERT manquante sur site_settings (nécessaire pour l'upsert du hero_mode)
CREATE POLICY IF NOT EXISTS "Allow insert on site_settings"
  ON public.site_settings FOR INSERT WITH CHECK (true);

-- Fix: policy UPSERT/UPDATE permissive sur site_settings
DROP POLICY IF EXISTS "Admins can update settings" ON public.site_settings;
CREATE POLICY "Admins can update settings"
  ON public.site_settings FOR UPDATE USING (true) WITH CHECK (true);

-- Créer la table hero_items si elle n'existe pas encore
CREATE TABLE IF NOT EXISTS public.hero_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('movie', 'tv')),
  title TEXT NOT NULL,
  poster_path TEXT,
  backdrop_path TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.hero_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Anyone can view hero items"
  ON public.hero_items FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Allow all inserts on hero_items"
  ON public.hero_items FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow all updates on hero_items"
  ON public.hero_items FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "Allow all deletes on hero_items"
  ON public.hero_items FOR DELETE USING (true);
