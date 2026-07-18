-- Add columns the dashboard/admin code expects on the courses table
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS audience TEXT,
  ADD COLUMN IF NOT EXISTS price_model TEXT DEFAULT 'per_driver_per_month',
  ADD COLUMN IF NOT EXISTS cpd_frequency TEXT DEFAULT 'quarterly',
  ADD COLUMN IF NOT EXISTS moodle_course_id INT;

-- Backfill display name from title on databases where the column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'title'
  ) THEN
    UPDATE courses
      SET name = COALESCE(name, title)
      WHERE name IS NULL OR name = '';
  END IF;
END $$;

-- Classify existing programmes by audience based on their slug
UPDATE courses
  SET audience = CASE
    WHEN slug IN ('edt', 'ettt', 'ptdp') THEN 'drivers'
    WHEN slug IN ('gfp', 'grfm') THEN 'managers'
    ELSE 'all_staff'
  END
  WHERE audience IS NULL OR audience = '';
