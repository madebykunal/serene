import { Platform, StyleSheet, Text, View } from 'react-native';
import { resetSiteRules, setSiteRule, useStore } from '../state/store';
import type { Palette } from '../ui/theme';
import Favicon from '../ui/Favicon';
import Page from '../ui/Page';
import { Note, Row, SwitchRow } from '../ui/Rows';
import Sheet, { useSheetClose } from '../ui/Sheet';
import Tap from '../ui/Tap';
import { APP_NAME } from '../brand';

function SiteToggles({ c, host }: { c: Palette; host: string }) {
  const rule = useStore((s) => s.sites[host]);
  return (
    <>
      <SwitchRow
        c={c}
        icon="shield"
        title="Block Ads and Trackers"
        sub="Ad blocking and tracker learning on this site"
        value={rule?.ads !== false}
        onChange={(v) => setSiteRule(host, { ads: v })}
      />
      <SwitchRow
        c={c}
        icon="half"
        title="Dark Mode"
        sub={`Darken this site when ${APP_NAME} is dark`}
        value={rule?.darken !== false}
        onChange={(v) => setSiteRule(host, { darken: v })}
      />
      <SwitchRow
        c={c}
        icon="toolbar"
        title="Hide Pop-ups"
        sub="Sign-in prompts and app banners"
        value={rule?.popups !== false}
        onChange={(v) => setSiteRule(host, { popups: v })}
      />
      <SwitchRow
        c={c}
        icon="lock"
        title="Upgrade to HTTPS"
        sub="Off lets this site load over plain HTTP"
        value={rule?.https !== false}
        onChange={(v) => setSiteRule(host, { https: v })}
      />
      {Platform.OS === 'android' && (
        <SwitchRow
          c={c}
          icon="eyeOff"
          title="Block Third-Party Cookies"
          sub="Turn off if sign-in or checkout breaks here"
          value={rule?.cookies !== false}
          onChange={(v) => setSiteRule(host, { cookies: v })}
        />
      )}
    </>
  );
}

export function SiteSheet({ c, host, url, onClose, onChanged }: { c: Palette; host: string; url: string; onClose: () => void; onChanged: () => void }) {
  return (
    <Sheet c={c} onClose={onClose}>
      <SheetBody c={c} host={host} url={url} onChanged={onChanged} />
    </Sheet>
  );
}

function SheetBody({ c, host, url, onChanged }: { c: Palette; host: string; url: string; onChanged: () => void }) {
  const close = useSheetClose();
  const rule = useStore((s) => s.sites[host]);
  return (
    <View>
      <View style={styles.head}>
        <Favicon url={url} size={24} c={c} radius={7} />
        <Text numberOfLines={1} style={[styles.host, { color: c.text }]}>
          {host}
        </Text>
      </View>
      <SiteToggles c={c} host={host} />
      <View style={styles.actions}>
        {rule ? (
          <Tap onPress={() => resetSiteRules(host)} hitSlop={8}>
            <Text style={[styles.link, { color: c.sub }]}>Reset to defaults</Text>
          </Tap>
        ) : (
          <View />
        )}
        <Tap style={[styles.done, { backgroundColor: c.text }]} onPress={() => close(onChanged)}>
          <Text style={[styles.doneText, { color: c.dark ? c.bg : '#FFFFFF' }]}>Done</Text>
        </Tap>
      </View>
    </View>
  );
}

export function SitesPage({ c, onClose, onOpen }: { c: Palette; onClose: () => void; onOpen: (host: string) => void }) {
  const sites = useStore((s) => s.sites);
  const hosts = Object.keys(sites).sort();
  const describe = (host: string) => {
    const r = sites[host];
    const off = [r.ads === false && 'ad blocking', r.darken === false && 'dark mode', r.popups === false && 'pop-up hiding'].filter(Boolean);
    return off.length ? `Off: ${off.join(', ')}` : 'Custom';
  };
  return (
    <Page c={c} title="Site Settings" onClose={onClose}>
      {hosts.length === 0 ? (
        <Note c={c}>
          No custom site settings yet. On any page, tap the arrow, then Site Settings, to turn blocking, dark mode or pop-up hiding off for that site.
        </Note>
      ) : (
        hosts.map((h) => (
          <Row key={h} c={c} lead={<Favicon url={`https://${h}/`} size={24} c={c} radius={7} />} title={h} sub={describe(h)} chevron onPress={() => onOpen(h)} />
        ))
      )}
      {hosts.length > 0 && (
        <Row c={c} icon="reload" title="Reset All Sites" sub="Use the default protections everywhere" danger onPress={() => resetSiteRules()} />
      )}
    </Page>
  );
}

export function SitePage({ c, host, onClose }: { c: Palette; host: string; onClose: () => void }) {
  return (
    <Page c={c} title={host} onClose={onClose}>
      <SiteToggles c={c} host={host} />
      <Row c={c} icon="reload" title="Reset to Defaults" danger onPress={() => resetSiteRules(host)} />
    </Page>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 6 },
  host: { flex: 1, fontSize: 17, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
  link: { fontSize: 15, fontWeight: '500' },
  done: { paddingHorizontal: 22, height: 40, borderRadius: 20, justifyContent: 'center' },
  doneText: { fontSize: 15, fontWeight: '700' },
});
