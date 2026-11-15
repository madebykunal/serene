import { Image, StyleSheet, View } from 'react-native';

const FILL = [StyleSheet.absoluteFill, { width: '100%', height: '100%' }] as const;

const DAY = require('../../assets/bg-day.jpg');
const NIGHT = require('../../assets/bg-night.jpg');

export default function Backdrop({ dark, visible = true }: { dark: boolean; visible?: boolean }) {
  if (!visible) {
    return <View style={[FILL, { backgroundColor: 'transparent' }]} />;
  }
  return <Image source={dark ? NIGHT : DAY} style={FILL} resizeMode="cover" fadeDuration={0} />;
}
