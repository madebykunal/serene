import { useEffect, useState } from 'react';
import { Animated, BackHandler, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Glass, { Frost } from '../ui/Glass';
import Icon from '../ui/Icon';
import Tap from '../ui/Tap';
import { motion, type, type Palette } from '../ui/theme';

type Props = {
  c: Palette;
  title: string;
  initial: string;
  placeholder: string;
  onSave: (name: string) => void;
  onClose: () => void;
};

export default function Rename({ c, title, initial, placeholder, onSave, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(initial);
  const [anim] = useState(() => new Animated.Value(0));

  const close = (after?: () => void) => {
    Keyboard.dismiss();
    Animated.timing(anim, { toValue: 0, duration: motion.quick, easing: motion.exit, useNativeDriver: true }).start(() => {
      onClose();
      after?.();
    });
  };

  const save = () => {
    const name = text.trim();
    close(() => onSave(name));
  };

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 320, mass: 0.8 }).start();
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }) }]}>
        <Frost radius={16} color={c.dark ? 'rgba(0,0,0,0.5)' : 'rgba(20,24,32,0.22)'} />
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityLabel="Cancel" />
      </Animated.View>
      <Animated.View
        style={[
          styles.wrap,
          {
            top: insets.top + 72,
            opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
            transform: [
              { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) },
              { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
            ],
          },
        ]}
      >
        <Glass c={c} radius={28} tint={c.surface} style={styles.card}>
          <Text style={[styles.title, { color: c.text }]}>{title}</Text>
          <View style={[styles.field, { backgroundColor: c.field }]}>
            <TextInput
              autoFocus
              value={text}
              onChangeText={setText}
              onSubmitEditing={save}
              placeholder={placeholder}
              placeholderTextColor={c.sub}
              selectTextOnFocus
              returnKeyType="done"
              style={[styles.input, { color: c.text }]}
              selectionColor={c.selection}
              selectionHandleColor={c.text}
              cursorColor={c.text}
            />
            {text.length > 0 && (
              <Tap hitSlop={10} onPress={() => setText('')} style={[styles.clear, { backgroundColor: c.sub }]} accessibilityLabel="Clear name">
                <Icon name="close" size={10} color={c.surface} weight={2.6} />
              </Tap>
            )}
          </View>
          <View style={styles.actions}>
            <Tap onPress={() => close()} style={[styles.btn, { backgroundColor: c.fill }]} accessibilityRole="button">
              <Text style={[styles.btnText, { color: c.text }]}>Cancel</Text>
            </Tap>
            <Tap onPress={save} style={[styles.btn, { backgroundColor: c.text }]} accessibilityRole="button">
              <Text style={[styles.btnText, { color: c.surface }]}>Save</Text>
            </Tap>
          </View>
        </Glass>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 20, right: 20 },
  card: { padding: 20, gap: 16 },
  title: { ...type.title },
  field: { height: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 },
  input: { flex: 1, ...type.body, paddingVertical: 0 },
  clear: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  btnText: { ...type.label, fontSize: 15 },
});
