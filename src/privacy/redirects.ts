import { native } from './native';

export function skipRedirects(url: string) {
  if (!native || !/^https?:\/\//i.test(url)) return url;
  try {
    return native.debounce(url) ?? url;
  } catch {
    return url;
  }
}
