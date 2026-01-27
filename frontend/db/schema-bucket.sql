-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logo',
  'logo',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;

-- Allow anyone to upload files to logo bucket
CREATE POLICY "Allow public uploads"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'logo');

-- Allow anyone to read files from logo bucket
CREATE POLICY "Allow public reads"
ON storage.objects
FOR SELECT
USING (bucket_id = 'logo');

-- Allow anyone to update files in logo bucket (needed for upsert)
CREATE POLICY "Allow public updates"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'logo')
WITH CHECK (bucket_id = 'logo');

-- Allow anyone to delete files from logo bucket
CREATE POLICY "Allow public deletes"
ON storage.objects
FOR DELETE
USING (bucket_id = 'logo');
