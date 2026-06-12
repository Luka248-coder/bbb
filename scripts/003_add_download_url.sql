-- Migration: ajout de la colonne download_url
-- À exécuter dans Supabase SQL Editor

ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS download_url TEXT;
ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS download_url TEXT;
