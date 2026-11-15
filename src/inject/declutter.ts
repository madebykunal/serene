const HIDE_CSS = [
  '#credential_picker_container',
  '#credential_picker_iframe',
  'iframe[src*="accounts.google.com/gsi"]',
  'iframe[src*="smartlock.google.com"]',
  'div[id^="g_id_onload"]',
  '#siteNotice',
  '#centralNotice',
  '.smartbanner',
  '[class*="smart-app-banner"]',
  '[id*="smart-app-banner"]',
  '[class*="smartbanner"]',
  '[id*="smartbanner"]',
].join(',');

const PROMO = [
  'try the duckduckgo',
  'duckduckgo browser',
  'get the (free )?app',
  'download the app',
  'install the app',
  'use the app',
  'open (it )?in (the )?app',
  'continue in (the )?app',
  'open app',
  'get the [\\w ]{1,24} app',
  'try (the )?google app',
  'sign in with google',
  'sign up with google',
  'sign up using google',
  'continue with google',
  'continue as [\\w ]{1,30}',
  'stay signed out',
  'add to home screen',
].join('|');

const AGE_GATE = [
  '\\b(18|21)\\s*\\+',
  '\\b(over|older than|at least|above)\\s+(18|21)\\b',
  '\\b(18|21)\\s*(years|yrs|or older|and over|or over)',
  "\\bi\\s*(am|'m|\u2019m)\\s+(18|21|an adult|over|of legal age)",
  '\\badults? only',
  'age verification',
  'verify (your )?age',
  'confirm (your )?age',
  'date of birth',
  'years of age',
  'legal age',
  'adult content',
  'sexually explicit',
  'mature content',
  'age[- ]restricted',
].join('|');

export const DECLUTTER = `(function(){try{
if(window.__srClean)return;window.__srClean=1;
var css=${JSON.stringify(`${HIDE_CSS}{display:none!important}`)};
var add=function(){try{var root=document.head||document.documentElement;if(!root||document.getElementById('__srclean'))return;var st=document.createElement('style');st.id='__srclean';st.textContent=css;root.appendChild(st)}catch(e){}};
add();document.addEventListener('readystatechange',add);
var RX=new RegExp(${JSON.stringify(PROMO)},'i');var AGE=new RegExp(${JSON.stringify(AGE_GATE)},'i');
var hid=false;
var check=function(el){if(el.__srDone)return;var cs=getComputedStyle(el);var p=cs.position;if(p!=='fixed'&&p!=='sticky')return;
var t=(el.innerText||'').trim();if(!t||t.length>700||!RX.test(t)||AGE.test(el.textContent||''))return;
var tag=el.tagName,role=el.getAttribute('role')||'';
if(tag==='HEADER'||tag==='NAV'||/banner|navigation|search|toolbar|menubar/.test(role))return;
var r=el.getBoundingClientRect(),vw=innerWidth,vh=innerHeight;if(!r.width||!r.height)return;
var controls=el.querySelectorAll('a,button,input,select,[role=button]').length;
var modal=/dialog/.test(role)||el.getAttribute('aria-modal')==='true'||r.width*r.height>=vw*vh*0.3;
var bottom=r.bottom>=vh-140&&r.top>vh*0.35;
if(r.top<=4&&!modal){if(el.querySelector('input,[role=search]')||controls>2||t.length>90)return}
else if(!modal&&!bottom)return;
el.style.setProperty('display','none','important');el.__srDone=1;hid=true};
var scan=function(){try{add();var b=document.body;if(!b)return;
var all=b.getElementsByTagName('*');var stop=Math.max(0,all.length-4000);
for(var i=all.length-1;i>=stop;i--)check(all[i]);
for(var k=0;k<b.children.length;k++)check(b.children[k]);
if(hid){[b,document.documentElement].forEach(function(n){if(getComputedStyle(n).overflowY==='hidden')n.style.setProperty('overflow','auto','important')})}
}catch(e){}};
var pending=0;var soon=function(){if(pending)return;pending=setTimeout(function(){pending=0;scan()},450)};
document.addEventListener('DOMContentLoaded',function(){scan();try{new MutationObserver(soon).observe(document.documentElement,{childList:true,subtree:true})}catch(e){}});
window.addEventListener('load',function(){scan();setTimeout(scan,1500);setTimeout(scan,4000)});
}catch(e){}})();true;`;
