import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LOGO_STORAGE_BUCKET } from '@/config/constants';

/**
 * POST /api/storage/logo
 *
 * Uploads a logo file to the storage bucket.
 * Returns the public URL of the uploaded file.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;

  const { error } = await supabase.storage
    .from(LOGO_STORAGE_BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to upload logo' },
      { status: 500 },
    );
  }

  const { data: urlData } = supabase.storage
    .from(LOGO_STORAGE_BUCKET)
    .getPublicUrl(fileName);

  return NextResponse.json({ publicUrl: urlData.publicUrl });
}

/**
 * DELETE /api/storage/logo
 *
 * Deletes a logo file from the storage bucket.
 * Expects JSON body: { path: string }
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { path } = await request.json();

  if (!path || typeof path !== 'string') {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const { error } = await supabase.storage
    .from(LOGO_STORAGE_BUCKET)
    .remove([path]);

  if (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete logo' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
