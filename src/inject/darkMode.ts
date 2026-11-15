const INVERT_CSS =
  'html{filter:invert(0.94) hue-rotate(180deg)!important;background:#fff!important;min-height:100%!important}' +
  'img[data-srp],video,picture,canvas,iframe,embed,object{filter:invert(1) hue-rotate(180deg)!important}' +
  'picture img,picture source{filter:none!important}';

const GOOGLE_FAMILY =
  '(^|\\.)(google\\.[a-z.]{2,8}|youtube\\.com|youtube-nocookie\\.com|youtu\\.be|gmail\\.com|blogger\\.com|googleusercontent\\.com|withgoogle\\.com|android\\.com)$';

const GOOGLE_HOST = /^https?:\/\/([a-z0-9-]+\.)*google\.[a-z.]{2,8}(\/|$)/i;

export function themeHeaders(url: string, dark: boolean): Record<string, string> | undefined {
  return dark && GOOGLE_HOST.test(url) ? { 'Sec-CH-Prefers-Color-Scheme': '"dark"' } : undefined;
}

function sitePrefs(dark: boolean) {
  const reloaded = `(function(){try{var n=performance.getEntriesByType('navigation')[0];return !!n&&n.type==='reload'}catch(e){return false}})()`;
  return `var h=location.hostname;
if(/(^|\\.)duckduckgo\\.com$/.test(h)){document.cookie='ae=${dark ? 'd' : '-1'}; path=/; domain=.duckduckgo.com; max-age=31536000';}
if(/(^|\\.)youtube\\.com$/.test(h)){var m=/(?:^|; )PREF=([^;]*)/.exec(document.cookie);var parts=m?m[1].split('&'):[];var f6=0,i6=-1;
for(var i=0;i<parts.length;i++){if(parts[i].indexOf('f6=')===0){f6=parseInt(parts[i].slice(3),16)||0;i6=i}}
var want=${dark ? '(f6|0x400)&~0x80000' : 'f6&~0x400'};
if(want!==f6||(${dark ? 'true' : 'false'}&&i6<0)){var v='f6='+want.toString(16);if(i6<0)parts.push(v);else parts[i6]=v;
document.cookie='PREF='+parts.join('&')+'; path=/; domain=.youtube.com; max-age=63072000; secure';
if(!${reloaded}){location.reload();return}}}
if(h==='search.brave.com'){var tm=/(?:^|; )theme=([^;]*)/.exec(document.cookie);var tv=tm?tm[1]:'';
if(${dark ? "tv!=='dark'" : "tv==='dark'"}){document.cookie='theme=${dark ? 'dark' : 'light'}; path=/; max-age=63072000; secure';if(!${reloaded}){location.reload();return}}}
if(/(^|\\.)bing\\.com$/.test(h)){var bm=/(?:^|; )SRCHHPGUSR=([^;]*)/.exec(document.cookie);var bv=bm?bm[1]:'';var bt=/(?:^|&)THEME=(\\d)/.exec(bv);
if(${dark ? "!bt||bt[1]!=='1'" : "bt&&bt[1]==='1'"}){var bn=bt?bv.replace(/(^|&)THEME=\\d/,'$1THEME=${dark ? 1 : 0}'):(bv?bv+'&':'')+'THEME=${dark ? 1 : 0}';
document.cookie='SRCHHPGUSR='+bn+'; path=/; domain=.bing.com; max-age=63072000; secure';
if(!${reloaded}){location.reload();return}}}
${
  dark
    ? `if(!/mwclientpreferences=[^;]*skin-theme-clientpref-/.test(document.cookie)){var DAY=/(^| )skin-theme-clientpref-day( |$)/;
var night=function(){var r=document.documentElement;if(r&&DAY.test(r.className))r.className=r.className.replace(DAY,'$1skin-theme-clientpref-night$2')};
var watch=function(r){var o=new MutationObserver(night);o.observe(r,{attributes:true,attributeFilter:['class']});document.addEventListener('DOMContentLoaded',function(){night();o.disconnect()},{once:true})};
if(document.documentElement)watch(document.documentElement);else{var w=new MutationObserver(function(){if(document.documentElement){w.disconnect();night();watch(document.documentElement)}});w.observe(document,{childList:true})}}`
    : ''
}`;
}

const FOLLOW_DARK = `var native=false;try{native=window.matchMedia('(prefers-color-scheme: dark)').matches}catch(e){}
if(!native){
var mm=window.matchMedia;
window.matchMedia=function(q){var s=String(q);var m=/prefers-color-scheme\\s*:\\s*(dark|light)/i.exec(s);
if(m&&!/[,]|\\band\\b|\\bnot\\b/i.test(s.replace(m[0],''))){var d=m[1].toLowerCase()==='dark';
return{matches:d,media:s,onchange:null,addListener:function(){},removeListener:function(){},addEventListener:function(){},removeEventListener:function(){},dispatchEvent:function(){return false}}}
return mm.call(window,q)};
var RE=/\\(\\s*prefers-color-scheme\\s*:\\s*dark\\s*\\)/ig;
var style=null;
var fix=function(){try{var out=[];
var walk=function(rules){for(var i=0;i<rules.length;i++){var r=rules[i];
if(r.media&&r.cssRules){var t=r.media.mediaText||'';
if(/prefers-color-scheme\\s*:\\s*dark/i.test(t)){var m2=t.replace(RE,'(min-width:0px)');
var inner='';for(var j=0;j<r.cssRules.length;j++){inner+=r.cssRules[j].cssText}out.push('@media '+m2+'{'+inner+'}')}
else walk(r.cssRules)}
else if(r.cssRules&&!r.media)walk(r.cssRules)}};
for(var k=0;k<document.styleSheets.length;k++){var sh=document.styleSheets[k];if(sh.ownerNode&&sh.ownerNode===style)continue;var rs;try{rs=sh.cssRules}catch(e){continue}if(rs)walk(rs)}
if(!style)style=document.createElement('style');
var txt=out.join('\\n');if(style.textContent!==txt)style.textContent=txt;
var root=document.head||document.documentElement;if(out.length&&(style.parentNode!==root||style!==root.lastElementChild))root.appendChild(style);
var meta=document.querySelector('meta[name="color-scheme"]');var cs=getComputedStyle(document.documentElement).colorScheme||'';
if(/dark/.test(cs)||(meta&&/dark/.test(meta.content||'')))document.documentElement.style.colorScheme='dark';
}catch(e){}};
var t=0;var later=function(){clearTimeout(t);t=setTimeout(fix,120)};
document.addEventListener('DOMContentLoaded',function(){fix();try{new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){for(var n=ms[i].addedNodes,j=0;j<n.length;j++){var x=n[j];if(x!==style&&(x.tagName==='STYLE'||x.tagName==='LINK')){later();return}}}}).observe(document.head,{childList:true})}catch(e){}});
window.addEventListener('load',fix);
}`;

const DARKEN = `if(new RegExp(${JSON.stringify(GOOGLE_FAMILY)},'i').test(h))return;
var lum=function(c){var m=/rgba?\\(([\\d.]+)[,\\s]+([\\d.]+)[,\\s]+([\\d.]+)(?:[,\\s/]+([\\d.]+))?/.exec(c||'');if(!m)return null;if(m[4]!==undefined&&+m[4]<0.1)return null;return(0.2126*m[1]+0.7152*m[2]+0.0722*m[3])/255};
var canvas=function(){var l=lum(getComputedStyle(document.documentElement).backgroundColor);if(l===null&&document.body)l=lum(getComputedStyle(document.body).backgroundColor);if(l!==null)return l;return /dark/.test(getComputedStyle(document.documentElement).colorScheme||'')?0:1};
var bgAt=function(el){while(el&&el.nodeType===1&&el!==document.documentElement){var l=lum(getComputedStyle(el).backgroundColor);if(l!==null)return l;el=el.parentElement}return canvas()};
var photo=function(img){try{if(img.tagName!=='IMG'||img.hasAttribute('data-srp'))return;var src=img.currentSrc||img.src||'';if(img.naturalWidth>=96&&img.naturalHeight>=64&&!/\\.svg(\\?|#|$)|^data:image\\/svg/i.test(src))img.setAttribute('data-srp','')}catch(e){}};
var photos=function(){var im=document.images;for(var i=0;i<im.length;i++){if(im[i].complete)photo(im[i])}};
document.addEventListener('load',function(e){photo(e.target)},true);
var inv=null;
var decide=function(){try{if(!document.body)return;var w=innerWidth,hh=innerHeight,light=0,dim=0;
var pts=[[.5,.5],[.5,.25],[.5,.75],[.2,.5],[.8,.5]];
for(var i=0;i<pts.length;i++){var e=document.elementFromPoint(w*pts[i][0],hh*pts[i][1]);var l=bgAt(e||document.body);if(l>0.6)light++;else if(l<0.35)dim++}
if(!inv&&light>=4){photos();inv=document.createElement('style');inv.textContent=${JSON.stringify(INVERT_CSS)};(document.head||document.documentElement).appendChild(inv)}
else if(inv&&dim>=3){inv.remove();inv=null}
}catch(e){}};
document.addEventListener('DOMContentLoaded',function(){setTimeout(decide,30)});
window.addEventListener('load',function(){decide();setTimeout(decide,900);setTimeout(decide,2500)});`;

export function themeScript(dark: boolean, darken = true) {
  if (!dark) return `(function(){try{${sitePrefs(false)}}catch(e){}})();true;`;
  return `(function(){try{
${sitePrefs(true)}
${FOLLOW_DARK}
${darken ? DARKEN : ''}
}catch(e){}})();true;`;
}
