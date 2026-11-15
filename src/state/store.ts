import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

export type EngineId = 'google' | 'duckduckgo' | 'bing' | 'brave' | 'ecosia' | 'startpage' | 'perplexity' | 'kagi';
export type ThemeMode = 'system' | 'light' | 'dark';

export type Tab = {
  id: string;
  url: string;
  title: string;
  name?: string;
  icon?: string;
  thumb?: string;
  ratio?: number;
  pinned: boolean;
  private?: boolean;
  desktop?: boolean;
  createdAt: number;
  lastActive: number;
};

export type Bookmark = { id: string; url: string; title: string; name?: string; icon?: string; at: number };
export type Visit = { url: string; title: string; at: number; icon?: string };

export type Settings = {
  engine: EngineId;
  suggestions: boolean;
  archiveAfter: number;
  hideToolbar: boolean;
  blockPopups: boolean;
  blockAds: boolean;
  learnTrackers: boolean;
  cleanLinks: boolean;
  doNotTrack: boolean;
  skipRedirects: boolean;
  deAmp: boolean;
  httpsUpgrade: boolean;
  blockCookies: boolean;
  textZoom: number;
  darkenSites: boolean;
  theme: ThemeMode;
  wallpaper: string;
  wallpaperUri: string;
  onboarded: boolean;
};

type State = {
  tabs: Tab[];
  activeId: string | null;
  bookmarks: Bookmark[];
  history: Visit[];
  settings: Settings;
  chrome: number;
  sites: Record<string, SiteRule>;
};

export type SiteRule = { ads?: boolean; darken?: boolean; popups?: boolean; https?: boolean; cookies?: boolean };

const HISTORY_CAP = 400;
const BOOKMARK_CAP = 1000;

const DEFAULT_SETTINGS: Settings = {
  engine: 'google',
  suggestions: true,
  archiveAfter: 24,
  hideToolbar: true,
  blockPopups: true,
  blockAds: true,
  learnTrackers: true,
  cleanLinks: true,
  doNotTrack: true,
  skipRedirects: true,
  deAmp: true,
  httpsUpgrade: true,
  blockCookies: true,
  textZoom: 100,
  darkenSites: true,
  theme: 'system',
  wallpaper: 'none',
  wallpaperUri: '',
  onboarded: false,
};

const stateFile = new File(Paths.document, 'state.json');
const thumbDir = new Directory(Paths.cache, 'thumbs');
const thumbBase = thumbDir.uri.endsWith('/') ? thumbDir.uri : `${thumbDir.uri}/`;

export const thumbUri = (name: string) => thumbBase + name;

function pickSettings(raw: unknown): Settings {
  const out = { ...DEFAULT_SETTINGS };
  if (raw && typeof raw === 'object') {
    for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
      const v = (raw as Record<string, unknown>)[k];
      if (typeof v === typeof DEFAULT_SETTINGS[k]) (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

function read(): State {
  const empty: State = { tabs: [], activeId: null, bookmarks: [], history: [], settings: DEFAULT_SETTINGS, chrome: 0, sites: {} };
  try {
    if (!stateFile.exists) return empty;
    const raw = JSON.parse(stateFile.textSync()) as Partial<State>;
    const tabs = Array.isArray(raw.tabs)
      ? raw.tabs.filter((t) => t && typeof t.id === 'string' && typeof t.url === 'string')
      : [];
    return {
      tabs,
      activeId: null,
      bookmarks: Array.isArray(raw.bookmarks) ? raw.bookmarks : [],
      history: Array.isArray(raw.history) ? raw.history : [],
      settings: pickSettings(raw.settings),
      chrome: typeof raw.chrome === 'number' ? raw.chrome : 0,
      sites: raw.sites && typeof raw.sites === 'object' ? raw.sites : {},
    };
  } catch {
    return empty;
  }
}

let state = read();
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function persist() {
  saveTimer = null;
  try {
    stateFile.writeSync(JSON.stringify({ ...state, tabs: state.tabs.filter((t) => !t.private), activeId: null }));
  } catch {}
}

function flush() {
  if (!saveTimer) return;
  clearTimeout(saveTimer);
  persist();
}

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
  if (!saveTimer) saveTimer = setTimeout(persist, 600);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export const getState = () => state;

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(state));
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function dropThumb(name?: string) {
  if (!name) return;
  try {
    const f = new File(thumbDir, name);
    if (f.exists) f.delete();
  } catch {}
}

function patchTab(tabs: Tab[], id: string, patch: Partial<Tab>): Tab[] | null {
  let changed = false;
  const next = tabs.map((t) => {
    if (t.id !== id) return t;
    for (const k in patch) {
      if (t[k as keyof Tab] !== patch[k as keyof Tab]) {
        changed = true;
        return { ...t, ...patch };
      }
    }
    return t;
  });
  return changed ? next : null;
}

type OpenOptions = { title?: string; icon?: string; private?: boolean; background?: boolean };

export function openTab(url: string, init?: OpenOptions): string {
  const now = Date.now();
  const tab: Tab = {
    id: uid(),
    url,
    title: init?.title ?? '',
    icon: init?.icon,
    pinned: false,
    private: init?.private || undefined,
    createdAt: now,
    lastActive: init?.background ? now - 1 : now,
  };
  set({ ...state, tabs: [tab, ...state.tabs], activeId: init?.background ? state.activeId : tab.id });
  return tab.id;
}

export function hostKey(url: string) {
  const m = /^[a-z][a-z0-9+.-]*:\/\/(?:[^@/?#]*@)?([^/?#:]+)/i.exec(url);
  return m ? m[1].toLowerCase().replace(/^www\./, '') : '';
}

export function siteRule(url: string): SiteRule {
  return state.sites[hostKey(url)] ?? {};
}

export function setSiteRule(host: string, patch: SiteRule) {
  if (!host) return;
  const next = { ...state.sites[host], ...patch };
  const sites = { ...state.sites };
  if (Object.values(next).every((v) => v !== false)) delete sites[host];
  else sites[host] = next;
  set({ ...state, sites });
}

export function resetSiteRules(host?: string) {
  if (!host) {
    set({ ...state, sites: {} });
    return;
  }
  const sites = { ...state.sites };
  delete sites[host];
  set({ ...state, sites });
}

export function removeVisit(url: string) {
  set({ ...state, history: state.history.filter((v) => v.url !== url) });
}

export function clearHistorySince(since: number) {
  set({ ...state, history: since ? state.history.filter((v) => v.at < since) : [] });
}

export function closePrivateTabs() {
  const gone = state.tabs.filter((t) => t.private);
  if (!gone.length) return;
  gone.forEach((t) => dropThumb(t.thumb));
  const active = state.tabs.find((t) => t.id === state.activeId);
  set({ ...state, tabs: state.tabs.filter((t) => !t.private), activeId: active?.private ? null : state.activeId });
}

export function activate(id: string) {
  const tabs = patchTab(state.tabs, id, { lastActive: Date.now() }) ?? state.tabs;
  set({ ...state, tabs, activeId: id });
}

export function updateTab(id: string, patch: Partial<Tab>) {
  const tabs = patchTab(state.tabs, id, patch);
  if (tabs) set({ ...state, tabs });
}

export function closeTab(id: string) {
  const tab = state.tabs.find((t) => t.id === id);
  if (!tab) return;
  dropThumb(tab.thumb);
  set({
    ...state,
    tabs: state.tabs.filter((t) => t.id !== id),
    activeId: state.activeId === id ? null : state.activeId,
  });
}

export function reopenTab(tab: Tab) {
  if (state.tabs.some((t) => t.id === tab.id)) return;
  set({ ...state, tabs: [{ ...tab, thumb: undefined, ratio: undefined, lastActive: Date.now() }, ...state.tabs] });
}

export function closeUnpinned() {
  const gone = state.tabs.filter((t) => !t.pinned);
  if (!gone.length) return;
  gone.forEach((t) => dropThumb(t.thumb));
  const active = state.tabs.find((t) => t.id === state.activeId);
  set({
    ...state,
    tabs: state.tabs.filter((t) => t.pinned),
    activeId: active?.pinned ? state.activeId : null,
  });
}

export function togglePin(id: string) {
  const tab = state.tabs.find((t) => t.id === id);
  if (tab) updateTab(id, { pinned: !tab.pinned });
}

export function duplicateTab(id: string) {
  const i = state.tabs.findIndex((t) => t.id === id);
  if (i < 0) return;
  const src = state.tabs[i];
  const now = Date.now();
  const copy: Tab = { id: uid(), url: src.url, title: src.title, icon: src.icon, pinned: false, private: src.private, createdAt: now, lastActive: now };
  const tabs = state.tabs.slice();
  tabs.splice(i + 1, 0, copy);
  set({ ...state, tabs });
}

export function toggleBookmark(url: string, title: string, icon?: string) {
  const hit = state.bookmarks.find((b) => b.url === url);
  if (hit) {
    removeBookmark(hit.id);
    return false;
  }
  const b: Bookmark = { id: uid(), url, title, icon, at: Date.now() };
  set({ ...state, bookmarks: [b, ...state.bookmarks].slice(0, BOOKMARK_CAP) });
  return true;
}

export function renameTab(id: string, name: string) {
  const tabs = patchTab(state.tabs, id, { name: name.trim() || undefined });
  if (tabs) set({ ...state, tabs });
}

export function renameBookmark(id: string, name: string) {
  set({ ...state, bookmarks: state.bookmarks.map((b) => (b.id === id ? { ...b, name: name.trim() || undefined } : b)) });
}

export function removeBookmark(id: string) {
  set({ ...state, bookmarks: state.bookmarks.filter((b) => b.id !== id) });
}

export function addVisit(url: string, title: string) {
  if (!/^https?:\/\//i.test(url)) return;
  const h = state.history;
  if (h[0]?.url === url) {
    if (title && h[0].title !== title) set({ ...state, history: [{ ...h[0], title }, ...h.slice(1)] });
    return;
  }
  const icon = h.find((v) => v.url === url)?.icon;
  set({ ...state, history: [{ url, title, at: Date.now(), icon }, ...h.filter((v) => v.url !== url)].slice(0, HISTORY_CAP) });
}

export function setVisitIcon(url: string, icon: string) {
  const i = state.history.findIndex((v) => v.url === url);
  if (i < 0 || state.history[i].icon === icon) return;
  const history = state.history.slice();
  history[i] = { ...history[i], icon };
  set({ ...state, history });
}

export function setChromeVersion(v: number) {
  if (v > 0 && v !== state.chrome) set({ ...state, chrome: v });
}

export function setSettings(patch: Partial<Settings>) {
  set({ ...state, settings: { ...state.settings, ...patch } });
}

function autoArchive() {
  const hours = state.settings.archiveAfter;
  if (!hours) return;
  const cutoff = Date.now() - hours * 3_600_000;
  const stale = state.tabs.filter((t) => !t.pinned && t.id !== state.activeId && t.lastActive < cutoff);
  if (!stale.length) return;
  stale.forEach((t) => dropThumb(t.thumb));
  const ids = new Set(stale.map((t) => t.id));
  set({
    ...state,
    tabs: state.tabs.filter((t) => !ids.has(t.id)),
  });
}

export async function saveThumb(id: string, tmpUri: string, ratio: number) {
  const tmp = new File(tmpUri);
  try {
    if (!thumbDir.exists) thumbDir.create({ intermediates: true, idempotent: true });
    const tab = state.tabs.find((t) => t.id === id);
    if (!tab) {
      tmp.delete();
      return;
    }
    const name = `${id}-${Date.now().toString(36)}.jpg`;
    await tmp.move(new File(thumbDir, name));
    const current = state.tabs.find((t) => t.id === id);
    if (!current) {
      dropThumb(name);
      return;
    }
    dropThumb(current.thumb);
    updateTab(id, { thumb: name, ratio });
  } catch {
    try {
      if (tmp.exists) tmp.delete();
    } catch {}
  }
}

function pruneThumbs() {
  try {
    if (!thumbDir.exists) return;
    const keep = new Set(state.tabs.map((t) => t.thumb));
    for (const item of thumbDir.list()) {
      if (item instanceof File && !keep.has(item.name)) item.delete();
    }
  } catch {}
}

autoArchive();
setTimeout(pruneThumbs, 4000);

AppState.addEventListener('change', (s) => {
  if (s === 'active') autoArchive();
  else flush();
});
