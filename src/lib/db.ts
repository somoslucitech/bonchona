// Back-compat barrel: existing call sites import Program/RotativeRate/getPrograms/etc.
// from '@/lib/db'. The actual D1-backed implementations now live in
// './programs' and './settings'.
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
