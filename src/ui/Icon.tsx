import { memo } from 'react';
import Path from 'react-native-svg/src/elements/Path';
import Svg from 'react-native-svg/src/elements/Svg';
import { PATHS } from './iconPaths';

export type IconName = keyof typeof PATHS;

type Props = { name: IconName; size?: number; color: string; weight?: number };

// Phosphor draws on a 256 grid: regular strokes are 16 units, bold 24.
function Icon({ name, size = 20, color, weight = 2.2 }: Props) {
  const paths = PATHS[name][(weight / size) * 256 >= 20 ? 0 : 1];
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256">
      {paths.map((d) => (
        <Path key={d} d={d} fill={color} />
      ))}
    </Svg>
  );
}

export default memo(Icon);
