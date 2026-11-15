import { createContext, useContext, useRef, type ComponentRef, type ReactNode, type RefObject } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurTargetView, BlurView } from 'expo-blur';
import type { Palette } from './theme';

type Target = RefObject<ComponentRef<typeof View> | null> | null;
const Source = createContext<Target>(null);

const canBlur = Platform.OS === 'ios' || (Platform.OS === 'android' && Platform.Version >= 31);

// WebView content never reaches the blur capture, so scopes over a page pass off.
export function GlassScope({ off, children }: { off?: boolean; children: ReactNode }) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  return <Source.Provider value={off ? null : ref}>{children}</Source.Provider>;
}

// Panes inside a target must not blur it: Dimezis would draw the target into itself.
// The fill goes on an inner view: only children are recorded, and gaps show the window background.
export function GlassTarget({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const ref = useContext(Source);
  return (
    <BlurTargetView ref={ref ?? undefined} style={StyleSheet.absoluteFill}>
      <View style={[styles.fill, style]}>
        <Source.Provider value={null}>{children}</Source.Provider>
      </View>
    </BlurTargetView>
  );
}

type Props = {
  c: Palette;
  radius?: number;
  bottomRadius?: number;
  strong?: boolean;
  tint?: string;
  see?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

function alpha(color: string, a: number) {
  const h = color.replace('#', '');
  if (h.length !== 6) return color;
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export default function Glass({ c, radius = 26, bottomRadius = radius, strong, tint, see, style, children }: Props) {
  const corners = {
    borderTopLeftRadius: radius,
    borderTopRightRadius: radius,
    borderBottomLeftRadius: bottomRadius,
    borderBottomRightRadius: bottomRadius,
  };
  const target = useContext(Source);
  const blurred = canBlur && !!target;
  const base = tint ?? (c.dark ? '#2A2C30' : '#FFFFFF');
  const fill = blurred
    ? alpha(base, tint ? 0.88 : strong ? (c.dark ? 0.62 : 0.7) : c.dark ? 0.46 : 0.5)
    : alpha(base, see !== undefined ? 1 - see : tint ? 1 : strong ? 0.96 : 0.9);
  const flat = StyleSheet.flatten(style) ?? {};
  const { backgroundColor: _ignored, ...outer } = flat;

  return (
    <View
      style={[
        {
          ...corners,
          boxShadow: c.dark
            ? '0px 10px 28px rgba(0,0,0,0.45), 0px 1px 2px rgba(0,0,0,0.4)'
            : '0px 10px 28px rgba(20,24,32,0.12), 0px 1px 2px rgba(20,24,32,0.08)',
        },
        outer,
      ]}
    >
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, corners, { overflow: 'hidden' }]}>
        {blurred && (
          <BlurView
            blurTarget={target}
            blurMethod="dimezisBlurViewSdk31Plus"
            intensity={36}
            blurReductionFactor={1.4}
            tint={c.dark ? 'systemUltraThinMaterialDark' : 'light'}
            style={[StyleSheet.absoluteFill, corners]}
          />
        )}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: fill,
              backgroundImage: c.dark
                ? 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 48%, rgba(255,255,255,0.03) 100%)'
                : 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.18) 100%)',
              boxShadow: c.dark
                ? 'inset 0px 1px 0px rgba(255,255,255,0.16), inset 0px -1px 0px rgba(255,255,255,0.05)'
                : 'inset 0px 1px 0px rgba(255,255,255,0.95), inset 0px -1px 0px rgba(255,255,255,0.45)',
              ...corners,
              borderWidth: 1,
              borderColor: c.dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.7)',
            },
          ]}
        />
      </View>
      {children}
    </View>
  );
}

export function Frost({ color, radius = 50, style }: { color: string; radius?: number; style?: StyleProp<ViewStyle> }) {
  const target = useContext(Source);
  const blurred = canBlur && !!target;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      {blurred && (
        <BlurView
          blurTarget={target}
          blurMethod="dimezisBlurViewSdk31Plus"
          intensity={60}
          blurReductionFactor={60 / radius}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
