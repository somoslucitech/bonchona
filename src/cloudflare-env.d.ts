import type { KVNamespace, R2Bucket, D1Database } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    KV: KVNamespace; // retained as a rollback reference after the D1 migration
    DB: D1Database;
    PREROLL_BUCKET: R2Bucket;
    IMAGES_BUCKET: R2Bucket;
    DEMOS_BUCKET: R2Bucket;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    AUTH_SECRET?: string;
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
    SITE_URL?: string;
    /** Base del worker del chat en vivo (workers/chat). Sin barra final. */
    CHAT_WORKER_URL?: string;
    TURNSTILE_SECRET_KEY?: string;
  }
}
