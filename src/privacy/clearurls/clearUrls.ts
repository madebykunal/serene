import rules from './rules.json';

type RawProvider = {
  urlPattern: string;
  completeProvider?: boolean;
  rules?: string[];
  rawRules?: string[];
  referralMarketing?: string[];
  exceptions?: string[];
  redirections?: string[];
};

type Provider = {
  url: RegExp;
  exceptions: RegExp[];
  redirections: RegExp[];
  raw: RegExp[];
  fields: RegExp | null;
};

let compiled: Provider[] | null = null;

function rx(source: string, flags = 'i'): RegExp | null {
  try {
    return new RegExp(source, flags);
  } catch {
    return null;
  }
}

function compile(): Provider[] {
  const out: Provider[] = [];
  const providers = (rules as { providers: Record<string, RawProvider> }).providers;
  for (const name of Object.keys(providers)) {
    const p = providers[name];
    const url = rx(p.urlPattern);
    if (!url) continue;
    const fieldRules = [...(p.rules ?? []), ...(p.referralMarketing ?? [])].filter((r) => rx(r));
    out.push({
      url,
      exceptions: (p.exceptions ?? []).map((e) => rx(e)).filter((e): e is RegExp => !!e),
      redirections: (p.redirections ?? []).map((e) => rx(e)).filter((e): e is RegExp => !!e),
      raw: (p.rawRules ?? []).map((e) => rx(e, 'gi')).filter((e): e is RegExp => !!e),
      fields: fieldRules.length ? rx(`^(?:${fieldRules.join('|')})$`) : null,
    });
  }
  return out;
}

function decode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function stripFields(part: string, fields: RegExp) {
  const kept = part.split('&').filter((pair) => {
    if (!pair) return false;
    const key = pair.split('=')[0];
    return !fields.test(key) && !fields.test(decode(key));
  });
  return kept.join('&');
}

function clean(url: string, depth: number): string {
  if (!/^https?:\/\//i.test(url)) return url;
  compiled ??= compile();
  let out = url;
  for (const p of compiled) {
    if (!p.url.test(out) || p.exceptions.some((e) => e.test(out))) continue;
    for (const r of p.redirections) {
      const m = r.exec(out);
      if (m?.[1] && depth < 3) {
        const target = decode(m[1]);
        if (/^https?:\/\//i.test(target)) return clean(target, depth + 1);
      }
    }
    for (const r of p.raw) out = out.replace(r, '');
    if (p.fields) {
      const hashAt = out.indexOf('#');
      const hash = hashAt >= 0 ? out.slice(hashAt + 1) : null;
      const beforeHash = hashAt >= 0 ? out.slice(0, hashAt) : out;
      const qAt = beforeHash.indexOf('?');
      const base = qAt >= 0 ? beforeHash.slice(0, qAt) : beforeHash;
      const query = qAt >= 0 ? stripFields(beforeHash.slice(qAt + 1), p.fields) : '';
      const frag = hash !== null && hash.includes('=') ? stripFields(hash, p.fields) : hash;
      out = base + (query ? `?${query}` : '') + (frag ? `#${frag}` : '');
    }
  }
  return out;
}

export function cleanUrl(url: string): string {
  try {
    return clean(url, 0);
  } catch {
    return url;
  }
}
