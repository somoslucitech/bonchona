import type { R2Bucket, D1Database } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
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
    /**
     * Clave PUBLICA del widget. Va aqui y no como NEXT_PUBLIC_ porque esas se
     * incrustan en tiempo de build y no se podrian configurar desde el panel.
     */
    TURNSTILE_SITE_KEY?: string;
    /** Clave SECRETA del widget. Se configura como secreto, nunca en el repo. */
    TURNSTILE_SECRET?: string;
    /** Hostnames aceptados en la respuesta de siteverify, separados por coma. */
    TURNSTILE_HOSTNAMES?: string;
    /** Limitador nativo de Workers. Puede faltar si el entorno no lo soporta. */
    CHAT_TICKET_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
  }
}
