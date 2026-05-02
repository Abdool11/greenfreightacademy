-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: GFA Video Library + Bulletin WhatsApp notification fields
-- Date: 2026-05-02
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. GFA Video Library
-- Stores metadata for all Bunny.net-hosted videos managed by GFA admin.
-- video_type: invite | teaser | portal_walkthrough | module
-- upload_status: pending | processing | ready | error

CREATE TABLE IF NOT EXISTS gfa_videos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  description       TEXT,
  video_type        TEXT NOT NULL CHECK (video_type IN ('invite', 'teaser', 'portal_walkthrough', 'module')),
  bunny_video_id    TEXT,
  bunny_library_id  TEXT,
  playback_url      TEXT,
  thumbnail_url     TEXT,
  duration_seconds  INTEGER,
  language          TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'zu', 'af')),
  programme         TEXT,          -- null = general; 'p1', 'p2', etc.
  is_public         BOOLEAN NOT NULL DEFAULT FALSE,
  upload_status     TEXT NOT NULL DEFAULT 'pending'
                    CHECK (upload_status IN ('pending', 'processing', 'ready', 'error')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: only GFA admins can read/write
ALTER TABLE gfa_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gfa_admins_manage_videos"
  ON gfa_videos
  FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE);

-- Index for type + language filtering
CREATE INDEX IF NOT EXISTS idx_gfa_videos_type_lang ON gfa_videos (video_type, language);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Bulletin campaigns — add notification_fields column
-- Stores which WhatsApp fields the operator selected when disseminating.

ALTER TABLE bulletin_campaigns
  ADD COLUMN IF NOT EXISTS notification_fields JSONB;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Bulletins — add whatsapp_notification_fields column
-- Persists the field selection on the bulletin record itself for reporting.

ALTER TABLE bulletins
  ADD COLUMN IF NOT EXISTS whatsapp_notification_fields JSONB;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Training campaigns — add invite_video_id column
-- Links a campaign to a GFA video library entry for the invite video.

ALTER TABLE training_campaigns
  ADD COLUMN IF NOT EXISTS invite_video_id UUID REFERENCES gfa_videos(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Driver invitations — add invite_video_url column
-- Denormalised for fast lookup at magic link resolution time.
-- Populated from gfa_videos.playback_url when the invitation is created.

ALTER TABLE driver_invitations
  ADD COLUMN IF NOT EXISTS invite_video_url TEXT;
