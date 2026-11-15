import { useState } from 'react';
import { Animated, Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; dim?: number; scale?: number };

export default function Tap({ style, dim = 0.55, scale = 0.94, hitSlop = 6, onPressIn, onPressOut, disabled, ...rest }: Props) {
  const [press] = useState(() => new Animated.Value(0));
  const to = (v: number) =>
    Animated.spring(press, {
      toValue: v,
      useNativeDriver: true,
      speed: v ? 60 : 24,
      bounciness: v ? 0 : 7,
    }).start();

  return (
    <AnimatedPressable
      hitSlop={hitSlop}
      disabled={disabled}
      onPressIn={(e: GestureResponderEvent) => {
        to(1);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        to(0);
        onPressOut?.(e);
      }}
      style={[
        style,
        {
          opacity: press.interpolate({ inputRange: [0, 1], outputRange: [1, Math.max(dim, 0.72)] }),
          transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, scale] }) }],
        },
      ]}
      {...rest}
    />
  );
}
