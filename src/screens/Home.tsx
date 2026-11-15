import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, Image, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabLabel } from '../lib/tabs';
import { wallpaperSource } from '../lib/wallpaper';
import { useStore, type Tab } from '../state/store';
import Favicon from '../ui/Favicon';
import Glass, { GlassScope, GlassTarget } from '../ui/Glass';
import Icon from '../ui/Icon';
import Sticker from '../ui/Sticker';
import Tap from '../ui/Tap';
import { type, type Palette } from '../ui/theme';
import { Bookmarks, History } from './Library';

type Props = {
  c: Palette;
  canReturn: boolean;
  onReturn: () => void;
  onOpenTab: (id: string) => void;
  onOpenUrl: (url: string) => void;
  onSearch: () => void;
  onTabs: () => void;
  onSettings: () => void;
  onTabMenu: (id: string) => void;
  onRenameBookmark: (id: string) => void;
};

const PAGES = ['History', 'Home', 'Bookmarks'] as const;
const SEG_H = 44;
const BAR_H = 48;
const COLS = 4;
const GAP = 14;

export default function Home({ c, canReturn, onReturn, onOpenTab, onOpenUrl, onSearch, onTabs, onSettings, onTabMenu, onRenameBookmark }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pager = useRef<ComponentRef<typeof ScrollView>>(null);
  const [x] = useState(() => new Animated.Value(width));
  const [enter] = useState(() => new Animated.Value(0));
  const tabCount = useStore((s) => s.tabs.filter((t) => !t.pinned && !t.private).length);

  useEffect(() => {
    Animated.spring(enter, { toValue: 1, useNativeDriver: true, damping: 24, stiffness: 300, mass: 0.85 }).start();
  }, [enter]);

  const segW = (width - 32 - 8) / PAGES.length;
  const top = insets.top + 8 + SEG_H + GAP;
  const bottom = insets.bottom + BAR_H + 28;
  const paneBottom = insets.bottom + 10 + BAR_H + GAP;
  const go = (i: number) => pager.current?.scrollTo({ x: i * width, animated: true });
  const pageMotion = (i: number) => {
    const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
    return {
      opacity: x.interpolate({ inputRange, outputRange: [0.4, 1, 0.4], extrapolate: 'clamp' as const }),
      transform: [{ scale: x.interpolate({ inputRange, outputRange: [0.93, 1, 0.93], extrapolate: 'clamp' as const }) }],
    };
  };

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: enter.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
            transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [1.03, 1] }) }],
          },
        ]}
      >
        <GlassScope>
          <GlassTarget style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }]}>
            <Wallpaper c={c} />
            <Animated.ScrollView
              ref={pager}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: width, y: 0 }}
              scrollEventThrottle={16}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { x } } }], { useNativeDriver: true })}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{ width, paddingTop: top, paddingBottom: paneBottom }}>
                <Animated.View style={[styles.flex, pageMotion(0)]}>
                  <Glass c={c} radius={28} style={styles.listPane}>
                    <History c={c} onOpenUrl={onOpenUrl} bottom={16} />
                  </Glass>
                </Animated.View>
              </View>
              <ScrollView style={{ width }} contentContainerStyle={{ paddingTop: top, paddingBottom: bottom }} showsVerticalScrollIndicator={false}>
                <Animated.View style={pageMotion(1)}>
                  <Pinned c={c} width={width} onOpen={onOpenTab} onMenu={onTabMenu} onSettings={onSettings} />
                </Animated.View>
              </ScrollView>
              <View style={{ width, paddingTop: top, paddingBottom: paneBottom }}>
                <Animated.View style={[styles.flex, pageMotion(2)]}>
                  <Glass c={c} radius={28} style={styles.listPane}>
                    <Bookmarks c={c} onOpenUrl={onOpenUrl} onRename={onRenameBookmark} bottom={16} />
                  </Glass>
                </Animated.View>
              </View>
            </Animated.ScrollView>
          </GlassTarget>

          <Glass c={c} radius={SEG_H / 2} style={[styles.seg, { top: insets.top + 8 }]}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.segOn,
                {
                  width: segW,
                  backgroundColor: c.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
                  borderRadius: (SEG_H - 8) / 2,
                  transform: [{ translateX: x.interpolate({ inputRange: [0, width * 2], outputRange: [0, segW * 2], extrapolate: 'clamp' }) }],
                },
              ]}
            />
            {PAGES.map((p, i) => (
              <Tap key={p} style={[styles.segItem, { width: segW }]} onPress={() => go(i)} accessibilityRole="tab" accessibilityLabel={p}>
                <Animated.Text
                  style={[
                    styles.segText,
                    {
                      color: c.onBg,
                      opacity: x.interpolate({
                        inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                        outputRange: [0.5, 1, 0.5],
                        extrapolate: 'clamp',
                      }),
                    },
                  ]}
                >
                  {p}
                </Animated.Text>
              </Tap>
            ))}
          </Glass>

          <View style={[styles.bar, { bottom: insets.bottom + 10 }]}>
            <Tap disabled={!canReturn} onPress={onReturn} accessibilityLabel="Back to page" accessibilityState={{ disabled: !canReturn }}>
              <Glass c={c} radius={BAR_H / 2} style={styles.round}>
                <Icon name="back" size={20} color={canReturn ? c.onBg : c.faint} weight={2.4} />
              </Glass>
            </Tap>
            <Tap style={styles.flex} onPress={onSearch} dim={0.75} accessibilityRole="search" accessibilityLabel="Search or enter address">
              <Glass c={c} radius={BAR_H / 2} strong style={styles.searchPill}>
                <Icon name="search" size={18} color={c.sub} weight={2.2} />
                <Text numberOfLines={1} style={[styles.searchText, { color: c.sub }]}>
                  Search or enter address
                </Text>
              </Glass>
            </Tap>
            <Tap onPress={onTabs} accessibilityLabel={`Show tabs, ${tabCount} open`}>
              <Glass c={c} radius={BAR_H / 2} style={styles.round}>
                <View style={[styles.count, { borderColor: c.onBg }]}>
                  <Text style={[styles.countText, { color: c.onBg }]}>{tabCount > 99 ? '∞' : tabCount}</Text>
                </View>
              </Glass>
            </Tap>
          </View>
        </GlassScope>
      </Animated.View>
    </View>
  );
}

function Wallpaper({ c }: { c: Palette }) {
  const kind = useStore((s) => s.settings.wallpaper);
  const uri = useStore((s) => s.settings.wallpaperUri);
  const source = wallpaperSource(kind, uri);
  if (!source) return null;
  return (
    <>
      <Image source={source} style={StyleSheet.absoluteFill} resizeMode="cover" resizeMethod="resize" fadeDuration={0} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c.dark ? 'rgba(14,15,17,0.42)' : 'rgba(241,243,245,0.3)' }]} />
    </>
  );
}

function Pinned({
  c,
  width,
  onOpen,
  onMenu,
  onSettings,
}: {
  c: Palette;
  width: number;
  onOpen: (id: string) => void;
  onMenu: (id: string) => void;
  onSettings: () => void;
}) {
  const tabs = useStore((s) => s.tabs);
  const pinned = tabs.filter((t) => t.pinned);
  const cell = (width - 32) / COLS;
  return (
    <View>
      <View style={styles.head}>
        <Text style={[styles.title, { color: c.onBg }]}>Pinned</Text>
        <Tap onPress={onSettings} accessibilityLabel="Settings" hitSlop={4}>
          <Glass c={c} radius={20} style={styles.gearBtn}>
            <Icon name="gear" size={21} color={c.onBg} />
          </Glass>
        </Tap>
      </View>
      {pinned.length ? (
        <View style={styles.grid}>
          {pinned.map((t) => (
            <PinTile key={t.id} c={c} tab={t} width={cell} onOpen={onOpen} onMenu={onMenu} />
          ))}
        </View>
      ) : (
        <View style={styles.empty}>
          <Sticker size={96} />
          <Text style={[styles.emptyTitle, { color: c.onBg }]}>Keep your sites here</Text>
          <Text style={[styles.emptyText, { color: c.onBg }]}>Open a page, tap the arrow in the bar, then Pin tab.</Text>
        </View>
      )}
    </View>
  );
}

function PinTile({ c, tab, width, onOpen, onMenu }: { c: Palette; tab: Tab; width: number; onOpen: (id: string) => void; onMenu: (id: string) => void }) {
  return (
    <Tap
      style={[styles.tile, { width }]}
      onPress={() => onOpen(tab.id)}
      onLongPress={() => onMenu(tab.id)}
      delayLongPress={320}
      accessibilityLabel={tabLabel(tab)}
      accessibilityHint="Long press for options"
    >
      <Glass c={c} radius={20} strong style={styles.tileIcon}>
        <Favicon url={tab.url} icon={tab.icon} size={34} c={c} radius={9} />
      </Glass>
      <Text numberOfLines={2} style={[styles.tileLabel, { color: c.onBg }]}>
        {tabLabel(tab)}
      </Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listPane: { flex: 1, marginHorizontal: 16, overflow: 'hidden' },
  seg: { position: 'absolute', left: 16, right: 16, height: SEG_H, flexDirection: 'row', padding: 4 },
  segOn: { position: 'absolute', left: 4, top: 4, bottom: 4, alignItems: 'center', justifyContent: 'flex-end' },
  segItem: { height: SEG_H - 8, alignItems: 'center', justifyContent: 'center' },
  segText: { ...type.label },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 14 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600', fontFamily: 'Inter_600SemiBold', letterSpacing: -0.3 },
  gearBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, rowGap: 18 },
  tile: { alignItems: 'center', gap: 8 },
  tileIcon: { width: 66, height: 66, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { ...type.caption, textAlign: 'center', paddingHorizontal: 4 },
  empty: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 40, gap: 10 },
  emptyTitle: { ...type.title, marginTop: 14 },
  emptyText: { ...type.body, textAlign: 'center', opacity: 0.78 },
  bar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  round: { width: BAR_H, height: BAR_H, alignItems: 'center', justifyContent: 'center' },
  searchPill: { height: BAR_H, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18 },
  searchText: { ...type.body, flex: 1 },
  count: { minWidth: 22, height: 22, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  countText: { fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
