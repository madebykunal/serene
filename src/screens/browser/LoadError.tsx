import { StyleSheet, Text, View } from 'react-native';
import { hostOf, prettyHost } from '../../lib/url';
import Icon from '../../ui/Icon';
import Tap from '../../ui/Tap';
import type { Palette } from '../../ui/theme';

function errorText(desc: string, host: string) {
  if (/INTERNET_DISCONNECTED|offline|not connected/i.test(desc)) return 'You’re offline. Check your connection and try again.';
  if (/NAME_NOT_RESOLVED|server with the specified hostname|could not be found/i.test(desc))
    return `Couldn’t find ${host || 'this site'}. Check the address, or search for it instead.`;
  if (/TIMED_OUT|timed out/i.test(desc)) return 'The site took too long to respond.';
  if (/CERT|SSL|secure connection/i.test(desc)) return 'A secure connection to this site couldn’t be made.';
  return 'Something went wrong while loading this page.';
}

type ErrorProps = { c: Palette; url: string; desc: string; onRetry: () => void; onSearch: (q: string) => void; onHttp?: () => void };

export default function LoadError({ c, url, desc, onRetry, onSearch, onHttp }: ErrorProps) {
  const host = prettyHost(url);
  const unknownHost = /NAME_NOT_RESOLVED|specified hostname|could not be found/i.test(desc);
  const offline = /INTERNET_DISCONNECTED|offline|not connected/i.test(desc);
  const insecure = !!onHttp && !unknownHost && !offline;
  return (
    <View style={[styles.error, { backgroundColor: c.bg }]}>
      <View style={[styles.badge, { backgroundColor: c.fill }]}>
        <Icon name={offline ? 'offline' : insecure ? 'unlock' : 'warning'} size={26} color={c.sub} />
      </View>
      <Text style={[styles.errorTitle, { color: c.text }]}>{insecure ? 'No secure version' : 'Can’t open this page'}</Text>
      <Text style={[styles.errorBody, { color: c.sub }]}>
        {insecure
          ? `${host || 'This site'} didn’t open over HTTPS. Its HTTP version isn’t encrypted, so others on your network could see or change it.`
          : errorText(desc, host)}
      </Text>
      <View style={styles.errorActions}>
        <Tap style={[styles.errorBtn, { backgroundColor: c.accent }]} onPress={onRetry}>
          <Text style={[styles.errorBtnText, { color: c.onAccent }]}>Try again</Text>
        </Tap>
        {insecure ? (
          <Tap style={[styles.errorBtn, { backgroundColor: c.fill }]} onPress={onHttp}>
            <Text style={[styles.errorBtnText, { color: c.text }]}>Continue to HTTP</Text>
          </Tap>
        ) : null}
        {unknownHost && host ? (
          <Tap style={[styles.errorBtn, { backgroundColor: c.fill }]} onPress={() => onSearch(hostOf(url))}>
            <Text style={[styles.errorBtnText, { color: c.text }]}>Search instead</Text>
          </Tap>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  error: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, paddingBottom: 80 },
  badge: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  errorTitle: { fontSize: 22, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  errorBody: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
  errorActions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  errorBtn: { paddingHorizontal: 20, height: 42, borderRadius: 21, justifyContent: 'center' },
  errorBtnText: { fontSize: 15, fontWeight: '600' },
});
