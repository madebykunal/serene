import type { ReactNode } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { type, type Palette } from './theme';
import Icon, { type IconName } from './Icon';
import Page from './Page';
import Tap from './Tap';

type RowProps = {
  c: Palette;
  icon?: IconName;
  lead?: ReactNode;
  title: string;
  sub?: string;
  right?: ReactNode;
  danger?: boolean;
  subLines?: number;
  chevron?: boolean;
  onPress?: () => void;
};

export function Row({ c, icon, lead, title, sub, right, danger, subLines = 3, chevron, onPress }: RowProps) {
  const color = danger ? c.danger : c.text;
  const body = (
    <>
      <View style={styles.lead}>
        {lead ??
          (icon ? (
            <View style={[styles.badge, { backgroundColor: danger ? c.fill : c.fill }]}>
              <Icon name={icon} size={19} color={danger ? c.danger : c.sub} weight={2} />
            </View>
          ) : null)}
      </View>
      <View style={styles.flex}>
        <Text numberOfLines={2} style={[styles.title, { color }]}>
          {title}
        </Text>
        {sub ? (
          <Text numberOfLines={subLines} style={[styles.sub, { color: c.sub }]}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right}
      {chevron && <Icon name="forward" size={15} color={c.sub} weight={2} />}
    </>
  );
  return onPress ? (
    <Tap dim={0.6} scale={0.985} onPress={onPress} style={styles.row}>
      {body}
    </Tap>
  ) : (
    <View style={styles.row}>{body}</View>
  );
}

function Toggle({ c, value, onChange }: { c: Palette; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: c.dark ? '#4A4C52' : '#C9CDD2', true: c.brandSoft }}
      thumbColor={value ? '#FFFFFF' : c.dark ? '#D5D7DB' : '#FFFFFF'}
      ios_backgroundColor={c.dark ? '#4A4C52' : '#C9CDD2'}
    />
  );
}

export function SwitchRow({
  c,
  icon,
  title,
  sub,
  value,
  onChange,
}: {
  c: Palette;
  icon: IconName;
  title: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Row
      c={c}
      icon={icon}
      title={title}
      sub={sub}
      right={<Toggle c={c} value={value} onChange={onChange} />}
      onPress={() => onChange(!value)}
    />
  );
}

export function Note({ c, children }: { c: Palette; children: ReactNode }) {
  return <Text style={[styles.note, { color: c.sub }]}>{children}</Text>;
}

function Radio({ c, on }: { c: Palette; on: boolean }) {
  return (
    <View style={[styles.radio, { borderColor: on ? c.text : c.sub }]}>
      {on && <View style={[styles.radioDot, { backgroundColor: c.text }]} />}
    </View>
  );
}

type ChoiceProps = {
  c: Palette;
  title: string;
  note?: string;
  options: { key: string; label: string; sub?: string }[];
  value: string;
  onPick: (key: string) => void;
  onClose: () => void;
};

export function Choice({ c, title, note, options, value, onPick, onClose }: ChoiceProps) {
  return (
    <Page c={c} title={title} onClose={onClose}>
      {options.map((o) => (
        <Row
          key={o.key}
          c={c}
          lead={<Radio c={c} on={o.key === value} />}
          title={o.label}
          sub={o.sub}
          onPress={() => o.key !== value && onPick(o.key)}
        />
      ))}
      {note && <Note c={c}>{note}</Note>}
    </Page>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingRight: 20, paddingVertical: 10, gap: 4 },
  lead: { width: 68, alignItems: 'center', justifyContent: 'center', paddingLeft: 4 },
  badge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.bodyStrong, fontWeight: '500' },
  sub: { ...type.caption, fontWeight: '400', fontSize: 13.5, lineHeight: 18, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 6 },
  note: { fontSize: 13.5, lineHeight: 19, paddingHorizontal: 20, paddingLeft: 72, marginTop: 12 },
});
