import type { KVNamespace, R2Bucket } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    KV: KVNamespace;
    PREROLL_BUCKET: R2Bucket;
    ADMIN_PASSWORD?: string;
  }
}
