import { getState, hostKey, setSiteRule, siteRule } from '../state/store';

const LOCAL = /^(localhost|.+\.(local|localhost|internal|lan|home|test)|\d{1,3}(\.\d{1,3}){3})$/i;
const upgraded = new Map<string, number>();
const plainHosts = new Set<string>();

export function upgradeHttps(url: string): string {
  if (!getState().settings.httpsUpgrade) return url;
  const m = /^http:\/\/([^/?#]+)/i.exec(url);
  if (!m || /[@:]/.test(m[1])) return url;
  const host = m[1].toLowerCase();
  if (!host.includes('.') || LOCAL.test(host) || plainHosts.has(host) || siteRule(url).https === false) return url;
  const secure = `https://${url.slice(7)}`;
  const now = Date.now();
  const at = upgraded.get(secure);
  if (at && now - at < 5000) {
    plainHosts.add(host);
    return url;
  }
  if (upgraded.size > 300) upgraded.clear();
  upgraded.set(secure, now);
  return secure;
}

export const wasUpgraded = (url: string) => upgraded.has(url);

export function allowHttp(secureUrl: string) {
  setSiteRule(hostKey(secureUrl), { https: false });
  return `http://${secureUrl.replace(/^https:\/\//i, '')}`;
}
