-- ═══════════════════════════════════════════════════════════════
-- Migration 005 : Système de profils
-- ═══════════════════════════════════════════════════════════════

-- Table des profils (plusieurs profils par compte)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,               -- URL image avatar
  avatar_tmdb_id INTEGER,        -- TMDB ID de l'anime source
  pin TEXT,                      -- Code PIN hashé (4 chiffres), NULL = pas de PIN
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'staff', 'admin')),
  is_child BOOLEAN DEFAULT FALSE,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ajouter profile_id aux tables existantes
ALTER TABLE public.favorites ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.watch_history ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Index
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_profile_id ON public.favorites(profile_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_profile_id ON public.watch_history(profile_id);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- Table pour les avatars disponibles (issus des animes)
CREATE TABLE IF NOT EXISTS public.profile_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  character_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profile_avatars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_profile_avatars" ON public.profile_avatars FOR ALL USING (true) WITH CHECK (true);
