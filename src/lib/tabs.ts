import type { Tab } from '../state/store';
import { prettyHost, queryFromUrl } from './url';

export const cardWidth = (screenWidth: number) => Math.round(Math.min(screenWidth * 0.64, 420));

export function tabLabel(t: Tab) {
  return t.name || (queryFromUrl(t.url) ?? (t.title || prettyHost(t.url) || 'New tab'));
}
