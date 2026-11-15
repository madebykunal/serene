import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { pastel, type Palette } from './theme';
import { prettyHost } from '../lib/url';

type Props = { url: string; icon?: string; size?: number; c: Palette; radius?: number };

export default function Favicon({ url, icon, size = 18, c, radius }: Props) {
  const [failed, setFailed] = useState<string[]>([]);
  const host = prettyHost(url);
  const r = radius ?? size * 0.28;
  const origin = /^(https?:\/\/[^/?#]+)/i.exec(url)?.[1];
  const src = [icon, origin && `${origin}/favicon.ico`].find((u): u is string => !!u && !failed.includes(u));
  if (src) {
    return (
      <Image
        key={src}
        source={{ uri: src }}
        style={{ width: size, height: size, borderRadius: r }}
        resizeMethod="resize"
        onError={() => setFailed((f) => [...f, src])}
      />
    );
  }
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: r, backgroundColor: pastel(host, c.dark) }]}>
      <Text style={[styles.letter, { fontSize: size * 0.55, color: c.text }]}>{(host[0] ?? '•').toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  letter: { fontWeight: '700', includeFontPadding: false },
});
