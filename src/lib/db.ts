// Back-compat barrel: los call sites importan Program/RotativeRate/getPrograms
// desde '@/lib/db'. Las implementaciones sobre D1 viven en './programs' y
// './settings'.
export type { Program } from './programs';
export { getPrograms, savePrograms, DEFAULT_PROGRAMS } from './programs';
export type { RotativeRate, DurationRate, WhatsappNumbers, StreamConfig, SiteSettings } from './settings';
export {
  getRotativeRates,
  saveRotativeRates,
  DEFAULT_ROTATIVE_RATES,
  getWhatsappNumbers,
  saveWhatsappNumbers,
  getStreamConfig,
  saveStreamConfig,
  getSiteSettings,
} from './settings';
