import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  FlatList,
  Image,
  LayoutAnimation,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardWidth, tabLabel } from '../lib/tabs';
import { prettyHost } from '../lib/url';
import { closeTab, closeUnpinned, reopenTab, thumbUri, useStore, type Tab } from '../state/store';
import Favicon from '../ui/Favicon';
import Glass, { GlassScope, GlassTarget } from '../ui/Glass';
import Icon from '../ui/Icon';
import Tap from '../ui/Tap';
import { motion, pastel, type, type Palette } from '../ui/theme';

type Props = {
  c: Palette;
  startPrivate: boolean;
  onOpen: (id: string) => void;
  onNew: (privateMode: boolean) => void;
  onDone: () => void;
  onMenu: (id: string) => void;
};

const GAP = 16;
const TITLE_H = 34;
const BAR_H = 48;
const TOP_H = 44;
const LIFT = 0;

export default function Tabs({ c, startPrivate, onOpen, onNew, onDone, onMenu }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tabs = useStore((s) => s.tabs);
  const activeId = useStore((s) => s.activeId);
  const [priv, setPriv] = useState(startPrivate);
  const [query, setQuery] = useState<string | null>(null);
  const [areaH, setAreaH] = useState(0);
  const [closed, setClosed] = useState<Tab | null>(null);
  const [enter] = useState(() => new Animated.Value(0));
  const [snack] = useState(() => new Animated.Value(0));
  const snackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const field = useRef<ComponentRef<typeof TextInput>>(null);
  const carousel = useRef<FlatList<Tab>>(null);
  const settle = useRef<number | null>(null);

  useEffect(() => {
    Animated.spring(enter, { toValue: 1, useNativeDriver: true, damping: 24, stiffness: 280, mass: 0.85 }).start();
    return () => clearTimeout(snackTimer.current);
  }, [enter]);

  useEffect(() => {
    if (query === null) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setQuery(null);
      return true;
    });
    return () => sub.remove();
  }, [query]);

  const needle = query?.trim().toLowerCase() ?? '';
  const list = tabs
    .filter((t) => !t.pinned && !!t.private === priv)
    .filter((t) => !needle || t.title.toLowerCase().includes(needle) || t.url.toLowerCase().includes(needle))
    .reverse();
  const normalCount = tabs.filter((t) => !t.pinned && !t.private).length;

  useEffect(() => {
    const target = settle.current;
    if (target === null) return;
    settle.current = null;
    if (!list.length) return;
    const t = setTimeout(() => carousel.current?.scrollToOffset({ offset: Math.min(target, list.length - 1) * (cardWidth(width) + GAP), animated: true }), 16);
    return () => clearTimeout(t);
  }, [list.length, width]);
  const privateCount = tabs.filter((t) => t.private).length;

  const cardW = cardWidth(width);
  const item = cardW + GAP;
  const cardH = Math.round(Math.min(cardW * 2.1, Math.max(0, areaH - LIFT - TITLE_H - 8)));
  const activeIndex = list.findIndex((t) => t.id === activeId);
  const initialIndex = activeIndex >= 0 ? activeIndex : Math.max(0, list.length - 1);

  const close = (id: string) => {
    const tab = tabs.find((t) => t.id === id);
    const at = list.findIndex((t) => t.id === id);
    if (at >= 0) settle.current = Math.max(0, Math.min(at, list.length - 2));
    LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'));
    closeTab(id);
    if (!tab || tab.private) return;
    setClosed(tab);
    clearTimeout(snackTimer.current);
    Animated.timing(snack, { toValue: 1, duration: motion.base, easing: motion.enter, useNativeDriver: true }).start();
    snackTimer.current = setTimeout(hideSnack, 4000);
  };

  const hideSnack = () => {
    Animated.timing(snack, { toValue: 0, duration: motion.quick, easing: motion.exit, useNativeDriver: true }).start(() => setClosed(null));
  };

  const undo = () => {
    if (closed) reopenTab(closed);
    clearTimeout(snackTimer.current);
    hideSnack();
  };

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: enter.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
            transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
          },
        ]}
      >
        <GlassScope>
          <GlassTarget style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, paddingTop: insets.top + 8 + TOP_H }]}>
            <View style={[styles.area, { marginBottom: insets.bottom + BAR_H + 28 }]} onLayout={(e) => setAreaH(e.nativeEvent.layout.height)}>
              {list.length > 0 && cardH > 0 ? (
                <FlatList
                  ref={carousel}
                  style={styles.carousel}
                  key={`${cardW}-${priv}`}
                  data={list}
                  keyExtractor={(t) => t.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="normal"
                  initialScrollIndex={Math.min(initialIndex, list.length - 1)}
                  getItemLayout={(_, index) => ({ length: item, offset: item * index, index })}
                  contentContainerStyle={{ paddingHorizontal: (width - item) / 2, alignItems: 'flex-end' }}
                  initialNumToRender={Math.min(list.length, 12)}
                  maxToRenderPerBatch={8}
                  updateCellsBatchingPeriod={16}
                  windowSize={21}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item: tab }) => <TabCard tab={tab} c={c} w={cardW} h={cardH} onOpen={onOpen} onMenu={onMenu} onClose={close} />}
                />
              ) : (
                <View style={styles.emptyWrap}>
                  <Text style={[styles.emptyTitle, { color: c.onBg }]}>
                    {needle ? 'No matching tabs' : priv ? 'No private tabs' : 'No open tabs'}
                  </Text>
                  <Text style={[styles.emptyText, { color: c.onBg }]}>
                    {needle ? 'Try another word.' : priv ? 'Private tabs leave no history on this phone.' : 'Tap + to open one.'}
                  </Text>
                </View>
              )}
            </View>
          </GlassTarget>

          <View style={[styles.top, { top: insets.top + 8 }]}>
            {query === null ? (
              <Tap
                onPress={() => {
                  setQuery('');
                  setTimeout(() => field.current?.focus(), 60);
                }}
                accessibilityLabel="Search tabs"
              >
                <Glass c={c} radius={24} style={styles.roundSm}>
                  <Icon name="search" size={19} color={c.onBg} weight={2.2} />
                </Glass>
              </Tap>
            ) : (
              <Glass c={c} radius={24} strong style={styles.findPill}>
                <Icon name="search" size={17} color={c.sub} weight={2.2} />
                <TextInput
                  ref={field}
                  value={query}
                  onChangeText={setQuery}
                  placeholder={priv ? 'Search private tabs' : 'Search tabs'}
                  placeholderTextColor={c.sub}
                  style={[styles.findInput, { color: c.text }]}
                  selectionColor={c.selection}
                  selectionHandleColor={c.text}
                  cursorColor={c.text}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                />
                <Tap onPress={() => setQuery(null)} hitSlop={10} accessibilityLabel="Stop searching">
                  <Icon name="close" size={14} color={c.sub} weight={2.2} />
                </Tap>
              </Glass>
            )}
            {query === null && list.length > 1 && !priv && (
              <Tap
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'));
                  closeUnpinned();
                }}
                accessibilityLabel="Close all unpinned tabs"
              >
                <Glass c={c} radius={22} style={styles.textPill}>
                  <Text style={[styles.textPillLabel, { color: c.onBg }]}>Close all</Text>
                </Glass>
              </Tap>
            )}
          </View>

          {closed && (
            <Animated.View
              style={[
                styles.snackWrap,
                {
                  bottom: insets.bottom + BAR_H + 24,
                  opacity: snack,
                  transform: [{ translateY: snack.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
                },
              ]}
            >
              <Glass c={c} radius={18} strong style={styles.snack}>
                <Text numberOfLines={1} style={[styles.snackText, { color: c.text }]}>
                  Closed {tabLabel(closed)}
                </Text>
                <Tap onPress={undo} hitSlop={10} accessibilityLabel="Undo close">
                  <Text style={[styles.snackAction, { color: c.text }]}>Undo</Text>
                </Tap>
              </Glass>
            </Animated.View>
          )}

          <View style={[styles.bar, { bottom: insets.bottom + 10 }]}>
            <Tap onPress={() => onNew(priv)} accessibilityLabel={priv ? 'New private tab' : 'New tab'}>
              <Glass c={c} radius={BAR_H / 2} style={styles.round}>
                <Icon name="plus" size={22} color={c.onBg} weight={2.4} />
              </Glass>
            </Tap>
            <Toggle c={c} priv={priv} privateCount={privateCount} normalCount={normalCount} onPick={setPriv} />
          <Tap onPress={onDone} accessibilityLabel="Done">
              <View style={[styles.round, styles.done, { backgroundColor: c.text }]}>
                <Icon name="check" size={20} color={c.dark ? c.bg : '#FFFFFF'} weight={2.6} />
              </View>
            </Tap>
          </View>
        </GlassScope>
      </Animated.View>
    </View>
  );
}

function Toggle({
  c,
  priv,
  privateCount,
  normalCount,
  onPick,
}: {
  c: Palette;
  priv: boolean;
  privateCount: number;
  normalCount: number;
  onPick: (v: boolean) => void;
}) {
  const [textW, setTextW] = useState([0, 0]);
  const index = priv ? 0 : 1;
  const [x] = useState(() => new Animated.Value(index));
  const ready = textW[0] > 0 && textW[1] > 0;
  const segW = Math.ceil(Math.max(textW[0], textW[1])) + 32;

  useEffect(() => {
    Animated.spring(x, { toValue: index, useNativeDriver: true, damping: 22, stiffness: 320, mass: 0.8 }).start();
  }, [index, x]);

  const items = [
    { key: true, label: privateCount ? `Private · ${privateCount}` : 'Private' },
    { key: false, label: `${normalCount} ${normalCount === 1 ? 'Tab' : 'Tabs'}` },
  ];

  return (
    <Glass c={c} radius={BAR_H / 2} style={styles.toggle}>
      {ready && (
        <Animated.View
          style={[
            styles.toggleOn,
            { width: segW, backgroundColor: c.glassStrong, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, segW] }) }] },
          ]}
        />
      )}
      {items.map((o, i) => {
        const on = priv === o.key;
        return (
          <Pressable
            key={String(o.key)}
            onPress={() => onPick(o.key)}
            style={[styles.toggleItem, ready && { width: segW, paddingHorizontal: 0 }]}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
          >
            <Text
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                setTextW((prev) => (prev[i] === w ? prev : i ? [prev[0], w] : [w, prev[1]]));
              }}
              style={[styles.toggleText, { color: c.onBg, opacity: on ? 1 : 0.64 }]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </Glass>
  );
}

type CardProps = {
  tab: Tab;
  c: Palette;
  w: number;
  h: number;
  onOpen: (id: string) => void;
  onMenu: (id: string) => void;
  onClose: (id: string) => void;
};

function TabCard({ tab, c, w, h, onOpen, onMenu, onClose }: CardProps) {
  const [y] = useState(() => new Animated.Value(0));
  const host = prettyHost(tab.url);

  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy < -10 && Math.abs(g.dy) > Math.abs(g.dx) * 1.4,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => y.setValue(Math.min(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy < -h * 0.22 || g.vy < -0.7) {
          Animated.timing(y, { toValue: -h * 1.5, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => onClose(tab.id));
        } else {
          Animated.spring(y, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 9 }).start();
        }
      },
      onPanResponderTerminate: () => Animated.spring(y, { toValue: 0, useNativeDriver: true }).start(),
    }),
  );

  const thumbH = tab.ratio ? w / tab.ratio : h;

  return (
    <View style={{ width: w + GAP, paddingHorizontal: GAP / 2 }}>
      <Animated.View
        {...pan.panHandlers}
        style={{
          transform: [{ translateY: y }, { scale: y.interpolate({ inputRange: [-h, 0], outputRange: [0.86, 1], extrapolate: 'clamp' }) }],
          opacity: y.interpolate({ inputRange: [-h, 0], outputRange: [0, 1], extrapolate: 'clamp' }),
        }}
      >
        <View style={styles.titleRow}>
          {tab.private ? (
            <View style={styles.privateDot}>
              <Icon name="eye" size={13} color="#FFFFFF" weight={1.8} />
            </View>
          ) : (
            <Favicon url={tab.url} icon={tab.icon} size={18} c={c} radius={9} />
          )}
          <Text numberOfLines={1} style={[styles.cardTitle, { color: c.onBg }]}>
            {tabLabel(tab)}
          </Text>
          <Tap hitSlop={10} onPress={() => onClose(tab.id)} accessibilityLabel={`Close ${tabLabel(tab)}`}>
            <Glass c={c} radius={13} strong style={styles.cardClose}>
              <Icon name="close" size={10} color={c.onBg} weight={2.2} />
            </Glass>
          </Tap>
        </View>
        <Pressable
          onPress={() => onOpen(tab.id)}
          onLongPress={() => onMenu(tab.id)}
          delayLongPress={320}
          unstable_pressDelay={60}
          android_disableSound
          accessibilityRole="button"
          accessibilityHint="Swipe up to close"
          style={[
            styles.card,
            { width: w, height: h, borderColor: c.glassEdge, backgroundColor: tab.thumb ? c.surface : pastel(host, c.dark) },
            tab.private && styles.privateCard,
          ]}
        >
          {tab.thumb ? (
            <Image source={{ uri: thumbUri(tab.thumb) }} style={{ width: w, height: thumbH }} resizeMethod="resize" fadeDuration={0} />
          ) : (
            <View style={styles.placeholder}>
              <Favicon url={tab.url} icon={tab.icon} size={48} c={c} radius={14} />
              <Text numberOfLines={1} style={[styles.placeholderHost, { color: c.sub }]}>
                {host}
              </Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 0, right: 0, height: TOP_H, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, gap: 10 },
  roundSm: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  findPill: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  findInput: { flex: 1, ...type.body, paddingVertical: 0 },
  textPill: { height: 40, paddingHorizontal: 16, justifyContent: 'center' },
  textPillLabel: { ...type.label },
  area: { flex: 1, justifyContent: 'center', paddingBottom: LIFT },
  carousel: { flexGrow: 0 },
  titleRow: { height: TITLE_H, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, marginBottom: 6 },
  cardTitle: { flex: 1, ...type.label, fontWeight: '500', includeFontPadding: false },
  cardClose: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 22, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  privateCard: { borderWidth: 2, borderColor: '#9C8BFF' },
  privateDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#5B45C8', alignItems: 'center', justifyContent: 'center' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 16 },
  placeholderHost: { ...type.caption },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 40 },
  emptyTitle: { ...type.title },
  emptyText: { ...type.body, textAlign: 'center', opacity: 0.78 },
  snackWrap: { position: 'absolute', left: 16, right: 16 },
  snack: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18 },
  snackText: { flex: 1, ...type.body },
  snackAction: { ...type.label, fontSize: 15 },
  bar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  round: { width: BAR_H, height: BAR_H, borderRadius: BAR_H / 2, alignItems: 'center', justifyContent: 'center' },
  done: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  toggle: { flexDirection: 'row', height: BAR_H, padding: 4 },
  toggleOn: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: (BAR_H - 8) / 2 },
  toggleItem: { height: BAR_H - 8, borderRadius: (BAR_H - 8) / 2, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  toggleText: { ...type.label, fontSize: 14, fontVariant: ['tabular-nums'] },
});
