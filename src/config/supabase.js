import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

export const supabase =
  env.supabaseUrl && env.supabaseServiceKey
    ? createClient(env.supabaseUrl, env.supabaseServiceKey)
    : null;

export async function uploadFile(bucket, path, buffer, contentType) {
  if (!supabase) {
    return { path, previewUrl: null, skipped: true };
  }

  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    upsert: true,
    contentType,
  });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  return { path, previewUrl: signed?.signedUrl || null };
}

export async function getSignedUrl(bucket, path, expiresIn = 3600) {
  if (!supabase || !path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  return data?.signedUrl || null;
}
