import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";

// Sin estos overrides los tres caches caen a "dummy": `export const revalidate`
// queda inerte y cada `revalidatePath()` es un no-op. Bindings requeridos en
// wrangler.json: NEXT_INC_CACHE_R2_BUCKET, NEXT_TAG_CACHE_D1 y el service
// binding WORKER_SELF_REFERENCE (que la memory queue usa para auto-invocarse).
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: d1NextTagCache,
  queue: memoryQueue,
});
