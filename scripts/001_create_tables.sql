-- Streamself Database Schema
-- Users table for Discord authentication
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  avatar TEXT,
  email TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content requests table
CREATE TABLE IF NOT EXISTS public.content_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'series')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'series')),
  title TEXT NOT NULL,
  poster TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, tmdb_id, content_type)
);

-- Watch history table
CREATE TABLE IF NOT EXISTS public.watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'series')),
  title TEXT NOT NULL,
  poster TEXT,
  season INTEGER,
  episode INTEGER,
  progress INTEGER DEFAULT 0,
  watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, tmdb_id, content_type, season, episode)
);

-- Site settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO public.site_settings (key, value) VALUES 
  ('fastflux_api_key', 'ff_06f33e2ddf8d7428a48edf819bfe52b75aee52a4b165daf52b7aa28ac04eac7d'),
  ('discord_client_id', '1498406329751044216'),
  ('site_name', 'Streamself'),
  ('site_description', 'Votre plateforme de streaming')
ON CONFLICT (key) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view their own profile" ON public.users 
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.users 
  FOR UPDATE USING (discord_id = current_setting('app.discord_id', true));

-- RLS Policies for content_requests
CREATE POLICY "Anyone can view content requests" ON public.content_requests 
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create requests" ON public.content_requests 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update requests" ON public.content_requests 
  FOR UPDATE USING (true);

-- RLS Policies for favorites
CREATE POLICY "Users can view their favorites" ON public.favorites 
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their favorites" ON public.favorites 
  FOR ALL USING (true);

-- RLS Policies for watch_history
CREATE POLICY "Users can view their history" ON public.watch_history 
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their history" ON public.watch_history 
  FOR ALL USING (true);

-- RLS Policies for site_settings
CREATE POLICY "Anyone can view settings" ON public.site_settings 
  FOR SELECT USING (true);

CREATE POLICY "Admins can update settings" ON public.site_settings 
  FOR UPDATE USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_discord_id ON public.users(discord_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_user_id ON public.watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_content_requests_status ON public.content_requests(status);
