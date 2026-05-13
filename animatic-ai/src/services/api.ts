/* API client for the FastAPI backend */

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_BASE = API_URL;

/* ── Generic fetch wrapper ── */
async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/* ── Generation ── */

export async function startGeneration(
  image: File,
  style: string,
  userId: string,
  options?: {
    name?: string;
    octree_resolution?: number;
    num_steps?: number;
    guidance_scale?: number;
    enable_pbr?: boolean;
    poly_count?: string;
    quality_level?: string;
    ai_model?: string;
    category?: string;
    industry?: string;
    enable_rig?: boolean;
  },
) {
  const form = new FormData();
  form.append("image", image);
  form.append("style", style);
  form.append("user_id", userId);
  form.append("name", options?.name || "");
  form.append("octree_resolution", String(options?.octree_resolution ?? 256));
  form.append("num_steps", String(options?.num_steps ?? 30));
  form.append("guidance_scale", String(options?.guidance_scale ?? 5.5));
  form.append("enable_pbr", options?.enable_pbr !== false ? "true" : "false");
  form.append("poly_count", options?.poly_count ?? "50k");
  form.append("quality_level", options?.quality_level || "high");
  form.append("ai_model", options?.ai_model || "Hunyuan3D-1");
  form.append("category", options?.category || "Персонажи");
  form.append("industry", options?.industry || "Кинопроизводство");


  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Generation failed: ${res.status}`);
  return res.json() as Promise<{ generation_id: string; status: string }>;
}

export async function getGenerationStatus(genId: string) {
  return api<{
    id: string;
    status: "queued" | "processing" | "completed" | "failed";
    progress: number;
    result_model_id: string | null;
    error_message: string | null;
    created_at: string | null;
    completed_at: string | null;
    queue_position: number | null;
    queue_length: number | null;
    source_image_url: string | null;
    total_duration_ms: number | null;
  }>(`/api/generate/${genId}`);
}

export interface GenerationLog {
  stage: string;
  duration_ms: number;
  status: "success" | "failed";
  error_message: string | null;
  created_at: string;
}

export async function getGenerationLogs(genId: string) {
  return api<GenerationLog[]>(`/api/generate/${genId}/logs`);
}

/* ── Models ── */

export interface ApiModel {
  id: string;
  author_id: string;
  name: string;
  description: string;
  category: string;
  format: string;
  file_url: string | null;
  preview_url: string | null;
  ai_generated: boolean;
  status: string;
  downloads: number;
  likes: number;
  created_at: string;
  vertices_count?: number;
  faces_count?: number;
  license?: string;
  source_image_url?: string | null;
  industry?: string;
  user_profiles?: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export async function fetchModels(params?: {
  categories?: string[];
  formats?: string[];
  search?: string;
  sort?: string;
  ai_only?: boolean;
  limit?: number;
  offset?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.categories?.length)
    qs.set("categories", params.categories.join(","));
  if (params?.formats?.length) qs.set("formats", params.formats.join(","));
  if (params?.search) qs.set("search", params.search);
  if (params?.sort) qs.set("sort", params.sort);
  if (params?.ai_only) qs.set("ai_only", "true");
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));

  return api<{ items: ApiModel[]; total: number }>(`/api/models?${qs}`);
}

export async function fetchModel(id: string) {
  return api<ApiModel>(`/api/models/${id}`);
}

export async function downloadModel(id: string, userId?: string) {
  const form = new FormData();
  if (userId) form.append("user_id", userId);

  const res = await fetch(`${API_BASE}/api/models/${id}/download`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return res.json() as Promise<{
    file_url: string;
    name: string;
    format: string;
  }>;
}

export async function convertModel(id: string, format: string) {
  const form = new FormData();
  form.append("format", format);

  const res = await fetch(`${API_BASE}/api/models/${id}/convert`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Convert failed: ${res.status}`);
  return res.json() as Promise<{
    file_url: string;
    format: string;
    name: string;
  }>;
}

export async function publishModel(
  id: string,
  userId: string,
  licenseType: string,
) {
  const form = new FormData();
  form.append("user_id", userId);
  form.append("license_type", licenseType);

  const res = await fetch(`${API_BASE}/api/models/${id}/publish`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Publish failed: ${res.status}`);
  return res.json() as Promise<{
    id: string;
    name: string;
    license: string;
    status: string;
  }>;
}

export async function updateModel(
  id: string,
  userId: string,
  data: { name?: string; description?: string; license?: string },
) {
  const qs = new URLSearchParams();
  if (data.name) qs.set("name", data.name);
  if (data.description !== undefined) qs.set("description", data.description);
  if (data.license) qs.set("license", data.license);
  qs.set("author_id", userId);

  const res = await fetch(`${API_BASE}/api/models/${id}?${qs}`, {
    method: "PUT",
  });
  if (!res.ok) throw new Error(`Update failed: ${res.status}`);
  return res.json() as Promise<ApiModel>;
}

/* ── Animations ── */

export interface ApiAnimation {
  id: string;
  author_id: string;
  name: string;
  description: string;
  file_url: string | null;
  preview_url: string | null;
  status: string;
  downloads: number;
  likes: number;
  duration_seconds: number | null;
  created_at: string;
  user_profiles?: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export async function fetchAnimations(params?: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));

  return api<{ items: ApiAnimation[]; total: number }>(`/api/animations?${qs}`);
}

export async function fetchAnimation(id: string) {
  return api<ApiAnimation>(`/api/animations/${id}`);
}

/* ── Users ── */

export interface ApiUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string;
  total_rating: number;
  total_downloads: number;
  followers_count: number;
  following_count: number;
  credits: number;
  models_count: number;
  animations_count: number;
  subscription_status?: string | null;
  subscription_end_date?: string | null;
  subscription_days_left?: number | null;
  subscription_auto_renew?: boolean;
  created_at: string;
  updated_at?: string;
}

export async function fetchUser(id: string) {
  return api<ApiUser>(`/api/users/${id}`);
}

export async function fetchUserModels(userId: string, limit = 20) {
  return api<{ items: ApiModel[]; total: number }>(
    `/api/users/${userId}/models?limit=${limit}`,
  );
}

export async function fetchUserGenerations(userId: string, limit = 20) {
  return api<{ items: any[]; total: number }>(
    `/api/users/${userId}/generations?limit=${limit}`,
  );
}

export async function fetchUserFavorites(userId: string, limit = 20) {
  return api<{ items: ApiModel[]; total: number }>(
    `/api/users/${userId}/favorites?limit=${limit}`,
  );
}

export async function fetchUserLikedModels(userId: string, limit = 20) {
  return api<{ items: ApiModel[]; total: number }>(
    `/api/users/${userId}/liked?limit=${limit}`,
  );
}

export async function fetchUserFollowers(userId: string, limit = 50) {
  return api<{ items: ApiUser[]; total: number }>(
    `/api/users/${userId}/followers?limit=${limit}`,
  );
}

export async function fetchUserFollowing(userId: string, limit = 50) {
  return api<{ items: ApiUser[]; total: number }>(
    `/api/users/${userId}/following?limit=${limit}`,
  );
}

export async function updateUserProfile(
  userId: string,
  data: {
    display_name?: string;
    bio?: string;
    avatar_url?: string;
    cover_url?: string | null;
    cover_preset?: string;
  },
) {


  const res = await fetch(`${API_BASE}/api/users/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Update profile failed: ${res.status}`);
  }

  const result = await res.json();

  return result as Promise<ApiUser>;
}

export async function fetchUserActivity(userId: string, days = 90) {
  return api<{
    heatmap: { date: string; count: number }[];
    feed: {
      type: string;
      entity_name: string;
      entity_id: string;
      created_at: string | null;
      other_user: string | null;
    }[];
  }>(`/api/users/${userId}/activity?days=${days}`);
}

export async function toggleFollow(authorId: string, subscriberId: string) {
  const form = new FormData();
  form.append("subscriber_id", subscriberId);
  const res = await fetch(`${API_BASE}/api/users/${authorId}/follow`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Follow failed: ${res.status}`);
  return res.json() as Promise<{ is_subscribed: boolean; subscribers_count?: number }>;
}

export async function checkFollowing(authorId: string, subscriberId: string) {
  return api<{ is_following: boolean }>(
    `/api/users/${authorId}/is_following?subscriber_id=${subscriberId}`,
  );
}

export async function uploadAvatar(userId: string, file: File) {
  const ext = file.name.split(".").pop() || "png";
  const path = `${userId}/avatar.${ext}`;


  const { createClient } = await import("@supabase/supabase-js");
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const client = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await client.storage
    .from("avatars")
    .upload(path, file, { cacheControl: "3600", upsert: true });

  if (error) {
    throw error;
  }



  const {
    data: { publicUrl },
  } = client.storage.from("avatars").getPublicUrl(path);

  // Sync with auth metadata so navbar/other components see it immediately
  await client.auth.updateUser({
    data: { avatar_url: publicUrl }
  });

  return updateUserProfile(userId, { avatar_url: publicUrl });
}

export async function uploadCover(userId: string, file: File) {
  const ext = file.name.split(".").pop() || "png";
  const path = `${userId}/cover.${ext}`;


  const { createClient } = await import("@supabase/supabase-js");
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const client = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await client.storage
    .from("covers")
    .upload(path, file, { cacheControl: "3600", upsert: true });

  if (error) {
    throw error;
  }



  const {
    data: { publicUrl },
  } = client.storage.from("covers").getPublicUrl(path);


  return updateUserProfile(userId, { cover_url: publicUrl });
}

/* ── Comments ── */

export async function getComments(modelId: string) {
  return api<{ items: any[]; total: number }>(
    `/api/models/${modelId}/comments`,
  );
}

export async function addComment(
  modelId: string,
  authorId: string,
  content: string,
  parentId?: string,
) {
  const form = new FormData();
  form.append("author_id", authorId);
  form.append("content", content);
  if (parentId) form.append("parent_id", parentId);

  const res = await fetch(`${API_BASE}/api/models/${modelId}/comments`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Failed to add comment: ${res.status}`);
  return res.json();
}

export async function toggleInteraction(
  modelId: string,
  userId: string,
  type: "like" | "favorite",
) {
  const form = new FormData();
  form.append("user_id", userId);
  form.append("type", type);

  const res = await fetch(`${API_BASE}/api/models/${modelId}/interact`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Failed to toggle interaction: ${res.status}`);
  return res.json() as Promise<{ is_active: boolean; added: boolean }>;
}

export async function getInteractions(modelId: string, userId: string) {
  return api<{ is_liked: boolean; is_favorited: boolean }>(
    `/api/models/${modelId}/interactions?user_id=${userId}`,
  );
}

/* ── Credits ── */

export async function getUserCredits(userId: string) {
  return api<{
    credits: number;
    reset_date: string | null;
    expiring_soon?: boolean;
    subscription_days_left?: number;
    subscription_auto_renew?: boolean;
  }>(`/api/users/${userId}/credits`);
}

export async function cancelSubscription(userId: string) {
  return api<{ status: string; message: string }>("/api/subscriptions/cancel", {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function toggleAutoRenew(userId: string, autoRenew: boolean) {
  return api<{ status: string; auto_renew: boolean }>(
    "/api/subscriptions/toggle-auto-renew",
    {
      method: "POST",
      body: JSON.stringify({ user_id: userId, auto_renew: autoRenew }),
    },
  );
}

export async function deductCredits(userId: string, amount = 3) {
  return api<{ credits: number }>(`/api/users/${userId}/credits/deduct`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  });
}

/* ── Health check ── */

export async function healthCheck() {
  return api<{ status: string; timestamp: string }>("/api/health");
}

/* ── Platform stats for dashboard ── */

export async function getPlatformStats() {
  return api<{ models: number; animations: number; authors: number }>(
    "/api/stats"
  );
}
export interface CatalogStats {
  tags: {
    id: string;
    name: string;
    tag_type: string;
    models_count: number;
    animations_count: number;
  }[];
  formats: Record<string, number>;
  ai_generated_count: number;
}

export async function fetchCatalogStats() {
  return api<CatalogStats>("/api/stats/catalog");
}

export interface ApiTag {
  id: string;
  name: string;
  tag_type: "type" | "industry";
  slug: string;
}

export async function fetchTags(tagType?: "type" | "industry") {
  const qs = tagType ? `?tag_type=${tagType}` : "";
  return api<ApiTag[]>(`/api/tags${qs}`);
}

