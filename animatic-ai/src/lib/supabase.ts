import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

// Временно без строгой типизации Database
export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper для загрузки файлов
export async function uploadFile(
  file: File,
  bucket:
    | "generation-inputs"
    | "models"
    | "animations"
    | "previews"
    | "avatars",
  path: string,
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return { url: publicUrl, path };
}

// Helper для получения публичного URL
export function getPublicUrl(bucket: string, path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
