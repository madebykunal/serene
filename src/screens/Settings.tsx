import { useState } from 'react';
import { Image, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { expo } from '../../app.json';
import { adblockAvailable } from '../privacy/adblock';
import { learnedTrackers, resetLearnedTrackers } from '../privacy/badger';
import { clearHistorySince, closePrivateTabs, setSettings, useStore, type EngineId, type Settings as Prefs, type ThemeMode } from '../state/store';
import type { Palette } from '../ui/theme';
import { ENGINE_ORDER, ENGINES } from '../lib/url';
import Page, { SectionLabel } from '../ui/Page';
import { Choice, Note, Row, SwitchRow } from '../ui/Rows';
import { web } from './browser/controller';
import Downloads from './Library';
import { SitePage, SitesPage } from './Site';
import { APP_NAME } from '../brand';
import { canPickWallpaper, clearWallpaper, pickWallpaper, WALLPAPER_LABELS, wallpaperSource, type WallpaperKind } from '../lib/wallpaper';
import Icon from '../ui/Icon';

type Route =
  | 'general'
  | 'search'
  | 'privacy'
  | 'appearance'
  | 'about'
  | 'engine'
  | 'archiveAfter'
  | 'theme'
  | 'textSize'
  | 'sites'
  | 'clearData'
  | 'downloads'
  | 'wallpaper'
  | `site:${string}`;

const ARCHIVE_STEPS = [12, 24, 168, 720, 0];
const THEMES: { key: ThemeMode; label: string }[] = [
  { key: 'system', label: 'System default' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];
const TEXT_SIZES = [85, 100, 115, 130, 150];

function archiveLabel(hours: number) {
  if (!hours) return 'Never';
  if (hours < 24) return `${hours} hours`;
  const d = Math.round(hours / 24);
  return d === 1 ? '1 day' : `${d} days`;
}

function openDefaultApps() {
  Linking.sendIntent('android.settings.MANAGE_DEFAULT_APPS_SETTINGS').catch(() => Linking.openSettings());
}

type Props = { c: Palette; onClose: () => void };

export default function Settings({ c, onClose }: Props) {
  const [stack, setStack] = useState<Route[]>([]);
  const push = (r: Route) => setStack((s) => [...s, r]);
  const pop = () => setStack((s) => s.slice(0, -1));

  return (
    <>
      <Main c={c} onClose={onClose} push={push} />
      {stack.map((r, i) => (
        <Screen key={`${i}-${r}`} c={c} route={r} push={push} pop={pop} />
      ))}
    </>
  );
}

function Main({ c, onClose, push }: { c: Palette; onClose: () => void; push: (r: Route) => void }) {
  const s = useStore((st) => st.settings);
  const engine = ENGINES[s.engine];
  const shields = [s.blockAds, s.learnTrackers, s.blockPopups, s.blockCookies, s.cleanLinks, s.skipRedirects, s.deAmp, s.httpsUpgrade, s.doNotTrack];
  const protections = shields.filter(Boolean).length;
  return (
    <Page c={c} title="App Settings" onClose={onClose}>
      {Platform.OS === 'android' && (
        <Row c={c} icon="window" title={`Set ${APP_NAME} as Default Browser`} sub={`Open links from other apps in ${APP_NAME}`} onPress={openDefaultApps} />
      )}

      <SectionLabel c={c} label="Browser" />
      <Row c={c} icon="sliders" title="General" sub={`Archive tabs after ${archiveLabel(s.archiveAfter).toLowerCase()}`} chevron onPress={() => push('general')} />
      <Row c={c} icon="search" title="Search" sub={`${engine.name} · suggestions ${s.suggestions ? 'on' : 'off'}`} chevron onPress={() => push('search')} />
      <Row c={c} icon="shield" title="Privacy & Security" sub={`${protections} of ${shields.length} protections on`} chevron onPress={() => push('privacy')} />
      <Row
        c={c}
        icon="half"
        title="Appearance"
        sub={`${THEMES.find((t) => t.key === s.theme)?.label} · text ${s.textZoom}%`}
        chevron
        onPress={() => push('appearance')}
      />

      <Row c={c} icon="download" title="Downloads" sub="Files saved to your Downloads folder" chevron onPress={() => push('downloads')} />

      <SectionLabel c={c} label={APP_NAME} />
      <Row c={c} icon="info" title="About" sub={`Version ${expo.version}`} chevron onPress={() => push('about')} />
    </Page>
  );
}

function Screen({
  c,
  route,
  push,
  pop,
}: {
  c: Palette;
  route: Route;
  push: (r: Route) => void;
  pop: () => void;
}) {
  const s = useStore((st) => st.settings);
  const set = (patch: Partial<Prefs>) => setSettings(patch);

  if (route === 'downloads') return <Downloads c={c} onClose={pop} />;
  if (route.startsWith('site:')) return <SitePage c={c} host={route.slice(5)} onClose={pop} />;

  switch (route) {
    case 'general':
      return (
        <Page c={c} title="General" onClose={pop}>
          {Platform.OS === 'android' && (
            <Row c={c} icon="window" title="Default Browser" sub={`Choose ${APP_NAME} for links from other apps`} chevron onPress={openDefaultApps} />
          )}
          <SectionLabel c={c} label="Tabs" />
          <Row c={c} icon="clock" title="Archive Tabs After" sub={archiveLabel(s.archiveAfter)} chevron onPress={() => push('archiveAfter')} />
          <SwitchRow
            c={c}
            icon="toolbar"
            title="Hide Toolbar While Scrolling"
            sub="More room for pages as you read"
            value={s.hideToolbar}
            onChange={(v) => set({ hideToolbar: v })}
          />
        </Page>
      );
    case 'search':
      return (
        <Page c={c} title="Search" onClose={pop}>
          <Row c={c} icon="search" title="Search Engine" sub={ENGINES[s.engine].name} chevron onPress={() => push('engine')} />
          <SwitchRow
            c={c}
            icon="list"
            title="Search Suggestions"
            sub={ENGINES[s.engine].suggest ? `From ${ENGINES[s.engine].name} as you type` : 'From your history and tabs'}
            value={s.suggestions}
            onChange={(v) => set({ suggestions: v })}
          />
          <Note c={c}>Private searches never use your history. Suggestions send what you type to your search engine.</Note>
        </Page>
      );
    case 'privacy':
      return <PrivacyPage c={c} push={push} pop={pop} />;
    case 'appearance':
      return (
        <Page c={c} title="Appearance" onClose={pop}>
          <Row c={c} icon="half" title="Theme" sub={THEMES.find((t) => t.key === s.theme)?.label} chevron onPress={() => push('theme')} />
          <SwitchRow
            c={c}
            icon="half"
            title="Darken Websites"
            sub={`Turn light sites dark when ${APP_NAME} is dark`}
            value={s.darkenSites}
            onChange={(v) => set({ darkenSites: v })}
          />
          <Row
            c={c}
            icon="image"
            title="Wallpaper"
            sub={`${WALLPAPER_LABELS[s.wallpaper as WallpaperKind] ?? 'None'} · shown on the Home page`}
            chevron
            onPress={() => push('wallpaper')}
          />
          <Row
            c={c}
            lead={<Text style={[styles.aa, { color: c.text }]}>Aa</Text>}
            title="Text Size"
            sub={`${s.textZoom}%`}
            chevron
            onPress={() => push('textSize')}
          />
        </Page>
      );
    case 'about':
      return (
        <Page c={c} title="About" onClose={pop}>
          <Row c={c} icon="info" title="Version" sub={expo.version} />
          <Row
            c={c}
            icon="list"
            title="Privacy Credits"
            subLines={6}
            sub="adblock-rust by Brave (MPL 2.0) · EasyList and EasyPrivacy (CC BY-SA 3.0) · ClearURLs rules (LGPL 3.0) · tracker learning modelled on EFF’s Privacy Badger"
          />
          <Note c={c}>Pages open in your device’s own web view. Your tabs, history and bookmarks stay on this phone.</Note>
        </Page>
      );
    case 'engine':
      return (
        <Choice
          c={c}
          title="Search Engine"
          options={ENGINE_ORDER.map((id) => ({ key: id, label: ENGINES[id].name }))}
          value={s.engine}
          onPick={(k) => set({ engine: k as EngineId })}
          onClose={pop}
        />
      );
    case 'archiveAfter':
      return (
        <Choice
          c={c}
          title="Archive Tabs After"
          note="Unpinned tabs you haven’t opened for this long are closed automatically. Pinned tabs are never archived."
          options={ARCHIVE_STEPS.map((h) => ({ key: String(h), label: archiveLabel(h) }))}
          value={String(s.archiveAfter)}
          onPick={(k) => set({ archiveAfter: Number(k) })}
          onClose={pop}
        />
      );
    case 'wallpaper':
      return <WallpaperPage c={c} onClose={pop} />;
    case 'theme':
      return <Choice c={c} title="Theme" options={THEMES} value={s.theme} onPick={(k) => set({ theme: k as ThemeMode })} onClose={pop} />;
    case 'textSize':
      return (
        <Choice
          c={c}
          title="Text Size"
          note="Changes the size of text on web pages. Open pages update when they reload."
          options={TEXT_SIZES.map((n) => ({ key: String(n), label: `${n}%`, sub: n === 100 ? 'Default' : undefined }))}
          value={String(s.textZoom)}
          onPick={(k) => set({ textZoom: Number(k) })}
          onClose={pop}
        />
      );
    case 'sites':
      return <SitesPage c={c} onClose={pop} onOpen={(h) => push(`site:${h}`)} />;
    case 'clearData':
      return <ClearData c={c} pop={pop} />;
  }
  return null;
}

function PrivacyPage({ c, push, pop }: { c: Palette; push: (r: Route) => void; pop: () => void }) {
  const s = useStore((st) => st.settings);
  const siteCount = useStore((st) => Object.keys(st.sites).length);
  const learned = learnedTrackers();
  const native = adblockAvailable ? '' : ' · needs the installed app';
  return (
    <Page c={c} title="Privacy & Security" onClose={pop}>
      <SectionLabel c={c} label="Blocking" />
      <SwitchRow
        c={c}
        icon="shield"
        title="Block Ads and Trackers"
        sub={`Brave’s engine with EasyList and EasyPrivacy${native}`}
        value={s.blockAds}
        onChange={(v) => setSettings({ blockAds: v })}
      />
      <SwitchRow
        c={c}
        icon="target"
        title="Learn to Block Trackers"
        sub={adblockAvailable ? `Privacy Badger-style learning · ${learned} learned` : `Privacy Badger-style learning${native}`}
        value={s.learnTrackers}
        onChange={(v) => setSettings({ learnTrackers: v })}
      />
      <SwitchRow
        c={c}
        icon="toolbar"
        title="Hide Pop-ups and App Banners"
        sub="Sign-in prompts and “get the app” bars"
        value={s.blockPopups}
        onChange={(v) => setSettings({ blockPopups: v })}
      />
      {Platform.OS === 'android' && (
        <SwitchRow
          c={c}
          icon="eyeOff"
          title="Block Third-Party Cookies"
          sub="Other sites can’t set cookies on the page you’re on"
          value={s.blockCookies}
          onChange={(v) => setSettings({ blockCookies: v })}
        />
      )}

      <SectionLabel c={c} label="Tracking" />
      <SwitchRow
        c={c}
        icon="link"
        title="Remove Tracking from Links"
        sub="ClearURLs rules strip utm, fbclid and redirect wrappers"
        value={s.cleanLinks}
        onChange={(v) => setSettings({ cleanLinks: v })}
      />
      <SwitchRow
        c={c}
        icon="external"
        title="Skip Tracking Redirects"
        sub={`Go straight to the destination of tracking links${adblockAvailable ? '' : native}`}
        value={s.skipRedirects}
        onChange={(v) => setSettings({ skipRedirects: v })}
      />
      <SwitchRow
        c={c}
        icon="window"
        title="Open Original Pages, Not AMP"
        sub="Skips Google AMP and AMP cache copies"
        value={s.deAmp}
        onChange={(v) => setSettings({ deAmp: v })}
      />
      <SwitchRow
        c={c}
        icon="lock"
        title="Ask Sites Not to Track"
        sub="Sends Global Privacy Control and Do Not Track"
        value={s.doNotTrack}
        onChange={(v) => setSettings({ doNotTrack: v })}
      />

      <SectionLabel c={c} label="Connections" />
      <SwitchRow
        c={c}
        icon="lock"
        title="Upgrade to HTTPS"
        sub="Load the secure version of sites and warn before an insecure one"
        value={s.httpsUpgrade}
        onChange={(v) => setSettings({ httpsUpgrade: v })}
      />

      <SectionLabel c={c} label="Sites and Data" />
      <Row
        c={c}
        icon="window"
        title="Site Settings"
        sub={siteCount ? `${siteCount} ${siteCount === 1 ? 'site' : 'sites'} with custom settings` : 'Turn protections off for one site'}
        chevron
        onPress={() => push('sites')}
      />
      <Row c={c} icon="trash" title="Clear Browsing Data" sub="History, cache, private tabs and learned trackers" chevron onPress={() => push('clearData')} />
    </Page>
  );
}

function clearLastHour() {
  clearHistorySince(Date.now() - 3_600_000);
}

function clearToday() {
  const t = new Date();
  clearHistorySince(new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime());
}

function ClearData({ c, pop }: { c: Palette; pop: () => void }) {
  const [done, setDone] = useState<string[]>([]);
  const privateCount = useStore((st) => st.tabs.filter((t) => t.private).length);
  const item = (key: string, title: string, sub: string, run: () => void) => {
    const finished = done.includes(key);
    return (
      <Row
        c={c}
        icon={finished ? 'check' : 'trash'}
        title={finished ? `${title} — cleared` : title}
        sub={sub}
        danger={!finished}
        onPress={() => {
          if (finished) return;
          run();
          setDone((d) => [...d, key]);
        }}
      />
    );
  };
  return (
    <Page c={c} title="Clear Browsing Data" onClose={pop}>
      <SectionLabel c={c} label="History" />
      {item('hour', 'Last Hour', 'Pages visited in the past hour', clearLastHour)}
      {item('today', 'Today', 'Pages visited since midnight', clearToday)}
      {item('all', 'All Time', 'Your entire browsing history', () => clearHistorySince(0))}
      <SectionLabel c={c} label="Other Data" />
      {item('cache', 'Page Cache', 'Saved copies of pages and images', () => web.view?.clearCache?.(true))}
      {privateCount > 0 && item('private', 'Close Private Tabs', `${privateCount} open`, closePrivateTabs)}
      {adblockAvailable && item('trackers', 'Learned Trackers', `Forget the trackers ${APP_NAME} has learned`, resetLearnedTrackers)}
    </Page>
  );
}

function WallpaperPage({ c, onClose }: { c: Palette; onClose: () => void }) {
  const kind = useStore((st) => st.settings.wallpaper);
  const uri = useStore((st) => st.settings.wallpaperUri);
  const [busy, setBusy] = useState(false);
  const kinds: WallpaperKind[] = uri ? ['none', 'dusk', 'dawn', 'photo'] : ['none', 'dusk', 'dawn'];

  const choose = async () => {
    if (busy) return;
    setBusy(true);
    const picked = await pickWallpaper();
    setBusy(false);
    if (picked) setSettings({ wallpaper: 'photo', wallpaperUri: picked });
  };

  const removePhoto = () => {
    clearWallpaper();
    setSettings({ wallpaperUri: '', wallpaper: kind === 'photo' ? 'none' : kind });
  };

  return (
    <Page c={c} title="Wallpaper" onClose={onClose}>
      {kinds.map((k) => {
        const source = wallpaperSource(k, uri);
        return (
          <Row
            key={k}
            c={c}
            lead={
              <View style={[styles.thumb, { backgroundColor: c.fill, borderColor: c.line }]}>
                {source ? <Image source={source} style={styles.thumbImage} resizeMode="cover" resizeMethod="resize" fadeDuration={0} /> : null}
              </View>
            }
            title={WALLPAPER_LABELS[k]}
            right={kind === k ? <Icon name="check" size={20} color={c.text} /> : undefined}
            onPress={() => kind !== k && setSettings({ wallpaper: k })}
          />
        );
      })}
      {canPickWallpaper && (
        <Row c={c} icon="image" title={busy ? 'Opening Photos…' : uri ? 'Choose Another Photo' : 'Choose from Photos'} chevron onPress={choose} />
      )}
      {uri ? <Row c={c} icon="trash" title="Remove Photo" danger onPress={removePhoto} /> : null}
      <Note c={c}>
        Photos are resized once to fit your screen and saved on this phone, so the Home page stays light on memory. Wallpaper only shows on the Home page.
      </Note>
    </Page>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 40, height: 40, borderRadius: 12, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  thumbImage: { width: '100%', height: '100%' },
  aa: { fontSize: 19, fontWeight: '700' },
});
