import { useState } from 'react';
import { Animated, Image, PanResponder, StyleSheet } from 'react-native';
import { APP_NAME } from '../brand';

const LOGO = require('../../assets/logo.png');

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function create() {
  const pos = new Animated.ValueXY();
  const spin = new Animated.Value(0);
  const tilt = new Animated.Value(0);
  const scale = new Animated.Value(1);
  let turns = 0;

  const settle = (vx: number, vy: number, extraTurns: number, spinVelocity: number) => {
    turns += extraTurns * 360;
    Animated.parallel([
      Animated.spring(pos, { toValue: { x: 0, y: 0 }, velocity: { x: vx, y: vy }, friction: 5, tension: 38, useNativeDriver: true }),
      Animated.spring(spin, { toValue: turns, velocity: spinVelocity, friction: 7, tension: 22, useNativeDriver: true }),
      Animated.spring(tilt, { toValue: 0, friction: 4, tension: 60, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
  };

  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      pos.stopAnimation();
      pos.extractOffset();
      Animated.spring(scale, { toValue: 1.14, friction: 5, tension: 160, useNativeDriver: true }).start();
    },
    onPanResponderMove: (_, g) => {
      pos.setValue({ x: g.dx, y: g.dy });
      tilt.setValue(clamp(g.dx * 0.1 + g.vx * 14, -38, 38));
    },
    onPanResponderRelease: (_, g) => {
      pos.flattenOffset();
      const moved = Math.abs(g.dx) + Math.abs(g.dy) > 10;
      if (!moved) {
        settle(0, 0, 1, 0);
        return;
      }
      const speed = Math.hypot(g.vx, g.vy);
      const dir = g.vx === 0 ? 1 : Math.sign(g.vx);
      const extra = speed > 0.35 ? dir * Math.min(4, Math.max(1, Math.round(speed * 1.4))) : 0;
      settle(g.vx, g.vy, extra, g.vx * 0.9);
    },
    onPanResponderTerminate: () => {
      pos.flattenOffset();
      settle(0, 0, 0, 0);
    },
  });

  const rotate = Animated.add(spin, tilt).interpolate({
    inputRange: [-3600, 3600],
    outputRange: ['-3600deg', '3600deg'],
  });

  return { pan, pos, rotate, scale };
}

export default function Sticker({ size }: { size: number }) {
  const [s] = useState(create);
  return (
    <Animated.View
      {...s.pan.panHandlers}
      accessibilityRole="image"
      accessibilityLabel={APP_NAME}
      accessibilityHint="Drag or tap to spin"
      style={[
        styles.hit,
        {
          width: size,
          height: size,
          transform: [{ translateX: s.pos.x }, { translateY: s.pos.y }, { rotate: s.rotate }, { scale: s.scale }],
        },
      ]}
    >
      <Image source={LOGO} style={{ width: size, height: size }} fadeDuration={0} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hit: { alignItems: 'center', justifyContent: 'center' },
});
