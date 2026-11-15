const POST = `var post=function(o){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(o))};`;

export function guard(hosts: string[], script: string) {
  if (!hosts.length) return script;
  return `(function(){try{var h=location.hostname.replace(/^www\\./,'');var H=${JSON.stringify(hosts)};
for(var i=0;i<H.length;i++){if(h===H[i]||h.slice(-H[i].length-1)==='.'+H[i])return}}catch(e){}
${script}
})();true;`;
}

export const PAGE_INFO = `(function(){try{${POST}
var best=null,size=0,ls=document.querySelectorAll('link[rel~="icon"],link[rel="apple-touch-icon"],link[rel="apple-touch-icon-precomposed"]');
for(var i=0;i<ls.length;i++){var l=ls[i],h=l.href||'';if(!h||/\\.svg(\\?|#|$)/i.test(h)||/^data:image\\/svg/i.test(h))continue;
var s=parseInt((l.getAttribute('sizes')||'').split('x')[0],10)||(/apple/.test(l.rel)?180:32);if(s>size&&s<=512){best=h;size=s}}
post({k:'icon',v:best||(location.origin+'/favicon.ico')});
var bd=navigator.userAgentData&&navigator.userAgentData.brands;if(bd){for(var j=0;j<bd.length;j++){if(/Chromium|Android WebView|Google Chrome/.test(bd[j].brand)){post({k:'ver',v:bd[j].version});break}}}
var m=document.querySelector('meta[name="theme-color"]:not([media]),meta[name="theme-color"][media*="'+(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')+'"]');
var tc=m&&m.content;if(!tc){var b=getComputedStyle(document.body||document.documentElement).backgroundColor;tc=b&&b!=='rgba(0, 0, 0, 0)'?b:getComputedStyle(document.documentElement).backgroundColor}
post({k:'tc',v:tc||''});
if(!window.__sr){window.__sr=1;var last=window.scrollY,dir=0;window.addEventListener('scroll',function(){var y=window.scrollY,d=y-last;if(Math.abs(d)<16)return;last=y;var n=d>0&&y>80?1:-1;if(n!==dir){dir=n;post({k:'dir',v:n})}},{passive:true});
document.addEventListener('click',function(e){if(e.defaultPrevented)return;var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;if(!a||(a.target&&a.target!=='_self'&&a.target!=='_top'))return;var h=a.getAttribute('href')||'';if(!h||h.charAt(0)==='#'||/^(javascript|mailto|tel|sms):/i.test(h))return;try{var u=new URL(a.href);if(u.origin===location.origin&&u.pathname===location.pathname&&u.search===location.search)return}catch(x){return}dir=0;post({k:'go'})})}
}catch(e){}})();true;`;

export const LONG_PRESS = `(function(){try{if(window.__srCtx)return;window.__srCtx=1;${POST}
var timer=0,sx=0,sy=0,fired=false;
var find=function(el){var a=null,img=null;while(el&&el.nodeType===1){if(!img&&el.tagName==='IMG')img=el;if(!a&&el.tagName==='A'&&el.href)a=el;el=el.parentElement}return{a:a,img:img}};
document.addEventListener('touchstart',function(e){fired=false;if(e.touches.length!==1)return;var t=e.touches[0];sx=t.clientX;sy=t.clientY;var f=find(e.target);if(!f.a&&!f.img)return;
clearTimeout(timer);timer=setTimeout(function(){fired=true;var a=f.a,img=f.img;
post({k:'ctx',v:{link:a?a.href:'',text:a?(a.innerText||a.title||'').trim().slice(0,140):'',img:img?(img.currentSrc||img.src||''):'',alt:img?(img.alt||'').slice(0,140):'',x:sx/innerWidth,y:sy/innerHeight}})},480)},{passive:true,capture:true});
var cancel=function(){clearTimeout(timer)};
document.addEventListener('touchmove',function(e){var t=e.touches[0];if(Math.abs(t.clientX-sx)>10||Math.abs(t.clientY-sy)>10)cancel()},{passive:true,capture:true});
document.addEventListener('touchend',function(e){cancel();if(fired&&e.cancelable)e.preventDefault()},{capture:true});
document.addEventListener('touchcancel',cancel,{capture:true});
document.addEventListener('click',function(e){if(fired){e.preventDefault();e.stopPropagation();fired=false}},true);
document.addEventListener('contextmenu',function(e){var f=find(e.target);if(f.a||f.img)e.preventDefault()},true);
}catch(e){}})();true;`;

export const PULL_TO_REFRESH = `(function(){try{if(window.__srPull)return;window.__srPull=1;${POST}
var y0=null,last=-1,pulling=false;
var top=function(){return (window.scrollY||document.documentElement.scrollTop||0)<=0};
var inner=function(el){while(el&&el.nodeType===1&&el!==document.body&&el!==document.documentElement){if(el.scrollTop>0)return true;el=el.parentElement}return false};
document.addEventListener('touchstart',function(e){if(e.touches.length!==1||!top()||inner(e.target)){y0=null;return}y0=e.touches[0].clientY;pulling=false;last=-1},{passive:true});
document.addEventListener('touchmove',function(e){if(y0===null)return;var d=e.touches[0].clientY-y0;
if(d<=0||!top()){if(pulling){pulling=false;last=-1;post({k:'pull',v:0})}return}
var r=Math.round(Math.min(1,d/150)*10)/10;if(r!==last){last=r;pulling=true;post({k:'pull',v:r})}},{passive:true});
var end=function(){if(y0===null)return;if(pulling)post({k:'pullEnd',v:last>=1});y0=null;pulling=false;last=-1};
document.addEventListener('touchend',end,{passive:true});document.addEventListener('touchcancel',end,{passive:true});
}catch(e){}})();true;`;

export const DESKTOP_VIEWPORT = `(function(){try{var fix=function(){var m=document.querySelector('meta[name=viewport]');if(!m){m=document.createElement('meta');m.name='viewport';(document.head||document.documentElement).appendChild(m)}m.setAttribute('content','width=1100')};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fix);else fix()}catch(e){}})();true;`;

export function textSizeScript(percent: number) {
  if (percent === 100) return '';
  return `(function(){try{var f=function(){document.documentElement.style.webkitTextSizeAdjust='${percent}%'};
if(document.documentElement)f();document.addEventListener('DOMContentLoaded',f)}catch(e){}})();true;`;
}

export function findScript(query: string, step: number) {
  return `(function(){try{${POST}
var S=window.__srF||(window.__srF={marks:[],i:-1,q:''});
var clear=function(){for(var k=0;k<S.marks.length;k++){var m=S.marks[k],p=m.parentNode;if(p){p.replaceChild(document.createTextNode(m.textContent),m);p.normalize()}}S.marks=[];S.i=-1};
var q=${JSON.stringify(query)},step=${step};
if(q!==S.q||step===0){clear();S.q=q;
if(q){var esc=q.replace(/[.*+?^\${}()|[\\]\\\\]/g,'\\\\$&');var test=new RegExp(esc,'i'),re=new RegExp(esc,'gi');
var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:function(n){var p=n.parentNode;if(!p||/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|INPUT|SELECT)$/.test(p.nodeName))return 2;if(!test.test(n.data))return 2;var cs=getComputedStyle(p);return cs.display==='none'||cs.visibility==='hidden'?2:1}});
var nodes=[];while(w.nextNode())nodes.push(w.currentNode);
for(var a=0;a<nodes.length&&S.marks.length<1000;a++){var n=nodes[a],t=n.data,frag=document.createDocumentFragment(),last=0,m;re.lastIndex=0;
while((m=re.exec(t))&&S.marks.length<1000){if(m.index>last)frag.appendChild(document.createTextNode(t.slice(last,m.index)));
var mk=document.createElement('mark');mk.textContent=m[0];mk.style.cssText='background:#ffd54a;color:#111;border-radius:2px;padding:0';frag.appendChild(mk);S.marks.push(mk);last=m.index+m[0].length}
if(last<t.length)frag.appendChild(document.createTextNode(t.slice(last)));n.parentNode.replaceChild(frag,n)}
S.i=S.marks.length?0:-1}}
else if(S.marks.length){S.i=(S.i+step+S.marks.length)%S.marks.length}
for(var k=0;k<S.marks.length;k++)S.marks[k].style.background=k===S.i?'#ff9632':'#ffd54a';
if(S.i>=0&&S.marks[S.i].scrollIntoView)S.marks[S.i].scrollIntoView({block:'center',behavior:'smooth'});
post({k:'find',v:{n:S.marks.length,i:S.i}});
}catch(e){}})();true;`;
}
