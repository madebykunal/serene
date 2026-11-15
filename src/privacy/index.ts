import { useEffect } from 'react';
import { getState, useStore } from '../state/store';
import { setAdblock, setSiteExceptions } from './adblock';
import { unwrapAmp } from './amp';
import { setTrackerLearning } from './badger';
import { cleanUrl } from './clearurls/clearUrls';
import { upgradeHttps } from './https';
import { skipRedirects } from './redirects';

export function tidyUrl(url: string) {
  const s = getState().settings;
  let out = url;
  if (s.skipRedirects) out = skipRedirects(out);
  if (s.deAmp) out = unwrapAmp(out);
  if (s.cleanLinks) out = cleanUrl(out);
  return out;
}

export const navigationUrl = (url: string) => upgradeHttps(tidyUrl(url));

let lastClean = { url: '', at: 0, count: 0 };

export function cleanNavigation(url: string): string | null {
  const clean = navigationUrl(url);
  if (clean === url) return null;
  const now = Date.now();
  const repeat = lastClean.url === clean && now - lastClean.at < 3000;
  lastClean = { url: clean, at: now, count: repeat ? lastClean.count + 1 : 1 };
  return lastClean.count <= 2 ? clean : null;
}

export function usePrivacySync() {
  const blockAds = useStore((s) => s.settings.blockAds);
  const learnTrackers = useStore((s) => s.settings.learnTrackers);
  const sites = useStore((s) => s.sites);

  useEffect(() => {
    setAdblock(blockAds);
  }, [blockAds]);

  useEffect(() => {
    setTrackerLearning(learnTrackers);
  }, [learnTrackers]);

  useEffect(() => {
    setSiteExceptions(Object.keys(sites).filter((h) => sites[h].ads === false));
  }, [sites]);
}
