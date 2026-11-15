import { Dimensions, PixelRatio, type ImageSourcePropType } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

type NativeWallpaper = { pick(maxSide: number): Promise<string | null>; clear(): void };

const native = requireOptionalNativeModule<NativeWallpaper>('Wallpaper');

export const canPickWallpaper = native !== null;

export type WallpaperKind = 'none' | 'dusk' | 'dawn' | 'photo';

const BUILT_IN: Record<'dusk' | 'dawn', ImageSourcePropType> = {
  dusk: require('../../assets/bg-night.jpg'),
  dawn: require('../../assets/bg-day.jpg'),
};

export const WALLPAPER_LABELS: Record<WallpaperKind, string> = {
  none: 'None',
  dusk: 'Dusk hills',
  dawn: 'Dawn hills',
  photo: 'Your photo',
};

export function wallpaperSource(kind: string, uri: string): ImageSourcePropType | null {
  if (kind === 'dusk' || kind === 'dawn') return BUILT_IN[kind];
  if (kind === 'photo' && uri) return { uri };
  return null;
}

// The photo is downscaled natively to ~60% of the screen's long edge once, at pick time.
export async function pickWallpaper(): Promise<string | null> {
  if (!native) return null;
  const { width, height } = Dimensions.get('screen');
  const side = Math.round(Math.max(width, height) * PixelRatio.get() * 0.6);
  try {
    return await native.pick(side);
  } catch {
    return null;
  }
}

export function clearWallpaper() {
  try {
    native?.clear();
  } catch {}
}
