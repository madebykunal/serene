import { useEffect, useState } from 'react';
import { Animated, BackHandler, Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { startDownload } from '../lib/downloads';
import { closeTab, duplicateTab, toggleBookmark, togglePin, updateTab, useStore, type Tab } from '../state/store';
import { motion, type, type Palette } from '../ui/theme';
import { isSecure, prettyHost } from '../lib/url';
import Favicon from '../ui/Favicon';
import Glass from '../ui/Glass';
import Icon, { type IconName } from '../ui/Icon';
import Sheet, { useSheetClose } from '../ui/Sheet';
import Tap from '../ui/Tap';
import { tidyUrl } from '../privacy';
import { web, type LinkInfo } from './browser/controller';
import { tabLabel } from '../lib/tabs';

type Action = {
  icon: IconName;
  label: string;
  run: () => void;
  danger?: boolean;
  done?: string;
};

function Header({ tab, c, onEdit }: { tab: Tab; c: Palette; onEdit?: () => void }) {
  const close = useSheetClose();
  const host = prettyHost(tab.url) || tabLabel(tab);
  const body = (
    <>
      <Favicon url={tab.url} icon={tab.icon} size={24} c={c} radius={7} />
      <Text numberOfLines={1} style={[styles.host, { color: c.text }]}>
        {host}
      </Text>
      {isSecure(tab.url) && <Icon name="lock" size={12} color={c.sub} weight={1.6} />}
    </>
  );
  return onEdit ? (
    <Tap
      style={[styles.address, { backgroundColor: c.fill }]}
      onPress={() => close(onEdit)}
      dim={0.7}
      accessibilityLabel="Edit address"
    >
      {body}
    </Tap>
  ) : (
    <View style={[styles.address, { backgroundColor: c.fill }]}>{body}</View>
  );
}

function Tiles({ items, c }: { items: Action[]; c: Palette }) {
  const close = useSheetClose();
  const [done, setDone] = useState<string | null>(null);
  return (
    <View style={styles.tiles}>
      {items.map((a) => {
        const shown = done === a.label && a.done ? a.done : a.label;
        return (
          <Tap
            key={a.label}
            style={[styles.tile, { backgroundColor: c.fill }]}
            onPress={() => {
              if (a.done) {
                a.run();
                setDone(a.label);
                setTimeout(() => close(), 650);
              } else close(a.run);
            }}
          >
            <Icon name={done === a.label && a.done ? 'check' : a.icon} size={20} color={c.text} />
            <Text style={[styles.tileLabel, { color: c.text }]}>{shown}</Text>
          </Tap>
        );
      })}
    </View>
  );
}

function Rows({ items, c }: { items: Action[]; c: Palette }) {
  const close = useSheetClose();
  return (
    <View style={[styles.rows, { backgroundColor: c.fill }]}>
      {items.map((a, i) => (
        <Tap
          key={a.label}
          dim={0.6}
          scale={0.98}
          onPress={() => close(a.run)}
          style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }]}
        >
          <Text style={[styles.rowLabel, { color: a.danger ? c.danger : c.text }]}>{a.label}</Text>
          <Icon name={a.icon} size={17} color={a.danger ? c.danger : c.sub} weight={1.8} />
        </Tap>
      ))}
    </View>
  );
}

const bookmarkAction = (tab: Tab, marked: boolean): Action => ({
  icon: 'bookmark',
  label: marked ? 'Bookmarked' : 'Bookmark',
  run: () => {
    toggleBookmark(tidyUrl(tab.url), tabLabel(tab), tab.icon);
  },
});

const share = (raw: string) => {
  const url = tidyUrl(raw);
  Share.share({ message: url, url }).catch(() => {});
};

type BrowserMenuProps = {
  c: Palette;
  id: string;
  onClose: () => void;
  onEdit: () => void;
  onSettings: () => void;
  onSite: () => void;
};

export function BrowserMenu({ c, id, onClose, onEdit, onSettings, onSite }: BrowserMenuProps) {
  const tab = useStore((s) => s.tabs.find((t) => t.id === id));
  const marked = useStore((s) => !!tab && s.bookmarks.some((b) => b.url === tab.url || b.url === tidyUrl(tab.url)));
  if (!tab) return null;
  return (
    <Sheet c={c} onClose={onClose}>
      <Header tab={tab} c={c} onEdit={onEdit} />
      {tab.private && (
        <View style={styles.privateRow}>
          <Icon name="eye" size={15} color={c.sub} weight={1.8} />
          <Text style={[styles.privateText, { color: c.sub }]}>Private tab · not saved to history</Text>
        </View>
      )}
      <Tiles
        c={c}
        items={[
          { icon: 'reload', label: 'Reload', run: () => web.view?.reload() },
          bookmarkAction(tab, marked),
          {
            icon: 'link',
            label: 'Copy link',
            done: 'Copied',
            run: () => {
              Clipboard.setStringAsync(tidyUrl(tab.url)).catch(() => {});
            },
          },
          { icon: 'share', label: 'Share', run: () => share(tab.url) },
        ]}
      />
      <Rows
        c={c}
        items={[
          { icon: 'search', label: 'Find in page', run: () => web.find() },
          {
            icon: 'window',
            label: tab.desktop ? 'Request mobile site' : 'Request desktop site',
            run: () => updateTab(id, { desktop: !tab.desktop }),
          },
          { icon: 'shield', label: 'Site settings', run: onSite },
          { icon: 'pin', label: tab.pinned ? 'Unpin tab' : 'Pin tab', run: () => togglePin(id) },
          { icon: 'sliders', label: 'Settings', run: onSettings },
          { icon: 'close', label: 'Close tab', danger: true, run: () => closeTab(id) },
        ]}
      />
    </Sheet>
  );
}

type LinkMenuProps = {
  c: Palette;
  info: LinkInfo;
  privateContext: boolean;
  onClose: () => void;
  onOpen: (url: string, mode: 'front' | 'back' | 'private') => void;
};

const MENU_W = 272;
const ITEM_H = 48;

export function LinkMenu({ c, info, privateContext, onClose, onOpen }: LinkMenuProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [anim] = useState(() => new Animated.Value(0));
  const link = info.link && /^https?:/i.test(info.link) ? tidyUrl(info.link) : '';
  const img = info.img && /^https?:/i.test(info.img) ? info.img : '';
  const items: Action[] = [];
  if (link) {
    items.push(
      { icon: 'plus', label: 'Open in new tab', run: () => onOpen(link, 'front') },
      { icon: 'copy', label: 'Open in background', run: () => onOpen(link, 'back') },
    );
    if (!privateContext) items.push({ icon: 'eye', label: 'Open in private tab', run: () => onOpen(link, 'private') });
    items.push(
      { icon: 'link', label: 'Copy link', run: () => Clipboard.setStringAsync(link).catch(() => {}) },
      { icon: 'share', label: 'Share link', run: () => share(link) },
    );
  }
  if (img) {
    items.push(
      { icon: 'window', label: 'Open image in new tab', run: () => onOpen(img, 'front') },
      {
        icon: 'download',
        label: 'Download image',
        run: () => {
          if (!startDownload(img, web.userAgent)) onOpen(img, 'front');
        },
      },
      { icon: 'link', label: 'Copy image link', run: () => Clipboard.setStringAsync(img).catch(() => {}) },
    );
  }
  const shown = link || img;
  const title = info.text || info.alt || prettyHost(shown);

  const menuW = Math.min(MENU_W, width - 32);
  const menuH = 66 + items.length * ITEM_H + 12;
  const px = info.x ?? width / 2;
  const py = info.y ?? height / 2;
  const left = Math.max(16, Math.min(width - menuW - 16, px - menuW * 0.3));
  const below = py + 14 + menuH < height - insets.bottom - 12;
  const top = below ? py + 14 : Math.max(insets.top + 8, py - 14 - menuH);
  const originY = below ? -menuH / 2 : menuH / 2;

  const dismiss = (after?: () => void) => {
    Animated.timing(anim, { toValue: 0, duration: motion.quick, easing: motion.exit, useNativeDriver: true }).start(() => {
      onClose();
      after?.();
    });
  };

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: motion.base, easing: motion.enter, useNativeDriver: true }).start();
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      dismiss();
      return true;
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim, opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.7] }) }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => dismiss()} accessibilityLabel="Close menu" />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={[
          styles.popover,
          {
            left,
            top,
            width: menuW,
            opacity: anim,
            transform: [
              { translateY: originY },
              { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) },
              { translateY: -originY },
            ],
          },
        ]}
      >
        <Glass c={c} radius={22} tint={c.surface} style={StyleSheet.absoluteFill} />
        <View style={[styles.popHead, { borderBottomColor: c.line }]}>
          <Favicon url={shown} size={22} c={c} radius={6} />
          <View style={styles.flex}>
            <Text numberOfLines={1} style={[styles.popTitle, { color: c.text }]}>
              {title}
            </Text>
            <Text numberOfLines={1} style={[styles.linkUrl, { color: c.sub }]}>
              {shown.replace(/^https?:\/\/(www\.)?/i, '')}
            </Text>
          </View>
        </View>
        {items.map((a) => (
          <Tap key={a.label} dim={0.6} scale={0.98} onPress={() => dismiss(a.run)} style={styles.popRow}>
            <Icon name={a.icon} size={18} color={c.text} weight={1.9} />
            <Text style={[styles.popLabel, { color: c.text }]}>{a.label}</Text>
          </Tap>
        ))}
      </Animated.View>
    </View>
  );
}

type TabMenuProps = { c: Palette; id: string; onClose: () => void; onRename: () => void };

export function TabMenu({ c, id, onClose, onRename }: TabMenuProps) {
  const tab = useStore((s) => s.tabs.find((t) => t.id === id));
  const marked = useStore((s) => !!tab && s.bookmarks.some((b) => b.url === tab.url || b.url === tidyUrl(tab.url)));
  if (!tab) return null;
  return (
    <Sheet c={c} onClose={onClose}>
      <Header tab={tab} c={c} />
      <Rows
        c={c}
        items={[
          { icon: 'pin', label: tab.pinned ? 'Unpin tab' : 'Pin tab', run: () => togglePin(id) },
          { icon: 'edit', label: 'Rename', run: onRename },
          { ...bookmarkAction(tab, marked), label: marked ? 'Remove bookmark' : 'Bookmark' },
          { icon: 'copy', label: 'Duplicate', run: () => duplicateTab(id) },
          { icon: 'share', label: 'Share', run: () => share(tab.url) },
          { icon: 'close', label: 'Close tab', danger: true, run: () => closeTab(id) },
        ]}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  privateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, marginTop: -6, marginBottom: 12 },
  privateText: { fontSize: 13.5, fontWeight: '600' },
  popover: { position: 'absolute', borderRadius: 22, paddingBottom: 6 },
  popHead: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 66, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 6 },
  popTitle: { ...type.label, fontSize: 15 },
  popRow: { height: ITEM_H, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18 },
  popLabel: { ...type.body },
  linkUrl: { fontSize: 13, marginTop: 2 },
  address: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    borderRadius: 26,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  host: { flex: 1, fontSize: 16, fontWeight: '600' },
  tiles: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  tile: { flex: 1, height: 74, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 8 },
  tileLabel: { fontSize: 12.5, fontWeight: '600' },
  rows: { marginHorizontal: 16, borderRadius: 18, overflow: 'hidden' },
  row: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  rowLabel: { fontSize: 16, fontWeight: '500' },
});
