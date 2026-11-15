import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Animated, BackHandler, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { motion, type, type Palette } from './theme';
import Glass, { GlassScope, GlassTarget } from './Glass';
import Icon from './Icon';
import Tap from './Tap';

type Close = (after?: () => void) => void;
const PageClose = createContext<Close>((after) => after?.());
export const usePageClose = () => useContext(PageClose);
const closing = new WeakSet<Animated.Value>();
const HEAD_H = 60;

type Props = { c: Palette; title: string; onClose: () => void; children: ReactNode; scroll?: boolean };

export default function Page({ c, title, onClose, children, scroll = true }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [x] = useState(() => new Animated.Value(0));

  const close: Close = (after) => {
    if (closing.has(x)) return;
    closing.add(x);
    Animated.timing(x, { toValue: 0, duration: 150, easing: motion.exit, useNativeDriver: true }).start(() => {
      onClose();
      after?.();
    });
  };

  useEffect(() => {
    Animated.spring(x, { toValue: 1, useNativeDriver: true, damping: 24, stiffness: 300, mass: 0.85 }).start();
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, []);

  const head = <Text style={[styles.title, { color: c.text }]}>{title}</Text>;

  return (
    <PageClose.Provider value={close}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: c.bg,
            opacity: x.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
            transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [width * 0.18, 0] }) }],
          },
        ]}
      >
        <GlassScope>
          <GlassTarget style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }]}>
            {scroll ? (
              <ScrollView
                contentContainerStyle={{ paddingTop: insets.top + HEAD_H, paddingBottom: insets.bottom + 32 }}
                showsVerticalScrollIndicator={false}
              >
                {head}
                {children}
              </ScrollView>
            ) : (
              <View style={[styles.flex, { paddingTop: insets.top + HEAD_H }]}>
                {head}
                {children}
              </View>
            )}
          </GlassTarget>
          <View style={[styles.bar, { top: insets.top + 8 }]}>
            <Tap onPress={() => close()} accessibilityLabel="Back" hitSlop={8}>
              <Glass c={c} radius={24} style={styles.back}>
                <Icon name="arrowLeft" size={22} color={c.text} />
              </Glass>
            </Tap>
          </View>
        </GlassScope>
      </Animated.View>
    </PageClose.Provider>
  );
}

export function SectionLabel({ c, label }: { c: Palette; label: string }) {
  return <Text style={[styles.section, { color: c.sub }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { position: 'absolute', left: 14 },
  back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.display, marginTop: 28, marginBottom: 18, paddingHorizontal: 20 },
  section: { ...type.label, paddingHorizontal: 20, marginTop: 30, marginBottom: 6, textTransform: 'none' },
});
