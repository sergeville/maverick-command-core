import { Telemetry } from '@/types/obd';

export function parseElmFrame(raw: string, prev: Telemetry): Partial<Telemetry> | null {
  const cleaned = raw.replace(/\s|>/g, '').toUpperCase();
  if (!cleaned.includes('41')) return null;

  try {
    if (cleaned.startsWith('410C') && cleaned.length >= 8) {
      const a = parseInt(cleaned.slice(4, 6), 16);
      const b = parseInt(cleaned.slice(6, 8), 16);
      return { rpm: Math.round(((a * 256) + b) / 4) };
    }
    if (cleaned.startsWith('410D') && cleaned.length >= 6) {
      return { speed: parseInt(cleaned.slice(4, 6), 16) };
    }
    if (cleaned.startsWith('4104') && cleaned.length >= 6) {
      return { load: Math.round((parseInt(cleaned.slice(4, 6), 16) * 100) / 255) };
    }
    if (cleaned.startsWith('4105') && cleaned.length >= 6) {
      return { coolant: parseInt(cleaned.slice(4, 6), 16) - 40 };
    }
    if (cleaned.startsWith('4111') && cleaned.length >= 6) {
      return { throttle: Math.round((parseInt(cleaned.slice(4, 6), 16) * 100) / 255) };
    }
    if (cleaned.startsWith('4142') && cleaned.length >= 8) {
      const a = parseInt(cleaned.slice(4, 6), 16);
      const b = parseInt(cleaned.slice(6, 8), 16);
      return { voltage: Number((((256 * a) + b) / 1000).toFixed(1)) };
    }
  } catch {
    // ignore malformed fragments
  }
  return null;
}
