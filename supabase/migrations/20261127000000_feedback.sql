-- User feedback (created automatically by the app on first use; kept here for reference).
CREATE TABLE IF NOT EXISTS feedback (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  category TEXT NOT NULL CHECK (category IN ('bug', 'feature', 'general', 'ux')),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 4000),
  email TEXT CHECK (email IS NULL OR char_length(email) <= 254),
  page_path TEXT CHECK (page_path IS NULL OR char_length(page_path) <= 300),
  tool_slug TEXT CHECK (tool_slug IS NULL OR char_length(tool_slug) <= 80),
  user_agent TEXT,
  screenshot_b64 TEXT,
  screenshot_type TEXT CHECK (screenshot_type IS NULL OR screenshot_type IN ('image/png', 'image/jpeg', 'image/webp')),
  screenshot_bytes INTEGER,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'planned', 'completed', 'declined')),
  important BOOLEAN NOT NULL DEFAULT FALSE,
  admin_note TEXT CHECK (admin_note IS NULL OR char_length(admin_note) <= 2000),
  ip_hash TEXT,
  message_hash TEXT
);
CREATE INDEX IF NOT EXISTS feedback_created_idx ON feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_status_idx ON feedback (status);
CREATE INDEX IF NOT EXISTS feedback_ip_idx ON feedback (ip_hash, created_at DESC);
-- No public access: only the app (the table owner) reads and writes it.
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;;
