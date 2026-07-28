import { getCloudflareContext } from "@opennextjs/cloudflare";

// Safe helper to obtain Cloudflare env bindings. Returns null outside the
// Workers runtime (e.g. plain `next dev`), so callers can fall back gracefully.
export function getCloudflareEnv(): CloudflareEnv | null {
  try {
    const context = getCloudflareContext();
    return context?.env ?? null;
  } catch {
    return null;
  }
}
