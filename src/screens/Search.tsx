import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  Animated,
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type KeyboardEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ENGINES, fetchSuggestions, looksLikeUrl, prettyHost, toUrl } from '../lib/url';
import { getState, useStore, type EngineId } from '../state/store';
import Favicon from '../ui/Favicon';
import Glass, { Frost } from '../ui/Glass';
import Icon from '../ui/Icon';
import Tap from '../ui/Tap';
import { motion, type, type Palette } from '../ui/theme';

type Props = {
  c: Palette;
  initial: string;
  editing: boolean;
  privateMode?: boolean;
  onSubmit: (url: string, privateMode: boolean) => void;
  onSwitch: (tabId: string) => void;
  onClose: () => void;
};

type Row =
  | { kind: 'go'; key: string; text: string; url: string }
  | { kind: 'search'; key: string; text: string; typed?: boolean }
  | { kind: 'tab'; key: string; id: string; title: string; url: string; icon?: string }
  | { kind: 'visit'; key: string; title: string; url: string; icon?: string; mark?: boolean };

const PILL_H = 52;
const PRIVATE: Partial<Palette> = {
  text: '#FFFFFF',
  sub: 'rgba(255,255,255,0.68)',
  faint: 'rgba(255,255,255,0.45)',
  fill: 'rgba(255,255,255,0.12)',
  glass: 'rgba(36,27,69,0.82)',
  glassStrong: 'rgba(255,255,255,0.14)',
  surface: '#3A2F66',
  glassEdge: 'rgba(185,168,255,0.28)',
  selection: 'rgba(255,255,255,0.3)',
  accent: '#B9A8FF',
  onBg: '#FFFFFF',
};

const cache = new Map<string, string[]>();
let lastRemote: { engine: EngineId; q: string; list: string[] } | null = null;

function cachedFor(engine: EngineId, q: string): string[] | null {
  const hit = cache.get(`${engine}:${q.toLowerCase()}`);
  if (hit) return hit;
  if (lastRemote && lastRemote.engine === engine && q.toLowerCase().startsWith(lastRemote.q.toLowerCase())) {
    const n = q.toLowerCase();
    return lastRemote.list.filter((s) => s.toLowerCase().startsWith(n));
  }
  return null;
}

export default function Search({ c: base, initial, editing, privateMode = false, onSubmit, onSwitch, onClose }: Props) {
  const [priv, setPriv] = useState(privateMode);
  const c: Palette = priv ? { ...base, ...PRIVATE } : base;
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const engine = useStore((s) => s.settings.engine);
  const suggest = useStore((s) => s.settings.suggestions);
  const [text, setText] = useState(initial);
  const [remote, setRemote] = useState<string[]>([]);
  const [kbTop, setKbTop] = useState<number | null>(null);
  const [rootH, setRootH] = useState(0);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [anim] = useState(() => new Animated.Value(0));
  const firstFetch = useRef(true);

  const close = () => {
    Keyboard.dismiss();
    Animated.timing(anim, { toValue: 0, duration: motion.quick, easing: motion.exit, useNativeDriver: true }).start(() => onClose());
  };

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, damping: 24, stiffness: 320, mass: 0.8 }).start();
    const t = setTimeout(() => input.current?.focus(), Platform.OS === 'android' ? 60 : 0);
    const onShow = (e: KeyboardEvent) => setKbTop(e.endCoordinates.screenY);
    const onHide = () => setKbTop(null);
    const ios = Platform.OS === 'ios';
    const subs = [
      ...(ios
        ? [Keyboard.addListener('keyboardWillShow', onShow), Keyboard.addListener('keyboardWillChangeFrame', onShow)]
        : [Keyboard.addListener('keyboardDidShow', onShow)]),
      Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', onHide),
      BackHandler.addEventListener('hardwareBackPress', () => {
        close();
        return true;
      }),
    ];
    if (getState().settings.suggestions && ENGINES[getState().settings.engine].suggest) {
      fetchSuggestions(getState().settings.engine, 'a', new AbortController().signal).catch(() => {});
    }
    return () => {
      clearTimeout(t);
      subs.forEach((s) => s.remove());
    };
  }, []);

  const q = text.trim();
  const wantRemote = suggest && !!q && !looksLikeUrl(q) && !(editing && q === initial.trim());

  useEffect(() => {
    if (!wantRemote) return;
    if (cache.has(`${engine}:${q.toLowerCase()}`)) return;
    const ctrl = new AbortController();
    const delay = firstFetch.current ? 0 : 40;
    firstFetch.current = false;
    const t = setTimeout(() => {
      fetchSuggestions(engine, q, ctrl.signal)
        .then((list) => {
          cache.set(`${engine}:${q.toLowerCase()}`, list);
          if (cache.size > 200) cache.delete(cache.keys().next().value as string);
          lastRemote = { engine, q, list };
          setRemote(list);
        })
        .catch(() => {});
    }, delay);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, engine, wantRemote]);

  const shown = wantRemote ? (cachedFor(engine, q) ?? remote) : [];
  const { first, suggestions, local } = buildRows(q, shown, engine, priv);
  const H = rootH || height;
  const kb = kbTop === null ? 0 : Math.max(0, H - kbTop);
  const pillBottom = kb > 0 ? kb + 10 : insets.bottom + 14;

  const submit = (value: string) => {
    const url = toUrl(value, engine);
    if (!url) return;
    Keyboard.dismiss();
    onSubmit(url, priv);
  };

  const pick = (r: Row) => {
    if (r.kind === 'tab') {
      Keyboard.dismiss();
      onSwitch(r.id);
    } else if (r.kind === 'search') submit(r.text);
    else onSubmit(r.url, priv);
  };

  const fillIn = (value: string) => {
    setText(`${value} `);
    input.current?.focus();
  };

  return (
    <View style={StyleSheet.absoluteFill} onLayout={(e) => setRootH(e.nativeEvent.layout.height)}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: anim }]}>
        <Frost color={priv ? 'rgba(28,20,56,0.97)' : c.dark ? 'rgba(29,31,34,0.97)' : 'rgba(241,243,245,0.97)'} />
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close search" />
      </Animated.View>

      <Animated.View
        style={[
          styles.list,
          {
            top: insets.top + 6,
            bottom: pillBottom + PILL_H + 10,
            opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
          },
        ]}
        pointerEvents="box-none"
      >
        <ScrollView
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {first && (
            <>
              <Text style={[styles.head, { color: c.sub }]}>
                {first.kind === 'go' ? 'Website' : priv ? 'Private search' : `${ENGINES[engine].name} Suggestions`}
              </Text>
              <SuggestionRow row={first} c={c} q={q} highlight onPress={() => pick(first)} />
            </>
          )}
          {suggestions.map((r) => (
            <SuggestionRow key={r.key} row={r} c={c} q={q} onPress={() => pick(r)} onFill={r.kind === 'search' ? () => fillIn(r.text) : undefined} />
          ))}
          {local.length > 0 && (
            <>
              <Text style={[styles.head, { color: c.sub, marginTop: first ? 18 : 0 }]}>{q ? 'Tabs, bookmarks and history' : 'Recent'}</Text>
              {local.map((r) => (
                <SuggestionRow key={r.key} row={r} c={c} q={q} onPress={() => pick(r)} />
              ))}
            </>
          )}
        </ScrollView>
      </Animated.View>

      <Animated.View
        style={[
          styles.inputRow,
          {
            bottom: pillBottom,
            opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [Math.min(80, H * 0.1), 0] }) }],
          },
        ]}
      >
        <Glass c={c} radius={PILL_H / 2} tint={c.surface} style={styles.pill}>
          {!editing && (
            <Tap
              hitSlop={8}
              onPress={() => setPriv((v) => !v)}
              style={[styles.eye, priv && { backgroundColor: 'rgba(255,255,255,0.16)' }]}
              accessibilityRole="switch"
              accessibilityState={{ checked: priv }}
              accessibilityLabel="Private search"
            >
              <Icon name={priv ? 'eye' : 'eyeOff'} size={19} color={priv ? '#FFFFFF' : c.sub} weight={2} />
            </Tap>
          )}
          <TextInput
            ref={input}
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => submit(text)}
            placeholder={editing ? 'Enter address' : priv ? 'Search privately' : 'Search or enter address'}
            placeholderTextColor={c.sub}
            style={[styles.input, { color: c.text }]}
            selectionColor={c.selection}
            selectionHandleColor={c.text}
            cursorColor={c.text}
            returnKeyType="go"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            keyboardType={Platform.OS === 'ios' ? 'web-search' : 'default'}
            selectTextOnFocus={editing}
            submitBehavior="blurAndSubmit"
          />
          {text.length > 0 && (
            <Tap hitSlop={12} onPress={() => setText('')} style={[styles.clear, { backgroundColor: c.text }]} accessibilityLabel="Clear text">
              <Icon name="close" size={10} color={priv ? '#241B45' : c.surface} weight={2.6} />
            </Tap>
          )}
        </Glass>
        <Tap onPress={close} accessibilityLabel="Close search">
          <Glass c={c} radius={PILL_H / 2} strong style={styles.closeBtn}>
            <Icon name="close" size={17} color={c.onBg} weight={2.2} />
          </Glass>
        </Tap>
      </Animated.View>
    </View>
  );
}

function buildRows(q: string, remote: string[], engine: EngineId, priv: boolean) {
  const { tabs, history, bookmarks } = getState();
  const needle = q.toLowerCase();
  let first: Row | null = null;
  const suggestions: Row[] = [];
  const local: Row[] = [];
  if (needle) {
    const direct = toUrl(q, engine);
    first = direct && looksLikeUrl(q) ? { kind: 'go', key: 'go', text: q, url: direct } : { kind: 'search', key: 'q', text: q, typed: true };
    remote
      .filter((s) => s.toLowerCase() !== needle)
      .slice(0, 8)
      .forEach((s) => suggestions.push({ kind: 'search', key: `s${s}`, text: s }));
  }
  if (priv) return { first, suggestions, local };
  if (!needle) {
    history.slice(0, 8).forEach((v) => local.push({ kind: 'visit', key: `v${v.url}`, title: v.title, url: v.url, icon: v.icon }));
    return { first, suggestions, local };
  }
  const match = (title: string, url: string) =>
    title.toLowerCase().includes(needle) || url.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').includes(needle);
  const tabHits = tabs.filter((t) => !t.private && match(t.name || t.title, t.url)).slice(0, 2);
  const seen = new Set(tabHits.map((t) => t.url));
  tabHits.forEach((t) => local.push({ kind: 'tab', key: `t${t.id}`, id: t.id, title: t.name || t.title, url: t.url, icon: t.icon }));
  bookmarks
    .filter((b) => !seen.has(b.url) && match(b.name || b.title, b.url))
    .slice(0, 2)
    .forEach((b) => {
      seen.add(b.url);
      local.push({ kind: 'visit', key: `b${b.id}`, title: b.name || b.title, url: b.url, icon: b.icon, mark: true });
    });
  history
    .filter((v) => !seen.has(v.url) && match(v.title, v.url))
    .slice(0, 3)
    .forEach((v) => local.push({ kind: 'visit', key: `v${v.url}`, title: v.title, url: v.url, icon: v.icon }));
  return { first, suggestions, local };
}

function Completion({ text, q, c, strong }: { text: string; q: string; c: Palette; strong?: boolean }) {
  const at = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (at !== 0 || strong) {
    return (
      <Text numberOfLines={1} style={[styles.rowTitle, { color: c.text, fontWeight: strong ? '600' : '400' }]}>
        {text}
      </Text>
    );
  }
  return (
    <Text numberOfLines={1} style={[styles.rowTitle, { color: c.sub }]}>
      <Text style={{ color: c.text, fontWeight: '500' }}>{text.slice(0, q.length)}</Text>
      {text.slice(q.length)}
    </Text>
  );
}

function SuggestionRow({ row, c, q, highlight, onPress, onFill }: { row: Row; c: Palette; q: string; highlight?: boolean; onPress: () => void; onFill?: () => void }) {
  let sub: string | null = null;
  if (row.kind === 'go') sub = 'Open website';
  else if (row.kind === 'tab') sub = 'Switch to tab';
  else if (row.kind === 'visit') sub = row.mark ? `Bookmark · ${prettyHost(row.url)}` : prettyHost(row.url);

  return (
    <Tap onPress={onPress} style={[styles.row, highlight && { backgroundColor: c.glassStrong }]} dim={0.6} scale={0.98}>
      <View style={[styles.lead, { backgroundColor: row.kind === 'search' || row.kind === 'go' ? c.fill : 'transparent' }]}>
        {row.kind === 'search' ? (
          <Icon name="search" size={17} color={c.text} weight={2.2} />
        ) : row.kind === 'go' ? (
          <Icon name="external" size={16} color={c.text} weight={2.2} />
        ) : (
          <Favicon url={row.url} icon={row.icon} size={24} c={c} radius={7} />
        )}
      </View>
      <View style={styles.flex}>
        {row.kind === 'search' ? (
          <Completion text={row.text} q={q} c={c} strong={row.typed} />
        ) : (
          <Text numberOfLines={1} style={[styles.rowTitle, { color: c.text, fontWeight: row.kind === 'go' ? '600' : '400' }]}>
            {row.kind === 'go' ? row.text : row.title || prettyHost(row.url)}
          </Text>
        )}
        {sub && (
          <Text numberOfLines={1} style={[styles.rowSub, { color: row.kind === 'tab' ? c.text : c.sub }]}>
            {sub}
          </Text>
        )}
      </View>
      {onFill && (
        <Tap hitSlop={10} onPress={onFill} style={styles.fill} accessibilityLabel={`Use "${row.kind === 'search' ? row.text : ''}"`}>
          <Icon name="fill" size={20} color={c.faint} weight={1.8} />
        </Tap>
      )}
    </Tap>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { position: 'absolute', left: 0, right: 0 },
  listContent: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, flexGrow: 1, justifyContent: 'flex-end' },
  head: { ...type.label, paddingHorizontal: 14, marginBottom: 6 },
  row: { minHeight: 52, borderRadius: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 12 },
  lead: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16, lineHeight: 21 },
  rowSub: { ...type.caption, marginTop: 1 },
  fill: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  inputRow: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pill: { flex: 1, height: PILL_H, flexDirection: 'row', alignItems: 'center', paddingLeft: 10, paddingRight: 14, gap: 6 },
  eye: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, fontSize: 16, paddingVertical: 0, height: PILL_H - 2, paddingLeft: 4 },
  clear: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  closeBtn: { width: PILL_H, height: PILL_H, alignItems: 'center', justifyContent: 'center' },
});
