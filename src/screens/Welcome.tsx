import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setSettings } from '../state/store';
import Backdrop from '../ui/Backdrop';
import Icon from '../ui/Icon';
import Sticker from '../ui/Sticker';
import Tap from '../ui/Tap';
import { motion } from '../ui/theme';

const MINT = '#7CE9D6';
const INK = '#F1FAF8';

export default function Welcome({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 900, easing: motion.enter, useNativeDriver: true }).start();
  }, [anim]);

  const go = () => {
    Animated.timing(anim, { toValue: 2, duration: motion.base, easing: motion.exit, useNativeDriver: true }).start(() => {
      setSettings({ onboarded: true });
      onDone();
    });
  };

  const rise = (from: number, d: number) => ({
    opacity: anim.interpolate({ inputRange: [0, from, Math.min(1, from + 0.45), 1, 2], outputRange: [0, 0, 1, 1, 0], extrapolate: 'clamp' }),
    transform: [{ translateY: anim.interpolate({ inputRange: [0, from, Math.min(1, from + 0.45), 1, 2], outputRange: [d, d, 0, 0, -d / 2], extrapolate: 'clamp' }) }],
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: anim.interpolate({ inputRange: [0, 1, 1.6, 2], outputRange: [1, 1, 1, 0] }) }]}>
      <Backdrop dark visible />
      <View style={[styles.body, { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 28 }]}>
        <Animated.View style={rise(0, 16)}>
          <Sticker size={88} />
        </Animated.View>
        <View style={styles.flex} />
        <Animated.Text style={[styles.headline, rise(0.12, 28)]} accessibilityRole="header">
          The whole web,{'\n'}
          <Text style={styles.mint}>none</Text> of the{'\n'}
          noise.
        </Animated.Text>
        <Animated.View style={[styles.ctaWrap, rise(0.3, 12)]}>
          <Tap onPress={go} style={styles.cta} dim={0.8} scale={0.97} accessibilityRole="button" accessibilityLabel="Let's go">
            <Text style={styles.ctaText}>Let’s go</Text>
            <Icon name="arrowRight" size={20} color="#023B49" weight={2.4} />
          </Tap>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 28 },
  headline: { color: INK, fontSize: 48, lineHeight: 52, fontWeight: '800', letterSpacing: -1.2 },
  mint: { color: MINT },
  ctaWrap: { marginTop: 36 },
  cta: {
    height: 58,
    borderRadius: 29,
    backgroundColor: '#3FD5C3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 26,
  },
  ctaText: { fontSize: 18, fontWeight: '700', color: '#023B49' },
});
