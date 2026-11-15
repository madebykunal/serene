import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  downloadsAvailable,
  listDownloads,
  openDownload,
  removeDownload,
  type DownloadItem,
} from '../lib/downloads';
import { clearHistorySince, removeBookmark, removeVisit, useStore, type Visit } from '../state/store';
import type { Palette } from '../ui/theme';
import { prettyHost, queryFromUrl } from '../lib/url';
import Favicon from '../ui/Favicon';
import Icon, { type IconName } from '../ui/Icon';
import Page, { usePageClose } from '../ui/Page';
import Tap from '../ui/Tap';
import { APP_NAME } from '../brand';

export default function Downloads({ c, onClose }: { c: Palette; onClose: () => void }) {
  return (
    <Page c={c} title="Downloads" onClose={onClose} scroll={false}>
      <DownloadList c={c} />
    </Page>
  );
}

function Empty({ c, icon, title, body }: { c: Palette; icon: IconName; title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: c.fill }]}>
        <Icon name={icon} size={28} color={c.faint} />
      </View>
      <Text style={[styles.emptyTitle, { color: c.text }]}>{title}</Text>
      <Text style={[styles.emptyText, { color: c.sub }]}>{body}</Text>
    </View>
  );
}

function SiteRow({
  c,
  url,
  title,
  icon,
  meta,
  name,
  onPress,
  onLongPress,
  onRemove,
}: {
  c: Palette;
  url: string;
  title: string;
  icon?: string;
  meta: string;
  name?: string;
  onPress: () => void;
  onLongPress?: () => void;
  onRemove: () => void;
}) {
  return (
    <Tap dim={0.6} scale={0.985} onPress={onPress} onLongPress={onLongPress} delayLongPress={380} style={styles.row}>
      <View style={styles.lead}>
        <Favicon url={url} icon={icon} size={28} c={c} radius={8} />
      </View>
      <View style={styles.flex}>
        <Text numberOfLines={1} style={[styles.title, { color: c.text }]}>
          {name || (queryFromUrl(url) ?? (title || prettyHost(url)))}
        </Text>
        <Text numberOfLines={1} style={[styles.sub, { color: c.sub }]}>
          {meta}
        </Text>
      </View>
      <Tap hitSlop={10} onPress={onRemove} style={styles.x} accessibilityLabel="Remove">
        <Icon name="close" size={12} color={c.faint} weight={1.8} />
      </Tap>
    </Tap>
  );
}

export function Bookmarks({
  c,
  onOpenUrl,
  onRename,
  bottom,
}: {
  c: Palette;
  onOpenUrl: (url: string) => void;
  onRename?: (id: string) => void;
  bottom?: number;
}) {
  const insets = useSafeAreaInsets();
  const close = usePageClose();
  const items = useStore((s) => s.bookmarks);
  return (
    <FlatList
      data={items}
      keyExtractor={(b) => b.id}
      contentContainerStyle={[styles.list, { paddingTop: 8, paddingBottom: bottom ?? insets.bottom + 24 }]}
      ListEmptyComponent={
        <Empty c={c} icon="bookmark" title="No bookmarks yet" body="On any page, open ≡ and choose Bookmark. Long-press one to rename it." />
      }
      renderItem={({ item }) => (
        <SiteRow
          c={c}
          url={item.url}
          title={item.title}
          icon={item.icon}
          name={item.name}
          meta={prettyHost(item.url)}
          onPress={() => close(() => onOpenUrl(item.url))}
          onLongPress={onRename ? () => onRename(item.id) : undefined}
          onRemove={() => removeBookmark(item.id)}
        />
      )}
    />
  );
}

function dayLabel(at: number) {
  const d = new Date(at);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (at >= start) return 'Today';
  if (at >= start - 86_400_000) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

function time(at: number) {
  return new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

type HistoryItem = { kind: 'head'; key: string; label: string } | { kind: 'visit'; key: string; v: Visit };

export function History({ c, onOpenUrl, bottom }: { c: Palette; onOpenUrl: (url: string) => void; bottom?: number }) {
  const insets = useSafeAreaInsets();
  const close = usePageClose();
  const history = useStore((s) => s.history);
  const [q, setQ] = useState('');
  const [clearing, setClearing] = useState(false);

  const needle = q.trim().toLowerCase();
  const items: HistoryItem[] = [];
  let last = '';
  for (const v of history) {
    if (needle && !v.title.toLowerCase().includes(needle) && !v.url.toLowerCase().includes(needle)) continue;
    const label = dayLabel(v.at);
    if (label !== last) {
      items.push({ kind: 'head', key: `h${label}`, label });
      last = label;
    }
    items.push({ kind: 'visit', key: `v${v.url}`, v });
  }

  const clear = (since: number) => {
    clearHistorySince(since);
    setClearing(false);
  };

  return (
    <View style={styles.flex}>
      <View style={styles.tools}>
        <View style={[styles.search, { backgroundColor: c.fill }]}>
          <Icon name="search" size={16} color={c.sub} weight={2} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search history"
            placeholderTextColor={c.sub}
            style={[styles.searchInput, { color: c.text }]}
            selectionColor={c.selection}
            selectionHandleColor={c.text}
            cursorColor={c.text}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        {history.length > 0 && (
          <Tap onPress={() => setClearing((v) => !v)} hitSlop={8}>
            <Text style={[styles.action, { color: c.text }]}>{clearing ? 'Cancel' : 'Clear'}</Text>
          </Tap>
        )}
      </View>
      {clearing && (
        <View style={styles.ranges}>
          {[
            { label: 'Last hour', since: lastHour },
            { label: 'Today', since: startOfToday },
            { label: 'All time', since: () => 0 },
          ].map((r) => (
            <Tap key={r.label} onPress={() => clear(r.since())} style={[styles.range, { borderColor: c.danger }]}>
              <Text style={[styles.rangeText, { color: c.danger }]}>{r.label}</Text>
            </Tap>
          ))}
        </View>
      )}
      <FlatList
        data={items}
        keyExtractor={(i) => i.key}
        contentContainerStyle={[styles.list, { paddingBottom: bottom ?? insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
        windowSize={9}
        ListEmptyComponent={
          <Empty
            c={c}
            icon="clock"
            title={needle ? 'No matches' : 'No history yet'}
            body={needle ? 'Try another word or site.' : 'Pages you visit show up here. Private tabs are never saved.'}
          />
        }
        renderItem={({ item }) =>
          item.kind === 'head' ? (
            <Text style={[styles.head, { color: c.sub }]}>{item.label}</Text>
          ) : (
            <SiteRow
              c={c}
              url={item.v.url}
              title={item.v.title}
              icon={item.v.icon}
              meta={`${prettyHost(item.v.url)} · ${time(item.v.at)}`}
              onPress={() => close(() => onOpenUrl(item.v.url))}
              onRemove={() => removeVisit(item.v.url)}
            />
          )
        }
      />
    </View>
  );
}

function lastHour() {
  return Date.now() - 3_600_000;
}

function startOfToday() {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
}

function size(bytes: number) {
  if (bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function statusLine(d: DownloadItem) {
  if (d.status === 'done') return [size(d.total || d.bytes), new Date(d.at).toLocaleDateString()].filter(Boolean).join(' · ');
  if (d.status === 'failed') return 'Download failed';
  if (d.status === 'paused') return 'Paused · waiting for network';
  if (d.status === 'pending') return 'Starting…';
  const pct = d.total > 0 ? Math.round((d.bytes / d.total) * 100) : 0;
  return d.total > 0 ? `${pct}% · ${size(d.bytes)} of ${size(d.total)}` : size(d.bytes) || 'Downloading…';
}

function DownloadList({ c }: { c: Palette }) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<DownloadItem[]>(() => listDownloads());

  const active = items.some((d) => d.status === 'running' || d.status === 'pending');
  useEffect(() => {
    if (!downloadsAvailable) return;
    const t = setInterval(() => setItems(listDownloads()), active ? 800 : 3000);
    return () => clearInterval(t);
  }, [active]);

  if (!downloadsAvailable) {
    return <Empty c={c} icon="download" title="Downloads need the installed app" body={`Expo Go can't save files. Install the ${APP_NAME} app build to download.`} />;
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(d) => String(d.id)}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
      ListEmptyComponent={<Empty c={c} icon="download" title="No downloads yet" body="Files you download are saved to your phone's Downloads folder." />}
      renderItem={({ item }) => {
        const pct = item.total > 0 ? Math.min(1, item.bytes / item.total) : 0;
        return (
          <Tap dim={0.6} scale={0.985} onPress={() => item.status === 'done' && openDownload(item.id)} style={styles.row}>
            <View style={styles.lead}>
              <View style={[styles.fileIcon, { backgroundColor: c.fill }]}>
                <Icon name="download" size={18} color={item.status === 'failed' ? c.danger : c.text} weight={2} />
              </View>
            </View>
            <View style={styles.flex}>
              <Text numberOfLines={1} style={[styles.title, { color: c.text }]}>
                {item.title}
              </Text>
              <Text numberOfLines={1} style={[styles.sub, { color: item.status === 'failed' ? c.danger : c.sub }]}>
                {statusLine(item)}
              </Text>
              {(item.status === 'running' || item.status === 'pending') && (
                <View style={[styles.track, { backgroundColor: c.fill }]}>
                  <View style={[styles.bar, { backgroundColor: c.text, width: `${Math.round(pct * 100)}%` }]} />
                </View>
              )}
            </View>
            <Tap
              hitSlop={10}
              onPress={() => {
                removeDownload(item.id);
                setItems(listDownloads());
              }}
              style={styles.x}
              accessibilityLabel="Remove download"
            >
              <Icon name="close" size={12} color={c.faint} weight={1.8} />
            </Tap>
          </Tap>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { flexGrow: 1 },
  row: { minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingRight: 10, paddingVertical: 8 },
  lead: { width: 62, alignItems: 'center', paddingLeft: 4 },
  title: { fontSize: 16, fontWeight: '400' },
  sub: { fontSize: 13, marginTop: 2 },
  x: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  head: { fontSize: 13, fontWeight: '600', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingTop: 14, marginBottom: 6 },
  search: { flex: 1, height: 40, borderRadius: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  action: { fontSize: 15, fontWeight: '600' },
  ranges: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  range: { paddingHorizontal: 14, height: 32, borderRadius: 16, borderWidth: 1.5, justifyContent: 'center' },
  rangeText: { fontSize: 13, fontWeight: '600' },
  fileIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  track: { height: 3, borderRadius: 2, marginTop: 7, overflow: 'hidden', marginRight: 6 },
  bar: { height: 3, borderRadius: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 140, paddingHorizontal: 40 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
