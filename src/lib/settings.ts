import { getCloudflareEnv } from "./cf-env";

export interface DurationRate {
  time: string;
  price: number;
}

export interface RotativeRate {
  freq: string;
  durations: DurationRate[];
}

export const DEFAULT_ROTATIVE_RATES: RotativeRate[] = [
  { freq: "6 veces al día", durations: [
    { time: "20s", price: 200 },
    { time: "30s", price: 270 },
    { time: "40s", price: 330 },
    { time: "1m", price: 380 }
  ]},
  { freq: "8 veces al día", durations: [
    { time: "20s", price: 270 },
    { time: "30s", price: 360 },
    { time: "40s", price: 440 },
    { time: "1m", price: 510 }
  ]},
  { freq: "10 veces al día", durations: [
    { time: "20s", price: 340 },
    { time: "30s", price: 450 },
    { time: "40s", price: 550 },
    { time: "1m", price: 640 }
  ]}
];

export interface WhatsappNumbers {
  songRequest: string;
  advertising: string;
}

export const DEFAULT_WHATSAPP: WhatsappNumbers = {
  songRequest: "584144001071",
  advertising: "584244001367",
};

export interface StreamConfig {
  streamUrl: string;
  metadataUrl: string;
}

export const DEFAULT_STREAM: StreamConfig = {
  streamUrl: "https://radio.bonchonaradio.com:8443/stream",
  metadataUrl: "https://radio.bonchonaradio.com:8443/status-json.xsl",
};

export interface SiteSettings {
  whatsappSongRequest: string;
  whatsappAdvertising: string;
  streamUrl: string;
  streamMetadataUrl: string;
}

interface LocalFileDbInfo {
  fs: typeof import('fs');
  filePath: string;
}

async function getLocalFileDb(): Promise<LocalFileDbInfo | null> {
  if (typeof window === 'undefined' && process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'local_db.json');
      return { fs, filePath };
    } catch {
      return null;
    }
  }
  return null;
}

const memoryStore: Record<string, unknown> = {};

async function writeLocalSetting<T>(key: string, value: T): Promise<boolean> {
  const localDb = await getLocalFileDb();
  if (!localDb) return false;
  const { fs, filePath } = localDb;
  let db: Record<string, unknown> = {};
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content && content.trim()) db = JSON.parse(content);
    } catch {}
  }
  db[key] = value;
  try {
    fs.writeFileSync(filePath, JSON.stringify(db, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error("Error writing local db file:", e);
    return false;
  }
}

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const env = getCloudflareEnv();
  if (env?.DB) {
    try {
      const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first<{ value: string }>();
      if (row?.value) return JSON.parse(row.value) as T;
      await setSetting(key, fallback);
      return fallback;
    } catch (e) {
      console.warn(`D1 no disponible para "${key}", usando fallback local:`, e);
    }
  }

  const localDb = await getLocalFileDb();
  if (localDb) {
    const { fs, filePath } = localDb;
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content && content.trim()) {
          const db = JSON.parse(content);
          if (db[key] !== undefined) return db[key] as T;
        }
      } catch (e) {
        console.error("Error reading local db file:", e);
      }
    }
    await writeLocalSetting(key, fallback);
    return fallback;
  }

  if (memoryStore[key] !== undefined) return memoryStore[key] as T;
  return fallback;
}

async function setSetting<T>(key: string, value: T): Promise<boolean> {
  const env = getCloudflareEnv();
  if (env?.DB) {
    try {
      await env.DB.prepare(
        "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
      ).bind(key, JSON.stringify(value), Date.now()).run();
      return true;
    } catch (e) {
      console.error(`Error saving setting "${key}" to D1:`, e);
      return false;
    }
  }

  const localDb = await getLocalFileDb();
  if (localDb) return writeLocalSetting(key, value);

  memoryStore[key] = value;
  return true;
}

export async function getRotativeRates(): Promise<RotativeRate[]> {
  return getSetting("rotative_rates", DEFAULT_ROTATIVE_RATES);
}

export async function saveRotativeRates(rates: RotativeRate[]): Promise<boolean> {
  return setSetting("rotative_rates", rates);
}

export async function getWhatsappNumbers(): Promise<WhatsappNumbers> {
  const [songRequest, advertising] = await Promise.all([
    getSetting("whatsapp_song_request", DEFAULT_WHATSAPP.songRequest),
    getSetting("whatsapp_advertising", DEFAULT_WHATSAPP.advertising),
  ]);
  return { songRequest, advertising };
}

export async function saveWhatsappNumbers(numbers: WhatsappNumbers): Promise<boolean> {
  const [a, b] = await Promise.all([
    setSetting("whatsapp_song_request", numbers.songRequest),
    setSetting("whatsapp_advertising", numbers.advertising),
  ]);
  return a && b;
}

export async function getStreamConfig(): Promise<StreamConfig> {
  const [streamUrl, metadataUrl] = await Promise.all([
    getSetting("stream_url", DEFAULT_STREAM.streamUrl),
    getSetting("stream_metadata_url", DEFAULT_STREAM.metadataUrl),
  ]);
  return { streamUrl, metadataUrl };
}

export async function saveStreamConfig(config: StreamConfig): Promise<boolean> {
  const [a, b] = await Promise.all([
    setSetting("stream_url", config.streamUrl),
    setSetting("stream_metadata_url", config.metadataUrl),
  ]);
  return a && b;
}

// --- Cola de publicación de noticias ---------------------------------------
// Vive en la tabla `settings` para poder ajustarse desde el admin sin deploy.

export interface QueueConfigSetting {
  slotHours: number[];
  horizonDays: number;
}

export const DEFAULT_QUEUE_SETTING: QueueConfigSetting = {
  slotHours: [8, 13, 19], // hora de Venezuela (UTC-4)
  horizonDays: 7,
};

export async function getQueueConfig(): Promise<QueueConfigSetting> {
  const raw = await getSetting("news_queue", DEFAULT_QUEUE_SETTING);
  const slotHours = Array.isArray(raw?.slotHours)
    ? raw.slotHours.filter((h) => Number.isInteger(h) && h >= 0 && h <= 23)
    : DEFAULT_QUEUE_SETTING.slotHours;
  const horizonDays =
    Number.isFinite(raw?.horizonDays) && raw.horizonDays > 0 && raw.horizonDays <= 60
      ? raw.horizonDays
      : DEFAULT_QUEUE_SETTING.horizonDays;
  return {
    slotHours: slotHours.length ? slotHours : DEFAULT_QUEUE_SETTING.slotHours,
    horizonDays,
  };
}

export async function saveQueueConfig(config: QueueConfigSetting): Promise<boolean> {
  return setSetting("news_queue", config);
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const [whatsapp, stream] = await Promise.all([getWhatsappNumbers(), getStreamConfig()]);
  return {
    whatsappSongRequest: whatsapp.songRequest,
    whatsappAdvertising: whatsapp.advertising,
    streamUrl: stream.streamUrl,
    streamMetadataUrl: stream.metadataUrl,
  };
}
