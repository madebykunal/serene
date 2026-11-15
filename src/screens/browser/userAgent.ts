import { Platform } from 'react-native';

export const IOS_APP_NAME = `Version/${parseInt(String(Platform.Version), 10) || 18}.0 Safari/604.1`;
export const androidUserAgent = (chrome: number) =>
  `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chrome || 140}.0.0.0 Mobile Safari/537.36`;
export const desktopUserAgent = (chrome: number) =>
  Platform.OS === 'ios'
    ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
    : `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chrome || 140}.0.0.0 Safari/537.36`;
