import { Appearance } from 'react-native';
import type { EngineId } from '../state/store';

type Engine = { name: string; search: string; suggest?: string; host: string; param: string };

export const ENGINES: Record<EngineId, Engine> = {
  google: {
    name: 'Google',
    search: 'https://www.google.com/search?q=',
    suggest: 'https://suggestqueries.google.com/complete/search?client=firefox&q=',
    host: 'google.',
    param: 'q',
  },
  duckduckgo: {
    name: 'DuckDuckGo',
    search: 'https://duckduckgo.com/?q=',
    suggest: 'https://duckduckgo.com/ac/?type=list&q=',
    host: 'duckduckgo.com',
    param: 'q',
  },
  bing: {
    name: 'Bing',
    search: 'https://www.bing.com/search?q=',
    suggest: 'https://api.bing.com/osjson.aspx?query=',
    host: 'bing.com',
    param: 'q',
  },
  brave: {
    name: 'Brave Search',
    search: 'https://search.brave.com/search?q=',
    suggest: 'https://search.brave.com/api/suggest?q=',
    host: 'search.brave.com',
    param: 'q',
  },
  ecosia: { name: 'Ecosia', search: 'https://www.ecosia.org/search?q=', host: 'ecosia.org', param: 'q' },
  startpage: { name: 'Startpage', search: 'https://www.startpage.com/sp/search?query=', host: 'startpage.com', param: 'query' },
  perplexity: { name: 'Perplexity', search: 'https://www.perplexity.ai/search?q=', host: 'perplexity.ai', param: 'q' },
  kagi: { name: 'Kagi', search: 'https://kagi.com/search?q=', host: 'kagi.com', param: 'q' },
};

export const ENGINE_ORDER: EngineId[] = ['google', 'duckduckgo', 'bing', 'brave', 'ecosia', 'startpage', 'perplexity', 'kagi'];

const HOST_RE = /^(localhost|(?:[a-z0-9-]+\.)+[a-z][a-z0-9-]{1,}|\d{1,3}(?:\.\d{1,3}){3})(:\d{1,5})?([/?#].*)?$/i;

export function searchUrl(q: string, engine: EngineId) {
  const url = ENGINES[engine].search + encodeURIComponent(q);
  if (engine === 'duckduckgo') return `${url}&kae=${Appearance.getColorScheme() === 'dark' ? 'd' : '-1'}`;
  return url;
}

export function looksLikeUrl(input: string) {
  const s = input.trim();
  if (!s || /\s/.test(s)) return false;
  return /^(https?:\/\/|about:)/i.test(s) || HOST_RE.test(s);
}

export function toUrl(input: string, engine: EngineId): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s) || /^about:/i.test(s)) return s;
  if (!/\s/.test(s) && HOST_RE.test(s)) return `https://${s}`;
  return searchUrl(s, engine);
}

export function hostOf(url: string) {
  const m = /^[a-z][a-z0-9+.-]*:\/\/(?:[^@/?#]*@)?([^/?#:]+)/i.exec(url);
  return m ? m[1].toLowerCase() : '';
}

export function prettyHost(url: string) {
  return hostOf(url).replace(/^(www|m|mobile)\./, '');
}

export const isSecure = (url: string) => /^https:\/\//i.test(url);

function param(url: string, key: string) {
  const q = url.split('#')[0].split('?')[1];
  if (!q) return null;
  for (const pair of q.split('&')) {
    const i = pair.indexOf('=');
    if (i > 0 && pair.slice(0, i) === key) {
      try {
        return decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function queryFromUrl(url: string): string | null {
  const host = hostOf(url);
  if (!host) return null;
  for (const id of ENGINE_ORDER) {
    const e = ENGINES[id];
    if (host.includes(e.host)) {
      const q = param(url, e.param);
      if (q && q.trim()) return q;
    }
  }
  return null;
}

export async function fetchSuggestions(engine: EngineId, q: string, signal: AbortSignal): Promise<string[]> {
  const e = ENGINES[engine];
  if (!e.suggest) return [];
  const res = await fetch(e.suggest + encodeURIComponent(q), { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) return [];
  const data: unknown = await res.json();
  if (!Array.isArray(data) || !Array.isArray(data[1])) return [];
  return (data[1] as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 6);
}

export function intentFallback(url: string): string | null {
  const m = /S\.browser_fallback_url=([^;]+)/.exec(url);
  if (!m) return null;
  try {
    const u = decodeURIComponent(m[1]);
    return /^https?:\/\//i.test(u) ? u : null;
  } catch {
    return null;
  }
}
