import { Easing, useColorScheme, type TextStyle } from 'react-native';
import { useStore } from '../state/store';

/* ── Brave-inspired neutral palette ─────────────────────────────── */

const DAY = {
  bg: '#F1F3F5',
  surface: '#FFFFFF',
  fill: '#E8EAED',
  panel: '#FAFAFA',
  field: '#E8EAED',
  clearBtn: '#8E9296',
  text: '#1D1F22',
  sub: '#5C6066',
  faint: '#9CA0A5',
  line: 'rgba(0,0,0,0.08)',
  scrim: 'rgba(0,0,0,0.32)',
  danger: '#D93025',
  accent: '#5C6066',
  onAccent: '#FFFFFF',
  onBg: '#1D1F22',
  glass: 'rgba(255,255,255,0.72)',
  glassStrong: 'rgba(255,255,255,0.92)',
  glassEdge: 'rgba(255,255,255,0.85)',
  selection: 'rgba(0,0,0,0.18)',
  river: '#5C6066',
  onRiver: '#FFFFFF',
  // Splash-only brand color (green)
  brand: '#0A7A6D',
  brandSoft: '#3FD5C3',
};

const NIGHT: typeof DAY = {
  bg: '#1D1F22',
  surface: '#292B2F',
  fill: '#35373B',
  panel: '#232528',
  field: '#3A3C41',
  clearBtn: '#9CA0A5',
  text: '#E8EAED',
  sub: '#9CA0A5',
  faint: '#6B6F74',
  line: 'rgba(255,255,255,0.08)',
  scrim: 'rgba(0,0,0,0.56)',
  danger: '#FF6B6B',
  accent: '#9CA0A5',
  onAccent: '#1D1F22',
  onBg: '#E8EAED',
  glass: 'rgba(29,31,34,0.72)',
  glassStrong: 'rgba(255,255,255,0.10)',
  glassEdge: 'rgba(255,255,255,0.12)',
  selection: 'rgba(255,255,255,0.28)',
  river: '#9CA0A5',
  onRiver: '#1D1F22',
  brand: '#5FE3CB',
  brandSoft: '#3FD5C3',
};

export type Palette = typeof DAY & { dark: boolean; accentSoft: string };

export const type = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.5, fontFamily: 'Inter_700Bold' },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2, fontFamily: 'Inter_700Bold' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400', fontFamily: 'Inter_400Regular' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  caption: { fontSize: 12.5, lineHeight: 16, fontWeight: '500', fontFamily: 'Inter_500Medium' },
} satisfies Record<string, TextStyle>;

export const motion = {
  quick: 120,
  base: 180,
  slow: 240,
  enter: Easing.bezier(0.2, 0, 0, 1),
  exit: Easing.bezier(0.3, 0, 1, 1),
};

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(f, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: string, b: string, t: number) {
  const x = rgb(a);
  const y = rgb(b);
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function luminance(color: string): number | null {
  let r: number;
  let g: number;
  let b: number;
  const m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/i.exec(color);
  if (m) {
    if (m[4] !== undefined && parseFloat(m[4]) < 0.5) return null;
    r = +m[1];
    g = +m[2];
    b = +m[3];
  } else if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) {
    [r, g, b] = rgb(color);
  } else {
    return null;
  }
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

const DAY_P: Palette = { ...DAY, dark: false, accentSoft: mix(DAY.surface, DAY.accent, 0.08) };
const NIGHT_P: Palette = { ...NIGHT, dark: true, accentSoft: mix(NIGHT.surface, NIGHT.accent, 0.12) };

export function useTheme(): Palette {
  const scheme = useColorScheme();
  const mode = useStore((s) => s.settings.theme);
  const dark = mode === 'system' ? scheme === 'dark' : mode === 'dark';
  return dark ? NIGHT_P : DAY_P;
}

const TILES = ['#E8EAED', '#F0E4D4', '#DCE8EF', '#E2EFD8', '#F0DCD4', '#DEE4F0', '#E8E0EF', '#E6E9D8'];
const TILES_NIGHT = ['#35373B', '#4A3A2A', '#2E3E4E', '#2A4630', '#4A2F2B', '#2E3440', '#3A2D47', '#3A3F26'];

export function pastel(seed: string, dark: boolean) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const list = dark ? TILES_NIGHT : TILES;
  return list[Math.abs(h) % list.length];
}
