import { useCallback, useEffect, useState } from 'react';
import { Appearance, BackHandler, Linking, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import Browser from './screens/browser/Browser';
import { web, type LinkInfo } from './screens/browser/controller';
import Home from './screens/Home';
import Tabs from './screens/Tabs';
import { BrowserMenu, LinkMenu, TabMenu } from './screens/Menus';
import Search from './screens/Search';
import Settings from './screens/Settings';
import { SiteSheet } from './screens/Site';
import Rename from './screens/Rename';
import Welcome from './screens/Welcome';
import { activate, getState, hostKey, openTab, renameBookmark, renameTab, setSettings, useStore } from './state/store';
import { tabLabel } from './lib/tabs';
import { tidyUrl, usePrivacySync } from './privacy';
import { GlassScope, GlassTarget } from './ui/Glass';
import { useTheme, type Palette } from './ui/theme';
import { queryFromUrl } from './lib/url';

SplashScreen.preventAutoHideAsync().catch(() => {});

type Overlay =
  | { kind: 'settings' }
  | { kind: 'menu'; id: string }
  | { kind: 'tab'; id: string }
  | { kind: 'site'; host: string; url: string }
  | { kind: 'link'; info: LinkInfo }
  | { kind: 'rename'; target: 'tab' | 'bookmark'; id: string };

type SearchState = { editing: boolean; text: string; private: boolean };
type View3 = 'home' | 'tabs' | 'page';

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  const c = useTheme();
  const activeTab = useStore((s) => s.tabs.find((t) => t.id === s.activeId));

  const [view, setView] = useState<View3>('home');
  const onboarded = useStore((s) => s.settings.onboarded);
  const themeMode = useStore((s) => s.settings.theme);
  usePrivacySync();

  useEffect(() => {
    Appearance.setColorScheme?.(themeMode === 'system' ? 'auto' : themeMode);
  }, [themeMode]);

  const [search, setSearch] = useState<SearchState | null>(null);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [pageLight, setPageLight] = useState(!c.dark);

  const onPageView = view === 'page' && !!activeTab;
  const showPage = () => setView('page');

  const openGrid = () => {
    web.capture();
    setView('tabs');
  };

  const openId = (id: string) => {
    if (id !== getState().activeId) activate(id);
    showPage();
  };

  const newSearch = () => setSearch({ editing: false, text: '', private: onPageView && !!activeTab?.private });
  const homeSearch = () => setSearch({ editing: false, text: '', private: false });

  const editAddress = () => {
    if (!activeTab) return;
    setSearch({ editing: true, text: queryFromUrl(activeTab.url) ?? activeTab.url, private: !!activeTab.private });
  };

  const submit = (url: string, privateMode: boolean) => {
    const editing = search?.editing && activeTab;
    setSearch(null);
    if (editing) {
      web.load(tidyUrl(url));
    } else {
      if (onPageView) web.capture();
      openTab(tidyUrl(url), { private: privateMode });
    }
    showPage();
  };

  const openIncoming = (url?: string | null) => {
    if (!url || !/^https?:\/\//i.test(url)) return;
    if (!getState().settings.onboarded) setSettings({ onboarded: true });
    setSearch(null);
    setOverlay(null);
    web.capture();
    openTab(tidyUrl(url));
    showPage();
  };

  useEffect(() => {
    Linking.getInitialURL().then(openIncoming).catch(() => {});
    const sub = Linking.addEventListener('url', (e) => openIncoming(e.url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (search || overlay) return false;
      if (onPageView) {
        if (web.canBack) web.view?.goBack();
        else openGrid();
        return true;
      }
      if (view === 'tabs') {
        setView(activeTab ? 'page' : 'home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  });

  const onPage = overlay?.kind === 'settings';
  const overBackdrop = !onPageView || !!search;
  const barStyle = !onboarded ? 'light' : onPage || overBackdrop ? (c.dark ? 'light' : 'dark') : pageLight ? 'dark' : 'light';

  const openUrl = (url: string) => {
    setOverlay(null);
    if (onPageView) web.capture();
    openTab(tidyUrl(url));
    showPage();
  };

  return (
    <GlassScope off={onPageView}>
      <View style={[styles.root, { backgroundColor: c.bg }]}>
        <GlassTarget style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }]}>
          {activeTab && (
            <Browser
              key={activeTab.id}
              c={c}
              tab={activeTab}
              covered={!onPageView || !!search || overlay !== null}
              onGrid={openGrid}
              onSearch={newSearch}
              onMenu={() => setOverlay({ kind: 'menu', id: activeTab.id })}
              onEdit={editAddress}
              onNewTab={(url) => {
                web.capture();
                openTab(tidyUrl(url), { private: activeTab.private });
              }}
              onTone={setPageLight}
              onLinkMenu={(info) => setOverlay({ kind: 'link', info })}
            />
          )}

          {!onPageView && view !== 'tabs' && (
            <Home
              c={c}
              canReturn={!!activeTab}
              onReturn={showPage}
              onOpenTab={openId}
              onOpenUrl={openUrl}
              onSearch={homeSearch}
              onTabs={() => setView('tabs')}
              onSettings={() => setOverlay({ kind: 'settings' })}
              onTabMenu={(id) => setOverlay({ kind: 'tab', id })}
              onRenameBookmark={(id) => setOverlay({ kind: 'rename', target: 'bookmark', id })}
            />
          )}

          {!onPageView && view === 'tabs' && (
            <Tabs
              c={c}
              startPrivate={!!activeTab?.private}
              onOpen={openId}
              onNew={(privateMode) => {
                setView('home');
                setSearch({ editing: false, text: '', private: privateMode });
              }}
              onDone={() => (activeTab ? showPage() : setView('home'))}
              onMenu={(id) => setOverlay({ kind: 'tab', id })}
            />
          )}
        </GlassTarget>

        {search && (
          <Search
            c={c}
            initial={search.text}
            editing={search.editing}
            privateMode={search.private}
            onSubmit={submit}
            onSwitch={(id) => {
              setSearch(null);
              openId(id);
            }}
            onClose={() => setSearch(null)}
          />
        )}

        {overlay?.kind === 'settings' && (
          <Settings c={c} onClose={() => setOverlay(null)} />
        )}
        {overlay?.kind === 'site' && (
          <SiteSheet
            c={c}
            host={overlay.host}
            url={overlay.url}
            onClose={() => setOverlay(null)}
            onChanged={() => web.view?.reload()}
          />
        )}
        {overlay?.kind === 'link' && (
          <LinkMenu
            c={c}
            info={overlay.info}
            privateContext={!!activeTab?.private}
            onClose={() => setOverlay(null)}
            onOpen={(url, mode) => {
              if (mode === 'back') {
                openTab(url, { background: true, private: activeTab?.private });
                return;
              }
              web.capture();
              openTab(url, { private: mode === 'private' || !!activeTab?.private });
              showPage();
            }}
          />
        )}
        {overlay?.kind === 'menu' && (
          <BrowserMenu
            c={c}
            id={overlay.id}
            onClose={() => setOverlay(null)}
            onEdit={editAddress}
            onSettings={() => setOverlay({ kind: 'settings' })}
            onSite={() => activeTab && setOverlay({ kind: 'site', host: hostKey(activeTab.url), url: activeTab.url })}
          />
        )}
        {overlay?.kind === 'tab' && (
          <TabMenu
            c={c}
            id={overlay.id}
            onClose={() => setOverlay(null)}
            onRename={() => setOverlay({ kind: 'rename', target: 'tab', id: overlay.id })}
          />
        )}
        {overlay?.kind === 'rename' && <RenameOverlay c={c} target={overlay.target} id={overlay.id} onClose={() => setOverlay(null)} />}

        {!onboarded && <Welcome onDone={() => setView('home')} />}

        <StatusBar style={barStyle} />
      </View>
    </GlassScope>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

function RenameOverlay({ c, target, id, onClose }: { c: Palette; target: 'tab' | 'bookmark'; id: string; onClose: () => void }) {
  const tab = useStore((s) => (target === 'tab' ? s.tabs.find((t) => t.id === id) : undefined));
  const mark = useStore((s) => (target === 'bookmark' ? s.bookmarks.find((b) => b.id === id) : undefined));
  if (target === 'tab' && tab) {
    return (
      <Rename
        c={c}
        title={tab.pinned ? 'Rename pinned tab' : 'Rename tab'}
        initial={tabLabel(tab)}
        placeholder={tab.title || 'Tab name'}
        onSave={(name) => renameTab(id, name)}
        onClose={onClose}
      />
    );
  }
  if (target === 'bookmark' && mark) {
    return (
      <Rename
        c={c}
        title="Rename bookmark"
        initial={mark.name || mark.title}
        placeholder={mark.title || 'Bookmark name'}
        onSave={(name) => renameBookmark(id, name)}
        onClose={onClose}
      />
    );
  }
  return null;
}
