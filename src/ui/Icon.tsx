import { memo, type ComponentType } from 'react';
import { ArrowClockwise } from 'phosphor-react-native/src/icons/ArrowClockwise';
import { ArrowLeft } from 'phosphor-react-native/src/icons/ArrowLeft';
import { ArrowRight } from 'phosphor-react-native/src/icons/ArrowRight';
import { ArrowSquareOut } from 'phosphor-react-native/src/icons/ArrowSquareOut';
import { ArrowUpLeft } from 'phosphor-react-native/src/icons/ArrowUpLeft';
import { BookmarkSimple } from 'phosphor-react-native/src/icons/BookmarkSimple';
import { Browser } from 'phosphor-react-native/src/icons/Browser';
import { CaretDown } from 'phosphor-react-native/src/icons/CaretDown';
import { CaretLeft } from 'phosphor-react-native/src/icons/CaretLeft';
import { CaretRight } from 'phosphor-react-native/src/icons/CaretRight';
import { CaretUp } from 'phosphor-react-native/src/icons/CaretUp';
import { Check } from 'phosphor-react-native/src/icons/Check';
import { CircleHalf } from 'phosphor-react-native/src/icons/CircleHalf';
import { ClockCounterClockwise } from 'phosphor-react-native/src/icons/ClockCounterClockwise';
import { Copy } from 'phosphor-react-native/src/icons/Copy';
import { CrosshairSimple } from 'phosphor-react-native/src/icons/CrosshairSimple';
import { DotsThreeOutline } from 'phosphor-react-native/src/icons/DotsThreeOutline';
import { DownloadSimple } from 'phosphor-react-native/src/icons/DownloadSimple';
import { Eye } from 'phosphor-react-native/src/icons/Eye';
import { EyeSlash } from 'phosphor-react-native/src/icons/EyeSlash';
import { GearSix } from 'phosphor-react-native/src/icons/GearSix';
import { ImageIcon } from 'phosphor-react-native/src/icons/Image';
import { Info } from 'phosphor-react-native/src/icons/Info';
import { Link } from 'phosphor-react-native/src/icons/Link';
import { List } from 'phosphor-react-native/src/icons/List';
import { Lock } from 'phosphor-react-native/src/icons/Lock';
import { LockOpen } from 'phosphor-react-native/src/icons/LockOpen';
import { MagnifyingGlass } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { PencilSimple } from 'phosphor-react-native/src/icons/PencilSimple';
import { Plus } from 'phosphor-react-native/src/icons/Plus';
import { PushPin } from 'phosphor-react-native/src/icons/PushPin';
import { Rows } from 'phosphor-react-native/src/icons/Rows';
import { ShareNetwork } from 'phosphor-react-native/src/icons/ShareNetwork';
import { Shield } from 'phosphor-react-native/src/icons/Shield';
import { Sliders } from 'phosphor-react-native/src/icons/Sliders';
import { Trash } from 'phosphor-react-native/src/icons/Trash';
import { Warning } from 'phosphor-react-native/src/icons/Warning';
import { WifiSlash } from 'phosphor-react-native/src/icons/WifiSlash';
import { X } from 'phosphor-react-native/src/icons/X';
import type { IconProps } from 'phosphor-react-native';

// Per-icon paths: the package index pulls in every icon, about 6 MB of JS.
const ICONS = {
  plus: Plus,
  close: X,
  back: CaretLeft,
  forward: CaretRight,
  down: CaretDown,
  up: CaretUp,
  search: MagnifyingGlass,
  sliders: Sliders,
  clock: ClockCounterClockwise,
  reload: ArrowClockwise,
  share: ShareNetwork,
  pin: PushPin,
  lock: Lock,
  unlock: LockOpen,
  target: CrosshairSimple,
  eye: Eye,
  eyeOff: EyeSlash,
  download: DownloadSimple,
  check: Check,
  external: ArrowSquareOut,
  copy: Copy,
  link: Link,
  shield: Shield,
  list: List,
  more: DotsThreeOutline,
  half: CircleHalf,
  toolbar: Rows,
  trash: Trash,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  bookmark: BookmarkSimple,
  window: Browser,
  info: Info,
  fill: ArrowUpLeft,
  gear: GearSix,
  edit: PencilSimple,
  image: ImageIcon,
  warning: Warning,
  offline: WifiSlash,
} satisfies Record<string, ComponentType<IconProps>>;

export type IconName = keyof typeof ICONS;

type Props = { name: IconName; size?: number; color: string; weight?: number };

// Phosphor draws on a 256 grid: thin 8, light 12, regular 16, bold 24 units.
function phosphorWeight(size: number, stroke: number): IconProps['weight'] {
  const units = (stroke / size) * 256;
  if (units >= 20) return 'bold';
  if (units >= 14) return 'regular';
  return 'light';
}

function Icon({ name, size = 20, color, weight = 2.2 }: Props) {
  const Glyph = ICONS[name];
  return <Glyph size={size} color={color} weight={phosphorWeight(size, weight)} />;
}

export default memo(Icon);
