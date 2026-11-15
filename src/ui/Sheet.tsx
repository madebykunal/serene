import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Animated, BackHandler, Easing, PanResponder, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Glass, { Frost } from './Glass';
import type { Palette } from './theme';

type Close = (after?: () => void) => void;
const SheetClose = createContext<Close>(() => {});
export const useSheetClose = () => useContext(SheetClose);
const closing = new WeakSet<Animated.Value>();

type Props = { c: Palette; onClose: () => void; full?: boolean; children: ReactNode };

export default function Sheet({ c, onClose, full, children }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [open] = useState(() => new Animated.Value(0));
  const [drag] = useState(() => new Animated.Value(0));
  const close: Close = (after) => {
    if (closing.has(open)) return;
    closing.add(open);
    Animated.timing(open, { toValue: 0, duration: 170, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
      onClose();
      after?.();
    });
  };

  useEffect(() => {
    Animated.spring(open, { toValue: 1, useNativeDriver: true, damping: 26, stiffness: 320, mass: 0.85 }).start();
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, []);

  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 0.9) close();
        else Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 5, speed: 20 }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      },
    }),
  );

  const translateY = Animated.add(
    open.interpolate({ inputRange: [0, 1], outputRange: [height, 0], extrapolate: 'clamp' }),
    drag,
  );

  return (
    <SheetClose.Provider value={close}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: open.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }) }]}>
          <Frost radius={18} color={c.dark ? 'rgba(0,0,0,0.42)' : 'rgba(20,24,32,0.18)'} />
          <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} />
        </Animated.View>
        <Animated.View
          style={[
            styles.panel,
            {
              top: full ? insets.top + 10 : undefined,
              paddingBottom: full ? 0 : insets.bottom + 10,
              transform: [{ translateY }],
            },
          ]}
        >
          <Glass c={c} radius={28} bottomRadius={0} tint={full ? c.bg : c.surface} style={StyleSheet.absoluteFill} />
          <View {...pan.panHandlers} style={styles.grabZone}>
            <View style={[styles.grabber, { backgroundColor: c.faint }]} />
          </View>
          {children}
        </Animated.View>
      </View>
    </SheetClose.Provider>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  grabZone: { alignItems: 'center', paddingTop: 8, paddingBottom: 6 },
  grabber: { width: 36, height: 5, borderRadius: 3, opacity: 0.5 },
});
