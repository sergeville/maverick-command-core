export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatTime(date: Date): string {
  return `${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
}

export function parseHexByte(hex: string, offset: number): number {
  return parseInt(hex.slice(offset, offset + 2), 16);
}

/** Fuel efficiency in L/100km. Returns null if speed is too low. */
export function calcEfficiency(fuelRate: number, speed: number): string {
  if (speed < 5) return '—';
  return ((fuelRate / Math.max(speed, 1)) * 100).toFixed(1);
}
