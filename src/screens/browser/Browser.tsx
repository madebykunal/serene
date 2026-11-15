import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, Dimensions, Easing, Keyboard, Linking, PanResponder, PixelRatio, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import { captureRef } from 'react-native-view-shot';
import { themeScript } from '../../inject/darkMode';
import { DECLUTTER } from '../../inject/declutter';
import { DESKTOP_VIEWPORT, findScript, guard, LONG_PRESS, PAGE_INFO, PULL_TO_REFRESH, textSizeScript } from '../../inject/pageScripts';
import { cardWidth } from '../../lib/tabs';
import { intentFallback, prettyHost, searchUrl } from '../../lib/url';
import { cleanNavigation, tidyUrl } from '../../privacy';
import { AMP_SCRIPT, leaveAmp } from '../../privacy/amp';
import { allowHttp, upgradeHttps, wasUpgraded } from '../../privacy/https';
import { GPC_SCRIPT, withPrivacyHeaders } from '../../privacy/gpc';
import { addVisit, getState, hostKey, saveThumb, setChromeVersion, setVisitIcon, updateTab, useStore, type Tab } from '../../state/store';
import Icon from '../../ui/Icon';
import Tap from '../../ui/Tap';
import { luminance, type, type Palette } from '../../ui/theme';
import { web, type LinkInfo } from './controller';
import LoadError from './LoadError';
import Glass from '../../ui/Glass';
import { androidUserAgent, desktopUserAgent, IOS_APP_NAME } from './userAgent';

type Props = {
  c: Palette;
  tab: Tab;
  covered: boolean;
  onGrid: () => void;
  onSearch: () => void;
  onMenu: () => void;
  onEdit: () => void;
  onNewTab: (url: string) => void;
  onTone: (light: boolean) => void;
  onLinkMenu: (info: LinkInfo) => void;
};

const BAR = 48;
const PRIVATE_BAR = '#241B45';
const BAR_SEE = 0.26;
const EDGE = 14;
let captureTimer: ReturnType<typeof setTimeout> | undefined;

export default function Browser({ c, tab, covered, onGrid, onSearch, onMenu, onEdit, onNewTab, onTone, onLinkMenu }: Props) {
  const insets = useSafeAreaInsets();
  const hideOnScroll = useStore((s) => s.settings.hideToolbar);
  const blockPopups = useStore((s) => s.settings.blockPopups);
  const doNotTrack = useStore((s) => s.settings.doNotTrack);
  const darkenSites = useStore((s) => s.settings.darkenSites);
  const chrome = useStore((s) => s.chrome);
  const textZoom = useStore((s) => s.settings.textZoom);
  const sites = useStore((s) => s.sites);
  const darkOff = Object.keys(sites).filter((h) => sites[h].darken === false);
  const deAmp = useStore((s) => s.settings.deAmp);
  const blockCookies = useStore((s) => s.settings.blockCookies) && sites[hostKey(tab.url)]?.cookies !== false;
  const popupsOff = Object.keys(sites).filter((h) => sites[h].popups === false);
  const isPrivate = !!tab.private;
  const desktop = !!tab.desktop;
  const userAgent = desktop ? desktopUserAgent(chrome) : Platform.OS === 'android' ? androidUserAgent(chrome) : undefined;
  const [finding, setFinding] = useState(false);
  const [canBack, setCanBack] = useState(false);
  const tabCount = useStore((s) => s.tabs.filter((t) => !t.pinned && !t.private).length);
  const [findText, setFindText] = useState('');
  const [found, setFound] = useState<{ n: number; i: number } | null>(null);
  const [pull] = useState(() => new Animated.Value(0));
  const [edge] = useState(() => new Animated.Value(0));
  const [edgeSide, setEdgeSide] = useState<'left' | 'right'>('left');
  const ref = useRef<ComponentRef<typeof WebView>>(null);
  const shot = useRef<ComponentRef<typeof View>>(null);
  const frame = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const [source, setSource] = useState(() => withPrivacyHeaders(upgradeHttps(tab.url)));
  const [crashKey, setCrashKey] = useState(0);
  const [topColor, setTopColor] = useState(c.dark ? c.bg : '#FFFFFF');
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [kbTop, setKbTop] = useState<number | null>(null);
  const [rootH, setRootH] = useState(0);
  const [progress] = useState(() => new Animated.Value(0));
  const [progressOpacity] = useState(() => new Animated.Value(1));
  const [hidden] = useState(() => new Animated.Value(0));
  const [spin] = useState(() => new Animated.Value(0));
  const spinning = useRef<Animated.CompositeAnimation | null>(null);
  const loadingNow = useRef(false);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hiddenNow = useRef(false);
  const tabId = tab.id;

  const setHidden = (h: boolean) => {
    if (hiddenNow.current === h) return;
    hiddenNow.current = h;
    Animated.spring(hidden, { toValue: h ? 1 : 0, useNativeDriver: true, damping: 26, stiffness: 340, mass: 0.8 }).start();
  };

  const startLoading = () => {
    setHidden(false);
    progressOpacity.setValue(1);
    if (spinning.current) return;
    spin.setValue(0);
    spinning.current = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 750, easing: Easing.linear, useNativeDriver: true }));
    spinning.current.start();
  };

  const stopLoading = () => {
    const loop = spinning.current;
    if (!loop) return;
    spinning.current = null;
    loop.stop();
    spin.stopAnimation((v) => {
      Animated.timing(spin, { toValue: 1, duration: Math.max(120, (1 - v) * 750), easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() =>
        spin.setValue(0),
      );
    });
  };

  const go = (target: string) => {
    const url = upgradeHttps(target);
    setSource((prev) => {
      if (prev.uri === url) {
        ref.current?.injectJavaScript(`location.href=${JSON.stringify(url)};true;`);
        return prev;
      }
      return withPrivacyHeaders(url);
    });
  };

  useEffect(() => {
    web.view = ref.current;
    web.load = (url: string) => {
      setHidden(false);
      go(url);
    };
    web.find = () => {
      setFound(null);
      setFindText('');
      setFinding(true);
    };
    web.capture = () => {
      const node = shot.current;
      if (!node) return;
      node.measure((_x, _y, w, h) => {
        if (!w || !h) return;
        const width = Math.min(1080, Math.round(cardWidth(Dimensions.get('window').width) * PixelRatio.get()));
        captureRef(node, { format: 'jpg', quality: 0.82, width, height: Math.round((width * h) / w), result: 'tmpfile' })
          .then((uri) => saveThumb(tabId, uri, w / h))
          .catch(() => {});
      });
    };
    return () => {
      clearTimeout(captureTimer);
      clearTimeout(tapTimer.current);
      web.view = null;
      web.canBack = false;
      web.load = () => {};
      web.capture = () => {};
      web.find = () => {};
    };
  }, [tabId, crashKey]);

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setKbTop(e.endCoordinates.screenY));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setKbTop(null));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const kbHeight = !covered && kbTop !== null && rootH ? Math.max(0, rootH - kbTop) : 0;
  const kbPad = Platform.OS === 'android' ? kbHeight : 0;
  const typing = kbHeight > 0 || finding;

  useEffect(() => {
    web.userAgent = userAgent ?? '';
  }, [userAgent]);

  const firstDesktop = useRef(desktop);
  useEffect(() => {
    if (firstDesktop.current === desktop) return;
    firstDesktop.current = desktop;
    const t = setTimeout(() => ref.current?.reload(), 60);
    return () => clearTimeout(t);
  }, [desktop]);

  const runFind = (q: string, step: number) => ref.current?.injectJavaScript(findScript(q, step));
  const endFind = () => {
    runFind('', 0);
    setFinding(false);
    setFound(null);
    Keyboard.dismiss();
  };

  useEffect(() => {
    if (typing) setHidden(true);
    else if (!covered) setHidden(false);
  }, [covered, typing]);

  const onNav = (e: WebViewNavigation) => {
    web.canBack = e.canGoBack;
    setCanBack(e.canGoBack);
    if (!/^https?:\/\//i.test(e.url)) return;
    const title = e.title && e.title !== e.url && !/^https?:\/\//i.test(e.title) ? e.title : undefined;
    updateTab(tabId, title ? { url: e.url, title } : { url: e.url });
    if (!e.loading && !isPrivate) addVisit(e.url, title ?? '');
  };

  const onMessage = (e: WebViewMessageEvent) => {
    let msg: { k?: string; v?: unknown };
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.k === 'icon' && typeof msg.v === 'string' && /^https?:\/\//i.test(msg.v)) {
      updateTab(tabId, { icon: msg.v });
      if (e.nativeEvent.url && !isPrivate) setVisitIcon(e.nativeEvent.url, msg.v);
    } else if (msg.k === 'tc' && typeof msg.v === 'string') {
      const l = luminance(msg.v.trim());
      if (l !== null) {
        setTopColor(msg.v.trim());
        onTone(l > 0.55);
      }
    } else if (msg.k === 'ver' && typeof msg.v === 'string') {
      setChromeVersion(parseInt(msg.v, 10) || 0);
    } else if (msg.k === 'go') {
      startLoading();
      Animated.timing(progress, { toValue: 0.12, duration: 160, useNativeDriver: true }).start();
      clearTimeout(tapTimer.current);
      tapTimer.current = setTimeout(() => {
        if (loadingNow.current) return;
        stopLoading();
        Animated.timing(progressOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => progress.setValue(0));
      }, 5000);
    } else if (msg.k === 'dir' && hideOnScroll) {
      setHidden(msg.v === 1);
    } else if (msg.k === 'ctx' && msg.v && typeof msg.v === 'object') {
      const v = msg.v as Partial<LinkInfo>;
      const f = frame.current;
      const info: LinkInfo = {
        link: String(v.link ?? ''),
        text: String(v.text ?? ''),
        img: String(v.img ?? ''),
        alt: String(v.alt ?? ''),
        x: f.x + (Number(v.x) || 0.5) * f.w,
        y: f.y + (Number(v.y) || 0.5) * f.h,
      };
      if (/^https?:/i.test(info.link) || /^(https?|data):/i.test(info.img)) onLinkMenu(info);
    } else if (msg.k === 'amp' && typeof msg.v === 'string' && getState().settings.deAmp) {
      const target = leaveAmp(msg.v, e.nativeEvent.url);
      if (target) go(tidyUrl(target));
    } else if (msg.k === 'find' && msg.v && typeof msg.v === 'object') {
      const v = msg.v as { n?: number; i?: number };
      setFound({ n: Number(v.n) || 0, i: Number(v.i) });
    } else if (msg.k === 'pull' && typeof msg.v === 'number') {
      Animated.timing(pull, { toValue: msg.v, duration: 90, useNativeDriver: true }).start();
    } else if (msg.k === 'pullEnd') {
      if (msg.v === true) ref.current?.reload();
      Animated.timing(pull, { toValue: 0, duration: msg.v === true ? 500 : 200, delay: msg.v === true ? 250 : 0, useNativeDriver: true }).start();
    }
  };

  const onProgress = (p: number) => {
    Animated.timing(progress, { toValue: p, duration: 120, useNativeDriver: true }).start();
  };

  const onShouldStart = (req: ShouldStartLoadRequest) => {
    const url = req.url;
    if (/^https?:/i.test(url)) {
      if (req.isTopFrame !== false) {
        const clean = cleanNavigation(url);
        if (clean) {
          go(clean);
          return false;
        }
      }
      return true;
    }
    if (/^data:/i.test(url)) return req.isTopFrame === false;
    if (/^(about|blob|javascript):/i.test(url)) return true;
    if (req.isTopFrame === false) return false;
    if (/^intent:/i.test(url)) {
      const fb = intentFallback(url);
      if (fb) go(tidyUrl(fb));
      return false;
    }
    Linking.openURL(url).catch(() => {});
    return false;
  };

  const [swipe] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy < -8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dy < -36 || g.vy < -0.4) onGrid();
      },
    }),
  );

  function edgeResponder(side: 'left' | 'right') {
    const dir = side === 'left' ? 1 : -1;
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dx * dir > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderGrant: () => setEdgeSide(side),
      onPanResponderMove: (_, g) => edge.setValue(Math.max(0, Math.min(1, (g.dx * dir) / 110))),
      onPanResponderRelease: (_, g) => {
        if (g.dx * dir > 110 || g.vx * dir > 0.8) {
          if (side === 'left') web.view?.goBack();
          else web.view?.goForward();
        }
        Animated.timing(edge, { toValue: 0, duration: 180, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => Animated.timing(edge, { toValue: 0, duration: 180, useNativeDriver: true }).start(),
    });
  }

  const [edgeLeft] = useState(() => edgeResponder('left'));
  const [edgeRight] = useState(() => edgeResponder('right'));

  const barOffset = BAR + insets.bottom + 20;
  const barBg = isPrivate ? PRIVATE_BAR : c.panel;
  const barText = isPrivate ? '#FFFFFF' : c.text;
  const barFaint = isPrivate ? 'rgba(255,255,255,0.4)' : c.faint;
  const host = prettyHost(tab.url) || tab.url;
  const beforeLoad =
    guard(darkOff, themeScript(c.dark, darkenSites)) +
    (blockPopups ? guard(popupsOff, DECLUTTER) : '') +
    (doNotTrack ? GPC_SCRIPT : '') +
    (deAmp ? AMP_SCRIPT : '') +
    LONG_PRESS +
    (Platform.OS === 'android' ? PULL_TO_REFRESH : '') +
    (desktop ? DESKTOP_VIEWPORT : '') +
    (Platform.OS === 'ios' ? textSizeScript(textZoom) : '');

  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: topColor }]}
      onLayout={(e) => setRootH(e.nativeEvent.layout.height)}
    >
      <View style={{ height: insets.top, backgroundColor: topColor }} />
      <View
        ref={shot}
        collapsable={false}
        onLayout={(e) => {
          const l = e.nativeEvent.layout;
          frame.current = { x: l.x, y: l.y, w: l.width, h: l.height };
        }}
        style={[styles.flex, { marginBottom: typing ? kbPad : hideOnScroll ? 0 : BAR + insets.bottom + 16 }]}
      >
        <WebView
          key={crashKey}
          ref={ref}
          source={source}
          style={styles.flex}
          originWhitelist={['*']}
          onShouldStartLoadWithRequest={onShouldStart}
          onNavigationStateChange={onNav}
          onMessage={onMessage}
          injectedJavaScript={PAGE_INFO}
          injectedJavaScriptBeforeContentLoaded={beforeLoad}
          onLoadStart={() => {
            loadingNow.current = true;
            startLoading();
          }}
          onLoadProgress={(e) => onProgress(e.nativeEvent.progress)}
          onError={(e) => setFailedUrl(e.nativeEvent.url || null)}
          onLoadEnd={() => {
            loadingNow.current = false;
            stopLoading();
            clearTimeout(captureTimer);
            captureTimer = setTimeout(() => web.capture(), 900);
            Animated.timing(progressOpacity, { toValue: 0, duration: 260, delay: 120, useNativeDriver: true }).start(() =>
              progress.setValue(0),
            );
          }}
          onOpenWindow={(e) => {
            const u = e.nativeEvent.targetUrl;
            if (/^https?:\/\//i.test(u)) onNewTab(u);
          }}
          renderLoading={() => <></>}
          renderError={(_domain, _code, desc) => (
            <LoadError
              c={c}
              url={failedUrl ?? tab.url}
              desc={desc}
              onRetry={() => ref.current?.reload()}
              onSearch={(q) => go(searchUrl(q, getState().settings.engine))}
              onHttp={wasUpgraded(failedUrl ?? tab.url) ? () => go(allowHttp(failedUrl ?? tab.url)) : undefined}
            />
          )}
          onRenderProcessGone={() => setCrashKey((k) => k + 1)}
          onContentProcessDidTerminate={() => ref.current?.reload()}
          allowsBackForwardNavigationGestures
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction
          pullToRefreshEnabled
          decelerationRate={0.998}
          contentInsetAdjustmentBehavior="never"
          setSupportMultipleWindows
          javaScriptCanOpenWindowsAutomatically={false}
          allowsLinkPreview={false}
          incognito={Platform.OS === 'ios' && isPrivate}
          cacheEnabled={!isPrivate}
          textZoom={Platform.OS === 'android' ? textZoom : undefined}
          allowsFullscreenVideo
          mixedContentMode="compatibility"
          domStorageEnabled
          javaScriptEnabled
          thirdPartyCookiesEnabled={!blockCookies}
          sharedCookiesEnabled
          webviewDebuggingEnabled={__DEV__}
          overScrollMode="content"
          forceDarkOn={c.dark}
          userAgent={userAgent}
          applicationNameForUserAgent={Platform.OS === 'ios' && !desktop ? IOS_APP_NAME : undefined}
        />
      </View>

      {Platform.OS === 'android' && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pull,
            {
              top: insets.top + 8,
              backgroundColor: c.surface,
              opacity: pull,
              transform: [
                { translateY: pull.interpolate({ inputRange: [0, 1], outputRange: [-30, 40] }) },
                { rotate: pull.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '300deg'] }) },
              ],
            },
          ]}
        >
          <Icon name="reload" size={20} color={c.text} weight={2.4} />
        </Animated.View>
      )}

      {Platform.OS === 'android' && !covered && !finding && (
        <>
          <View {...edgeLeft.panHandlers} style={[styles.edge, { left: 0, top: insets.top + 60, bottom: BAR + insets.bottom + 16 }]} />
          <View {...edgeRight.panHandlers} style={[styles.edge, { right: 0, top: insets.top + 60, bottom: BAR + insets.bottom + 16 }]} />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.edgeHint,
              {
                backgroundColor: c.surface,
                [edgeSide]: 8,
                opacity: edge,
                transform: [{ translateX: edge.interpolate({ inputRange: [0, 1], outputRange: edgeSide === 'left' ? [-40, 6] : [40, -6] }) }],
              },
            ]}
          >
            <Icon name={edgeSide === 'left' ? 'back' : 'forward'} size={20} color={c.text} weight={2.4} />
          </Animated.View>
        </>
      )}

      {finding && (
        <View style={[styles.findBar, { backgroundColor: c.panel, borderTopColor: c.line, bottom: kbHeight, paddingBottom: kbHeight ? 8 : insets.bottom + 8 }]}>
          <View style={[styles.findField, { backgroundColor: c.field }]}>
            <Icon name="search" size={16} color={c.sub} weight={2} />
            <TextInput
              autoFocus
              value={findText}
              onChangeText={(t) => {
                setFindText(t);
                runFind(t, 0);
              }}
              onSubmitEditing={() => runFind(findText, 1)}
              placeholder="Find in page"
              placeholderTextColor={c.sub}
              returnKeyType="search"
              submitBehavior="submit"
              style={[styles.findInput, { color: c.text }]}
              selectionColor={c.selection}
              selectionHandleColor={c.text}
              cursorColor={c.text}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {found && findText ? (
              <Text style={[styles.findCount, { color: c.sub }]}>{found.n ? `${found.i + 1} of ${found.n}` : 'No matches'}</Text>
            ) : null}
          </View>
          <Tap style={styles.findBtn} onPress={() => runFind(findText, -1)} accessibilityLabel="Previous match">
            <Icon name="up" size={18} color={c.text} weight={2.4} />
          </Tap>
          <Tap style={styles.findBtn} onPress={() => runFind(findText, 1)} accessibilityLabel="Next match">
            <Icon name="down" size={18} color={c.text} weight={2.4} />
          </Tap>
          <Tap onPress={endFind} hitSlop={8}>
            <Text style={[styles.findDone, { color: c.text }]}>Done</Text>
          </Tap>
        </View>
      )}

      <Animated.View
        {...swipe.panHandlers}
        style={[
          styles.dock,
          {
            bottom: insets.bottom + 8,
            transform: [{ translateY: hidden.interpolate({ inputRange: [0, 1], outputRange: [0, barOffset], extrapolate: 'clamp' }) }],
          },
        ]}
      >
        <Tap disabled={!canBack} onPress={() => ref.current?.goBack()} accessibilityLabel="Back" accessibilityState={{ disabled: !canBack }}>
          <Glass c={c} radius={(BAR - 4) / 2} tint={barBg} see={BAR_SEE} style={[styles.round, { height: BAR - 4 }]}>
            <Icon name="back" size={20} color={canBack ? barText : barFaint} weight={2.4} />
          </Glass>
        </Tap>
        <Glass c={c} radius={BAR / 2} tint={barBg} see={BAR_SEE} style={styles.pill}>
          <Tap style={styles.pillBtn} onPress={onMenu} accessibilityLabel="Page options">
            <Icon name="list" size={19} color={barText} weight={2.2} />
          </Tap>
          <Tap style={styles.host} onPress={onEdit} dim={0.6} scale={0.97} accessibilityLabel={`Edit address, ${host}`}>
            {isPrivate && <Icon name="eye" size={14} color={barText} weight={1.8} />}
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.hostText, { color: barText }]}>
              {host}
            </Text>
          </Tap>
          <Tap style={styles.pillBtn} onPress={() => ref.current?.reload()} accessibilityLabel="Reload">
            <Animated.View style={{ transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
              <Icon name="reload" size={18} color={barText} weight={2.2} />
            </Animated.View>
          </Tap>
          <Animated.View style={[styles.progress, { backgroundColor: c.sub, opacity: progressOpacity, transform: [{ scaleX: progress }] }]} />
        </Glass>
        <Tap onPress={onGrid} onLongPress={onSearch} delayLongPress={350} accessibilityLabel={`Show tabs, ${tabCount} open`} accessibilityHint="Long press for a new tab">
          <Glass c={c} radius={(BAR - 4) / 2} tint={barBg} see={BAR_SEE} style={[styles.round, { height: BAR - 4 }]}>
            <View style={[styles.count, { borderColor: barText }]}>
              <Text style={[styles.countText, { color: barText }]}>{tabCount > 99 ? '∞' : tabCount}</Text>
            </View>
          </Glass>
        </Tap>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pull: {
    position: 'absolute',
    alignSelf: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  edge: { position: 'absolute', width: EDGE },
  edgeHint: {
    position: 'absolute',
    top: '45%',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  findBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
    paddingHorizontal: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  findField: { flex: 1, height: 40, borderRadius: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 },
  findInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  findCount: { fontSize: 13 },
  findBtn: { width: 38, height: 40, alignItems: 'center', justifyContent: 'center' },
  findDone: { fontSize: 15, fontWeight: '600', paddingHorizontal: 8 },
  dock: { position: 'absolute', left: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  round: { width: BAR - 4, height: BAR, alignItems: 'center', justifyContent: 'center' },
  pill: { flex: 1, height: BAR, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2, overflow: 'hidden' },
  pillBtn: { width: 40, height: BAR, alignItems: 'center', justifyContent: 'center' },
  host: { flex: 1, height: BAR, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  hostText: { ...type.label, fontSize: 14, letterSpacing: -0.1 },
  count: { minWidth: 22, height: 22, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  countText: { fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] },
  progress: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, transformOrigin: 'left' },
});
