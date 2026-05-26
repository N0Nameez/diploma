/**
 * Helper to determine if a 3D model or animation is a system-level asset.
 * System-level assets (like the standard mannequin or default walk/dance/idle animations)
 * should not show a user creator card or link.
 */
export function isSystemAsset(item: any): boolean {
  if (!item) return false;
  if (!item.author_id) return true;
  
  const fileUrl = item.file_url || "";
  const id = item.id || "";
  
  return (
    id === "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" ||
    fileUrl.includes("mannequin.glb") ||
    fileUrl.includes("idle_clean.glb") ||
    fileUrl.includes("walk_clean.glb") ||
    fileUrl.includes("dance_clean.glb")
  );
}
