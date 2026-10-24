export const ID = 'dsh-amber-glass-theme';
export const BASE = `/plugins/${ID}`;
export const WORKSHOP_ID = '3808236079';
export const DEFAULTS = Object.freeze({
  enabled: true,
  backgroundFile: '',
  backgroundOpacity: 1,
  backgroundBrightness: 0.95,
  scrim: 0.16,
  panelOpacity: 0.68,
  sidebarOpacity: 0.22,
  blur: 18,
  radius: 14,
  borderOpacity: 0.16
});
export const READABLE = Object.freeze({
  backgroundOpacity: 0.48, backgroundBrightness: 0.7, scrim: 0.25,
  panelOpacity: 0.92, sidebarOpacity: 0.9, blur: 24,
  radius: 14, borderOpacity: 0.18
});
const ranges = {
  backgroundOpacity: [0, 1], backgroundBrightness: [0.3, 1.2],
  scrim: [0, 0.8], panelOpacity: [0.1, 1], sidebarOpacity: [0, 1],
  blur: [0, 40], radius: [0, 28], borderOpacity: [0, 0.5]
};
export function sanitize(input = {}, previous = DEFAULTS) {
  const result = { ...DEFAULTS, ...previous };
  if (!input || typeof input !== 'object' || Array.isArray(input)) return result;
  if (typeof input.enabled === 'boolean') result.enabled = input.enabled;
  if (typeof input.backgroundFile === 'string' && input.backgroundFile.length <= 4096 && !input.backgroundFile.includes('\0')) {
    result.backgroundFile = input.backgroundFile.trim();
  }
  for (const [key, [min, max]] of Object.entries(ranges)) {
    const value = input[key];
    if (typeof value === 'number' && Number.isFinite(value)) result[key] = Math.min(max, Math.max(min, value));
  }
  return result;
}

export function parseRange(header, size) {
  if (header === undefined) return null;
  if (typeof header !== 'string') return false;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(size) || size <= 0) return false;
  const a = match[1] ? Number(match[1]) : undefined;
  const b = match[2] ? Number(match[2]) : undefined;
  if ((a !== undefined && !Number.isSafeInteger(a)) || (b !== undefined && !Number.isSafeInteger(b))) return false;
  if (a === undefined) return b > 0 ? { start: Math.max(0, size - b), end: size - 1 } : false;
  if (a >= size || (b !== undefined && b < a)) return false;
  return { start: a, end: b === undefined ? size - 1 : Math.min(b, size - 1) };
}
