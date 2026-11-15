const AMP_URLS: [RegExp, string][] = [
  [/^https?:\/\/(?:www\.)?google\.[a-z.]{2,8}\/amp\/s\/([^?#]+(?:[?#].*)?)$/i, 'https://$1'],
  [/^https?:\/\/[^/]+\.cdn\.ampproject\.org\/[cv]\/s\/(.+)$/i, 'https://$1'],
  [/^https?:\/\/[^/]+\.turbopages\.org\/([^/]+)\/s(\/.*)$/i, 'https://$1$2'],
];

export function unwrapAmp(url: string) {
  for (const [re, to] of AMP_URLS) {
    if (re.test(url)) return url.replace(re, to);
  }
  return url;
}

let lastLeave = { url: '', at: 0 };

export function leaveAmp(canonical: string, current: string): string | null {
  if (!/^https?:\/\//i.test(canonical)) return null;
  if (canonical.split('#')[0] === current.split('#')[0]) return null;
  const now = Date.now();
  if (lastLeave.url === canonical && now - lastLeave.at < 30000) return null;
  lastLeave = { url: canonical, at: now };
  return canonical;
}

export const AMP_SCRIPT = `(function(){try{
var go=function(){try{var d=document.documentElement;if(!d||!(d.hasAttribute('amp')||d.hasAttribute('\\u26A1')))return;
var l=document.querySelector('head link[rel~="canonical"]');var u=l&&l.href;
if(u&&/^https?:/i.test(u)&&window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({k:'amp',v:u}))}catch(e){}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();
}catch(e){}})();true;`;
