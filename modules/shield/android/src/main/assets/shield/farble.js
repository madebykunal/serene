/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
(function () {
  'use strict';
  var NAME = '__BRIDGE__';
  var W = window;
  var B = W[NAME];
  if (!B || typeof B.farble !== 'function') return;
  var web = /^https?:$/.test(location.protocol);
  if (!web) { try { delete W[NAME]; } catch (e) {} }

  var apply = Reflect.apply;
  var construct = Reflect.construct;
  var defineProperty = Object.defineProperty;
  var getDesc = Object.getOwnPropertyDescriptor;
  var getProto = Object.getPrototypeOf;
  var floor = Math.floor;
  var imul = Math.imul;
  var BigIntFn = BigInt;
  var NumberFn = Number;
  var U32 = Uint32Array;
  var mapGet = WeakMap.prototype.get;
  var mapSet = WeakMap.prototype.set;
  var setHas = WeakSet.prototype.has;
  var setAdd = WeakSet.prototype.add;
  var strTest = RegExp.prototype.test;
  var strSlice = String.prototype.slice;
  var numToString = Number.prototype.toString;
  var parseIntFn = parseInt;
  var ceil = Math.ceil;
  var isView = ArrayBuffer.isView;
  var U8 = Uint8Array;
  var TA = getProto(Uint8Array.prototype);
  var taBuffer = getDesc(TA, 'buffer').get;
  var taOffset = getDesc(TA, 'byteOffset').get;
  var taBytes = getDesc(TA, 'byteLength').get;
  var taLength = getDesc(TA, 'length').get;
  var taSub = TA.subarray;
  var create = Object.create;
  var masked = new WeakMap();
  var installed = new WeakSet();
  var offline = new WeakSet();
  var farbled = new WeakSet();

  var TOP = topUrl();
  if (!/^https?:/.test(TOP)) return;
  var cfg = null;
  try { cfg = JSON.parse(B.farble(TOP, web ? location.href : TOP) || 'null'); } catch (e) { cfg = null; }
  if (!cfg || !cfg.l || !cfg.r || !cfg.m) return;
  var L = cfg.l;
  var R = cfg.r;
  var MARK = cfg.m;
  var REPLY = '_' + apply(numToString, floor(R[7] * 1e15), [36]);
  var SW = cfg.w | 0;
  var SH = cfg.h | 0;
  var FX = 1 + (R[2] - 0.5) * 0.0003;
  var FY = 1 + (R[3] - 0.5) * 0.0003;
  var TF = 1 + (R[4] - 0.5) * 0.0003;
  var AF = 0.999 + R[5] / 1000;
  var cfChallenge = /\/cdn-cgi\/challenge-platform\//.test(location.pathname) || /[?&]__cf_chl_/.test(location.search);
  var seeds = create(null);
  var seedCount = 0;

  function topUrl() {
    if (W === W.top) return location.href;
    try { var h = W.top.location.href; if (h) return h; } catch (e) {}
    var a = location.ancestorOrigins;
    if (a && a.length) return a[a.length - 1] + '/';
    return document.referrer || location.href;
  }

  function on(f) { return L[f] >= 1; }
  function strict(f) { return L[f] >= 2 && !cfChallenge; }

  function proxy(fn, trap) {
    var p = new Proxy(fn, { apply: trap });
    apply(mapSet, masked, [p, fn]);
    return p;
  }
  function method(o, k, trap) {
    var d = o && getDesc(o, k);
    if (!d || typeof d.value !== 'function') return;
    d.value = proxy(d.value, trap);
    defineProperty(o, k, d);
  }
  function getter(o, k, fn) {
    var d = o && getDesc(o, k);
    if (!d || typeof d.get !== 'function') return;
    d.get = proxy(d.get, function (t, self, a) { return fn(apply(t, self, a), self); });
    defineProperty(o, k, d);
  }
  function setter(o, k, fn) {
    var d = o && getDesc(o, k);
    if (!d || typeof d.set !== 'function') return;
    d.set = proxy(d.set, function (t, self, a) { return apply(t, self, [fn(a[0], self)]); });
    defineProperty(o, k, d);
  }
  function nativeGet(o, k) { var d = o && getDesc(o, k); return d && d.get; }

  function hex8(n) { return apply(strSlice, '0000000' + apply(numToString, n >>> 0, [16]), [-8]); }

  function digest(d) {
    var len = apply(taBytes, d, []);
    var off = apply(taOffset, d, []);
    var buf = apply(taBuffer, d, []);
    var n = len >> 2;
    var u = (off & 3) === 0 ? new U32(buf, off, n) : null;
    var b = u ? null : new U8(buf, off, len);
    var step = n > 1048576 ? ceil(n / 1048576) : 1;
    var h1 = 0x811c9dc5 ^ len;
    var h2 = 0x9747b28c ^ imul(len, 0x85ebca6b);
    for (var i = 0; i < n; i += step) {
      var x = u ? u[i] : b[4 * i] | (b[4 * i + 1] << 8) | (b[4 * i + 2] << 16) | (b[4 * i + 3] << 24);
      h1 = imul(h1 ^ x, 0x01000193);
      h1 = (h1 << 13) | (h1 >>> 19);
      h2 = imul((h2 + x) | 0, 0x5bd1e995);
      h2 ^= h2 >>> 15;
    }
    return hex8(h1) + hex8(h2);
  }

  function seed(h) {
    var k = seeds[h];
    if (k) return k;
    var s = '';
    try { s = '' + (B.noise(TOP, h) || ''); } catch (e) { s = ''; }
    if (s.length < 64) return null;
    k = new U32(8);
    for (var i = 0; i < 8; i++) k[i] = parseIntFn(apply(strSlice, s, [i * 8, i * 8 + 8]), 16);
    if (++seedCount > 64) { seeds = create(null); seedCount = 1; }
    seeds[h] = k;
    return k;
  }

  function sfc(a, b, c, d) {
    return function () {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
      var t = (a + b) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      d = (d + 1) | 0;
      t = (t + d) | 0;
      c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
  }

  var M64 = (BigIntFn(1) << BigIntFn(64)) - BigIntFn(1);
  var HIGH = BigIntFn('0xC000000000000000');
  var ONE = BigIntFn(1);
  var B32 = BigIntFn(32);
  var B61 = BigIntFn(61);
  var B62 = BigIntFn(62);
  var THREE = BigIntFn(3);
  var ZERO = BigIntFn(0);
  var SPARE = BigIntFn('0x9E3779B97F4A7C15');
  function lfsr(v) { return ((v >> ONE) | (((v << B62) ^ (v << B61)) & HIGH)) & M64; }

  function same(d, a, b) { return d[a] === d[b] && d[a + 1] === d[b + 1] && d[a + 2] === d[b + 2] && d[a + 3] === d[b + 3]; }
  function edge(d, p, w, n) {
    var i = p * 4;
    if (d[i + 3] === 0) return false;
    var x = p % w;
    var k = 0;
    if (x > 0) { k++; if (!same(d, i, i - 4)) return true; }
    if (x < w - 1) { k++; if (!same(d, i, i + 4)) return true; }
    if (p >= w) { k++; if (!same(d, i, i - 4 * w)) return true; }
    if (p + w < n) { k++; if (!same(d, i, i + 4 * w)) return true; }
    return k === 0;
  }

  function perturb(d, w) {
    var n = floor(apply(taLength, d, []) / 4);
    if (!n || !w) return;
    var k = seed(digest(d));
    if (!k) return;
    var v = (BigIntFn(k[1]) << B32) | BigIntFn(k[0]);
    if (v === ZERO) v = SPARE;
    var N = BigIntFn(n);
    for (var i = 0; i < 32; i++) {
      var key = (k[i >> 2] >>> ((i & 3) << 3)) & 255;
      var bit = key;
      for (var j = 0; j < 16; j++) {
        if ((j & 7) === 0) bit = key;
        if (bit & 1) {
          var p = NumberFn(v % N);
          if (edge(d, p, w, n)) d[4 * p + NumberFn(v % THREE)] ^= 1;
        }
        bit >>= 1;
        v = lfsr(v);
      }
    }
  }

  var GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|math|emoji|fangsong|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|inherit|initial|unset|revert|revert-layer)$/;
  var QUICK = /samsung|sec|oneplus|oplus|oppo|coloros|mi ?sans|mi ?lan|mitype|miui|harmony|honor|hw|vivo|google|product|ntype|nothing|realme|moto|lg|sst|flyme|xiaomi|huawei|zenui|sony|one ?ui/i;
  var DENY = /^(samsung|sec[ -]|sec$|oneplus|oplus|oppo ?sans|coloros|mi ?sans|mi ?lan|mitype|miui|harmony ?os|honor ?sans|hw[a-z]|vivo ?(sans|type)|google ?sans|product ?sans|ntype|nothing|realme|moto(rola)? ?sans|lg ?smart|sst |flyme|xiaomi|huawei|zenui|sony ?sans|one ?ui)/;

  function fonts(win) {
    var doc = win.document;
    var known = { size: -1, set: null };
    function pageFonts() {
      var fs = doc.fonts;
      if (!fs) return null;
      if (known.size !== fs.size) {
        var s = new Set();
        try { fs.forEach(function (f) { s.add(String(f.family).replace(/["']/g, '').trim().toLowerCase()); }); } catch (e) {}
        known.size = fs.size;
        known.set = s;
      }
      return known.set;
    }
    function denied(name) {
      var n = String(name).replace(/["']/g, '').trim().toLowerCase();
      if (!n || apply(strTest, GENERIC, [n]) || !apply(strTest, DENY, [n])) return false;
      var pf = pageFonts();
      return !(pf && pf.has(n));
    }
    function families(v) {
      if (typeof v !== 'string' || !apply(strTest, QUICK, [v])) return v;
      var parts = v.split(',');
      var kept = [];
      for (var i = 0; i < parts.length; i++) if (!denied(parts[i])) kept.push(parts[i].trim());
      return kept.length ? kept.join(', ') : 'sans-serif';
    }
    function font(v) {
      if (typeof v !== 'string') return v;
      var m = /^(.*?\d*\.?\d+(?:px|pt|pc|em|rem|ex|ch|%|vw|vh|vmin|vmax|q|mm|cm|in)(?:\s*\/\s*\S+)?\s+)(.+)$/i.exec(v);
      return m ? m[1] + families(m[2]) : v;
    }
    var cssFamily = function (v) { return strict('fonts') ? families(v) : v; };
    var cssFont = function (v) { return strict('fonts') ? font(v) : v; };
    [win.CanvasRenderingContext2D, win.OffscreenCanvasRenderingContext2D].forEach(function (C) {
      if (C) setter(C.prototype, 'font', cssFont);
    });
    var CS = win.CSSStyleDeclaration && win.CSSStyleDeclaration.prototype;
    var cssText = function (v) {
      if (!strict('fonts') || typeof v !== 'string' || !apply(strTest, QUICK, [v])) return v;
      return v
        .replace(/(font-family\s*:\s*)([^;!]+)/gi, function (m, p, f) { return p + families(f); })
        .replace(/((?:^|;)\s*font\s*:\s*)([^;!]+)/gi, function (m, p, f) { return p + font(f); });
    };
    setter(CS, 'fontFamily', cssFamily);
    setter(CS, 'font', cssFont);
    setter(CS, 'cssText', cssText);
    method(win.Element && win.Element.prototype, 'setAttribute', function (t, self, a) {
      if (typeof a[0] === 'string' && a[0].length === 5 && a[0].toLowerCase() === 'style') a = [a[0], cssText(a[1])];
      return apply(t, self, a);
    });
    method(CS, 'setProperty', function (t, self, a) {
      if (strict('fonts') && typeof a[0] === 'string' && typeof a[1] === 'string') {
        var p = a[0].toLowerCase();
        if (p === 'font-family') a = [a[0], families(a[1]), a[2]];
        else if (p === 'font') a = [a[0], font(a[1]), a[2]];
      }
      return apply(t, self, a);
    });
    var FF = win.FontFace;
    if (typeof FF === 'function') {
      var P = new Proxy(FF, {
        construct: function (t, a, nt) {
          if (strict('fonts') && typeof a[1] === 'string' && /local\(/i.test(a[1])) {
            a = [a[0], a[1].replace(/local\(\s*(['"]?)([^)'"]+)\1\s*\)/gi, function (m, q, name) { return denied(name) ? 'local("' + MARK + '")' : m; }), a[2]];
          }
          return construct(t, a, nt);
        },
      });
      apply(mapSet, masked, [P, FF]);
      var fd = getDesc(win, 'FontFace');
      if (fd) { fd.value = P; defineProperty(win, 'FontFace', fd); }
      var cd = getDesc(FF.prototype, 'constructor');
      if (cd) { cd.value = P; defineProperty(FF.prototype, 'constructor', cd); }
    }
    var TM = win.TextMetrics && win.TextMetrics.prototype;
    var METRICS = ['width', 'actualBoundingBoxLeft', 'actualBoundingBoxRight', 'fontBoundingBoxAscent', 'fontBoundingBoxDescent', 'actualBoundingBoxAscent', 'actualBoundingBoxDescent', 'emHeightAscent', 'emHeightDescent', 'hangingBaseline', 'alphabeticBaseline', 'ideographicBaseline'];
    var READ = METRICS.map(function (k) { return nativeGet(TM, k); });
    var measure = function (t, self, a) {
      var m = apply(t, self, a);
      if (m && TM && strict('fonts')) {
        for (var i = 0; i < METRICS.length; i++) {
          var g = READ[i];
          if (!g) continue;
          var v = apply(g, m, []);
          if (typeof v === 'number' && v === v) defineProperty(m, METRICS[i], { value: v * TF, writable: false, enumerable: false, configurable: true });
        }
      }
      return m;
    };
    [win.CanvasRenderingContext2D, win.OffscreenCanvasRenderingContext2D].forEach(function (C) {
      if (C) method(C.prototype, 'measureText', measure);
    });
  }

  function canvas(win) {
    var HC = win.HTMLCanvasElement;
    var C2 = win.CanvasRenderingContext2D;
    var OC = win.OffscreenCanvas;
    var O2 = win.OffscreenCanvasRenderingContext2D;
    if (!HC || !C2) return;
    var n = {
      get: C2.prototype.getImageData,
      put: C2.prototype.putImageData,
      draw: C2.prototype.drawImage,
      ctx: HC.prototype.getContext,
      url: HC.prototype.toDataURL,
      blob: HC.prototype.toBlob,
      create: win.Document.prototype.createElement,
      w: nativeGet(HC.prototype, 'width'),
      h: nativeGet(HC.prototype, 'height'),
      sw: getDesc(HC.prototype, 'width').set,
      sh: getDesc(HC.prototype, 'height').set,
      data: nativeGet(win.ImageData.prototype, 'data'),
      iw: nativeGet(win.ImageData.prototype, 'width'),
    };
    var o = OC && O2 ? {
      get: O2.prototype.getImageData,
      put: O2.prototype.putImageData,
      draw: O2.prototype.drawImage,
      ctx: OC.prototype.getContext,
      blob: OC.prototype.convertToBlob,
      w: nativeGet(OC.prototype, 'width'),
      h: nativeGet(OC.prototype, 'height'),
    } : null;
    var opts = { willReadFrequently: true };
    function copy(src, off) {
      try {
        var m = off ? o : n;
        var w = apply(m.w, src, []);
        var h = apply(m.h, src, []);
        if (!w || !h || w * h > 16777216) return null;
        var s;
        if (off) s = new OC(w, h);
        else { s = apply(n.create, win.document, ['canvas']); apply(n.sw, s, [w]); apply(n.sh, s, [h]); }
        var cx = apply(m.ctx, s, ['2d', opts]);
        apply(m.draw, cx, [src, 0, 0]);
        var img = apply(m.get, cx, [0, 0, w, h]);
        perturb(apply(n.data, img, []), w);
        apply(m.put, cx, [img, 0, 0]);
        return s;
      } catch (e) {
        return null;
      }
    }
    method(HC.prototype, 'toDataURL', function (t, self, a) {
      var s = on('canvas') ? copy(self, false) : null;
      return s ? apply(n.url, s, a) : apply(t, self, a);
    });
    method(HC.prototype, 'toBlob', function (t, self, a) {
      var s = on('canvas') && typeof a[0] === 'function' ? copy(self, false) : null;
      return s ? apply(n.blob, s, a) : apply(t, self, a);
    });
    if (o) {
      method(OC.prototype, 'convertToBlob', function (t, self, a) {
        var s = on('canvas') ? copy(self, true) : null;
        return s ? apply(o.blob, s, a) : apply(t, self, a);
      });
    }
    var read = function (t, self, a) {
      var img = apply(t, self, a);
      if (on('canvas')) {
        try { perturb(apply(n.data, img, []), apply(n.iw, img, [])); } catch (e) {}
      }
      return img;
    };
    method(C2.prototype, 'getImageData', read);
    if (O2) method(O2.prototype, 'getImageData', read);
  }

  var CAPS = {
    0x0d33: 4096, 0x851c: 4096, 0x84e8: 4096, 0x0d3a: [4096, 4096], 0x8869: 16, 0x8dfb: 256, 0x8dfd: 224, 0x8dfc: 15,
    0x8872: 16, 0x8b4c: 16, 0x8b4d: 32, 0x846e: [1, 1], 0x846d: [1, 1024], 0x8073: 2048, 0x88ff: 256, 0x8d57: 4,
    0x8824: 4, 0x8cdf: 4, 0x8a2f: 24, 0x8a30: 16384, 0x8b4a: 1024, 0x8b49: 896, 0x8a2b: 12, 0x8a2d: 12, 0x8a2e: 24,
    0x8b4b: 60, 0x9122: 64, 0x9125: 60, 0x8a31: 50176, 0x8a33: 50048, 0x84ff: 16, 0x84fd: 2,
  };
  var RANGES = { 0x846e: 1, 0x846d: 1 };
  var HIDE = {
    webgl_debug_shaders: 1, ext_disjoint_timer_query: 1, ext_disjoint_timer_query_webgl2: 1, webgl_compressed_texture_pvrtc: 1,
    webkit_webgl_compressed_texture_pvrtc: 1, webgl_compressed_texture_s3tc: 1, webkit_webgl_compressed_texture_s3tc: 1,
    webgl_compressed_texture_s3tc_srgb: 1, ext_texture_compression_bptc: 1, ext_texture_compression_rgtc: 1, webgl_compressed_texture_atc: 1,
    webkit_webgl_compressed_texture_atc: 1,
  };
  var PRECISION = { 0x8df0: [15, 15, 10], 0x8df1: [15, 15, 10], 0x8df2: [127, 127, 23], 0x8df3: [15, 14, 0], 0x8df4: [15, 14, 0], 0x8df5: [31, 30, 0] };

  function clampCap(r, cap, range) {
    if (typeof r === 'number') return Math.min(r, cap);
    if (!r || typeof r.length !== 'number' || r.length !== 2) return r;
    var C = r.constructor;
    if (range) return new C([Math.max(r[0], cap[0]), Math.min(r[1], cap[1])]);
    return new C([Math.min(r[0], cap[0]), Math.min(r[1], cap[1])]);
  }

  function webgl(win) {
    [win.WebGLRenderingContext, win.WebGL2RenderingContext].forEach(function (G) {
      if (!G) return;
      var P = G.prototype;
      method(P, 'getParameter', function (t, self, a) {
        var r = apply(t, self, a);
        var p = a[0];
        if ((p === 0x9245 || p === 0x9246) && typeof r === 'string' && on('webgl')) return p === 0x9245 ? 'WebKit' : 'WebKit WebGL';
        if (strict('webgl') && CAPS[p] !== undefined && r != null) return clampCap(r, CAPS[p], RANGES[p]);
        return r;
      });
      method(P, 'getSupportedExtensions', function (t, self, a) {
        var r = apply(t, self, a);
        if (!r || !strict('webgl')) return r;
        var out = r.filter(function (x) { return !HIDE[String(x).toLowerCase()]; });
        out.sort();
        return out;
      });
      method(P, 'getExtension', function (t, self, a) {
        if (strict('webgl') && HIDE[String(a[0]).toLowerCase()]) return null;
        return apply(t, self, a);
      });
      method(P, 'getShaderPrecisionFormat', function (t, self, a) {
        var r = apply(t, self, a);
        var v = PRECISION[a[1]];
        if (r && v && strict('webgl')) {
          var SP = win.WebGLShaderPrecisionFormat && win.WebGLShaderPrecisionFormat.prototype;
          var g = nativeGet(SP, 'precision');
          if (g && apply(g, r, []) === 0) return r;
          defineProperty(r, 'rangeMin', { value: v[0], configurable: true });
          defineProperty(r, 'rangeMax', { value: v[1], configurable: true });
          defineProperty(r, 'precision', { value: v[2], configurable: true });
        }
        return r;
      });
      method(P, 'readPixels', function (t, self, a) {
        var r = apply(t, self, a);
        var px = a[6];
        if (on('webgl') && a[4] === 0x1908 && a[5] === 0x1401 && px && apply(isView, ArrayBuffer, [px]) && px.BYTES_PER_ELEMENT === 1 && a[2] * a[3] >= 64) {
          try {
            var off = a[7] | 0;
            var len = a[2] * a[3] * 4;
            if (off + len <= apply(taLength, px, [])) perturb(apply(taSub, px, [off, off + len]), a[2]);
          } catch (e) {}
        }
        return r;
      });
    });
  }

  function audio(win) {
    var AB = win.AudioBuffer;
    var OAC = win.OfflineAudioContext;
    if (!AB) return;
    var nChannel = AB.prototype.getChannelData;
    var nChannels = nativeGet(AB.prototype, 'numberOfChannels');
    var nThen = win.Promise.prototype.then;
    function farble(buf) {
      if (apply(setHas, farbled, [buf])) return;
      apply(setAdd, farbled, [buf]);
      var count = apply(nChannels, buf, []);
      var st = strict('audio');
      for (var c = 0; c < count; c++) {
        var d = apply(nChannel, buf, [c]);
        var k = seed(digest(d));
        if (!k) continue;
        var f = 0.999 + k[0] / 4294967296 / 1000;
        var rnd = sfc(k[1], k[2], k[3], k[4]);
        var len = apply(taLength, d, []);
        for (var i = 0; i < len; i++) d[i] = st ? d[i] * f + (rnd() - 0.5) * 2e-7 : d[i] * f;
      }
    }
    function marked(t, self, a) {
      if (on('audio') && apply(setHas, offline, [self])) farble(self);
      return apply(t, self, a);
    }
    method(AB.prototype, 'getChannelData', marked);
    method(AB.prototype, 'copyFromChannel', marked);
    if (OAC) {
      method(OAC.prototype, 'startRendering', function (t, self, a) {
        var p = apply(t, self, a);
        try { apply(nThen, p, [function (b) { if (b) apply(setAdd, offline, [b]); }, function () {}]); } catch (e) {}
        return p;
      });
      var CE = win.OfflineAudioCompletionEvent;
      if (CE) getter(CE.prototype, 'renderedBuffer', function (b) { if (b) apply(setAdd, offline, [b]); return b; });
    }
    var AN = win.AnalyserNode;
    if (AN) {
      var scale = function (t, self, a) {
        var r = apply(t, self, a);
        var d = a[0];
        if (on('audio') && d && typeof d.length === 'number') for (var i = 0; i < d.length; i++) d[i] = d[i] * AF;
        return r;
      };
      ['getFloatFrequencyData', 'getByteFrequencyData', 'getFloatTimeDomainData', 'getByteTimeDomainData'].forEach(function (k) { method(AN.prototype, k, scale); });
    }
    var AC = win.AudioContext;
    if (AC) {
      var round = function (v) { return strict('audio') && typeof v === 'number' ? Math.round(v * 100) / 100 : v; };
      getter(AC.prototype, 'baseLatency', round);
      getter(AC.prototype, 'outputLatency', round);
    }
  }

  function device(win) {
    var N = win.Navigator && win.Navigator.prototype;
    var nThen = win.Promise.prototype.then;
    getter(N, 'hardwareConcurrency', function (v) {
      if (!on('hardware') || typeof v !== 'number' || v < 4) return v;
      var max = strict('hardware') ? 8 : v;
      return 4 + floor(R[0] * (max + 1 - 4));
    });
    getter(N, 'deviceMemory', function (v) {
      if (!on('hardware') || typeof v !== 'number') return v;
      if (strict('hardware')) return R[1] < 0.5 ? 4 : 8;
      var all = [2, 4, 8, 16, 32];
      var top = all.indexOf(v);
      if (top < 0) top = all.length - 1;
      if (top <= 1) return 4;
      return all[1 + floor(R[1] * top)];
    });
    getter(N, 'maxTouchPoints', function (v) { return strict('hardware') && v > 0 ? 5 : v; });
    var langs = null;
    getter(N, 'languages', function (v) {
      if (!on('language') || !v || v.length < 2) return v;
      if (!langs || langs[0] !== v[0]) langs = win.Object.freeze(win.Array.of(v[0]));
      return langs;
    });
    try {
      var mem = win.performance && win.performance.memory;
      if (mem) getter(getProto(mem), 'jsHeapSizeLimit', function (v) { return strict('hardware') && typeof v === 'number' ? 2172649472 : v; });
    } catch (e) {}
    var SS = win.SpeechSynthesis;
    if (SS) {
      method(SS.prototype, 'getVoices', function (t, self, a) {
        var r = apply(t, self, a);
        return strict('voices') ? new win.Array() : r;
      });
    }
    var MD = win.MediaDevices;
    if (MD) {
      method(MD.prototype, 'enumerateDevices', function (t, self, a) {
        var p = apply(t, self, a);
        if (!on('devices')) return p;
        return apply(nThen, p, [function (list) {
          if (!list || list.length < 3) return list;
          var out = list.slice();
          var rnd = sfc(floor(R[6] * 4294967296), 0x9e3779b9, out.length, 0x85ebca6b);
          for (var i = out.length - 1; i > 1; i--) {
            var j = 1 + floor(rnd() * i);
            var x = out[i]; out[i] = out[j]; out[j] = x;
          }
          return out;
        }]);
      });
    }
    var BM = win.BatteryManager;
    if (BM) {
      getter(BM.prototype, 'charging', function (v) { return on('battery') ? true : v; });
      getter(BM.prototype, 'chargingTime', function (v) { return on('battery') ? 0 : v; });
      getter(BM.prototype, 'dischargingTime', function (v) { return on('battery') ? Infinity : v; });
      getter(BM.prototype, 'level', function (v) { return on('battery') ? 1 : v; });
    }
    var NI = win.NetworkInformation;
    if (NI) {
      getter(NI.prototype, 'effectiveType', function (v) { return strict('network') ? '4g' : v; });
      getter(NI.prototype, 'rtt', function (v) { return strict('network') ? 50 : v; });
      getter(NI.prototype, 'downlink', function (v) { return strict('network') ? 10 : v; });
    }
    var SM = win.StorageManager;
    if (SM) {
      method(SM.prototype, 'estimate', function (t, self, a) {
        var p = apply(t, self, a);
        if (!strict('storage')) return p;
        return apply(nThen, p, [function (e) {
          if (e && typeof e.quota === 'number' && e.quota > 1) e.quota = Math.pow(2, floor(Math.log2(e.quota)));
          return e;
        }]);
      });
    }
    var UA = win.NavigatorUAData;
    if (UA) {
      method(UA.prototype, 'getHighEntropyValues', function (t, self, a) {
        var p = apply(t, self, a);
        if (!strict('uadata')) return p;
        return apply(nThen, p, [function (e) {
          if (e && typeof e.model === 'string') e.model = '';
          return e;
        }]);
      });
    }
    var GI = win.GPUAdapterInfo;
    if (GI) {
      ['vendor', 'architecture', 'device', 'description'].forEach(function (k) {
        getter(GI.prototype, k, function (v) { return on('gpu') ? '' : v; });
      });
    }
  }

  function screens(win) {
    if (!SW || !SH) return;
    var S = win.Screen && win.Screen.prototype;
    var SO = win.ScreenOrientation && win.ScreenOrientation.prototype;
    var orient = nativeGet(SO, 'type');
    var nOrientation = nativeGet(S, 'orientation');
    function dims() {
      var land = false;
      try { land = /landscape/.test(apply(orient, apply(nOrientation, win.screen, []), [])); } catch (e) {}
      var lo = Math.min(SW, SH);
      var hi = Math.max(SW, SH);
      return land ? [hi, lo] : [lo, hi];
    }
    getter(S, 'width', function (v) { return on('screen') ? dims()[0] : v; });
    getter(S, 'height', function (v) { return on('screen') ? dims()[1] : v; });
    getter(S, 'availWidth', function (v) { return on('screen') ? dims()[0] : v; });
    getter(S, 'availHeight', function (v) { return on('screen') ? dims()[1] : v; });
    getter(S, 'availLeft', function (v) { return on('screen') ? 0 : v; });
    getter(S, 'availTop', function (v) { return on('screen') ? 0 : v; });
    getter(S, 'colorDepth', function (v) { return on('screen') ? 24 : v; });
    getter(S, 'pixelDepth', function (v) { return on('screen') ? 24 : v; });
    getter(win, 'outerWidth', function (v) { return on('screen') ? dims()[0] : v; });
    getter(win, 'outerHeight', function (v) { return on('screen') ? dims()[1] : v; });
  }

  function rects(win) {
    var DR = win.DOMRect && win.DOMRect.prototype;
    var RO = win.DOMRectReadOnly && win.DOMRectReadOnly.prototype;
    var acc = ['x', 'y', 'width', 'height'].map(function (k) { return { get: nativeGet(RO, k), set: getDesc(DR, k).set }; });
    var listLength = nativeGet(win.DOMRectList && win.DOMRectList.prototype, 'length');
    var F = [FX, FY, FX, FY];
    function scale(r) {
      if (!r) return;
      for (var i = 0; i < 4; i++) apply(acc[i].set, r, [apply(acc[i].get, r, []) * F[i]]);
    }
    [win.Element, win.Range].forEach(function (C) {
      if (!C) return;
      method(C.prototype, 'getBoundingClientRect', function (t, self, a) {
        var r = apply(t, self, a);
        if (strict('rects')) scale(r);
        return r;
      });
      method(C.prototype, 'getClientRects', function (t, self, a) {
        var l = apply(t, self, a);
        if (strict('rects') && l) for (var i = 0, n = apply(listLength, l, []); i < n; i++) scale(l[i]);
        return l;
      });
    });
  }

  function frames(win) {
    var IF = win.HTMLIFrameElement && win.HTMLIFrameElement.prototype;
    var FR = win.HTMLFrameElement && win.HTMLFrameElement.prototype;
    var cwIF = nativeGet(IF, 'contentWindow');
    var cwFR = nativeGet(FR, 'contentWindow');
    var TAG = /^i?frame$/i;
    var HTML = /<\s*i?frame/i;
    var NodeP = win.Node.prototype;
    var nodeType = nativeGet(NodeP, 'nodeType');
    var parentNode = nativeGet(NodeP, 'parentNode');
    var localName = nativeGet(win.Element.prototype, 'localName');
    var firstEl = nativeGet(win.Element.prototype, 'firstElementChild');
    var firstFragEl = nativeGet(win.DocumentFragment.prototype, 'firstElementChild');
    var qsaEl = win.Element.prototype.querySelectorAll;
    var qsaFrag = win.DocumentFragment.prototype.querySelectorAll;
    var qsaDoc = win.Document.prototype.querySelectorAll;
    var docEl = nativeGet(win.Document.prototype, 'documentElement');
    var hasHtml = function (v) { return typeof v === 'string' && apply(strTest, HTML, [v]); };
    function winOf(el) {
      try { return apply(cwIF, el, []); } catch (e) {}
      try { return apply(cwFR, el, []); } catch (e) {}
      return null;
    }
    var nlLength = nativeGet(win.NodeList && win.NodeList.prototype, 'length');
    function add(out, list) { for (var j = 0, n = apply(nlLength, list, []); j < n; j++) out[out.n++] = list[j]; }
    function collect(nodes) {
      var out = create(null);
      out.n = 0;
      for (var i = 0; i < nodes.length; i++) {
        var nd = nodes[i];
        if (!nd || typeof nd !== 'object') continue;
        try {
          var type = apply(nodeType, nd, []);
          if (type === 1) {
            if (apply(strTest, TAG, [apply(localName, nd, [])])) out[out.n++] = nd;
            if (apply(firstEl, nd, [])) add(out, apply(qsaEl, nd, ['iframe,frame']));
          } else if (type === 11) {
            if (apply(firstFragEl, nd, [])) add(out, apply(qsaFrag, nd, ['iframe,frame']));
          } else if (type === 9) {
            add(out, apply(qsaDoc, nd, ['iframe,frame']));
          }
        } catch (e) {}
      }
      return out;
    }
    function protect(list) { for (var i = 0; i < list.n; i++) child(winOf(list[i])); }
    function scan(root) { if (root) protect(collect([root])); }
    [IF, FR].forEach(function (P) {
      if (!P) return;
      getter(P, 'contentWindow', function (w) { child(w); return w; });
      getter(P, 'contentDocument', function (d) { if (d) child(d.defaultView); return d; });
    });
    function ins(P, k, idx) {
      method(P, k, function (t, self, a) {
        var pre = collect(idx < 0 ? a : [a[idx]]);
        var r = apply(t, self, a);
        if (pre.n) protect(pre);
        return r;
      });
    }
    var NP = win.Node && win.Node.prototype;
    ins(NP, 'appendChild', 0);
    ins(NP, 'insertBefore', 0);
    ins(NP, 'replaceChild', 0);
    [win.Element, win.Document, win.DocumentFragment, win.CharacterData, win.DocumentType].forEach(function (C) {
      if (!C) return;
      ['append', 'prepend', 'after', 'before', 'replaceWith', 'replaceChildren'].forEach(function (k) { ins(C.prototype, k, -1); });
    });
    ins(win.Element && win.Element.prototype, 'insertAdjacentElement', 1);
    ins(win.Range && win.Range.prototype, 'insertNode', 0);
    function html(P, k, parent) {
      var d = P && getDesc(P, k);
      if (!d || typeof d.set !== 'function') return;
      d.set = proxy(d.set, function (t, self, a) {
        var root = self;
        if (parent) { try { root = apply(parentNode, self, []); } catch (e) { root = null; } }
        var r = apply(t, self, a);
        if (hasHtml(a[0])) scan(root);
        return r;
      });
      defineProperty(P, k, d);
    }
    var EP = win.Element && win.Element.prototype;
    var SR = win.ShadowRoot && win.ShadowRoot.prototype;
    html(EP, 'innerHTML', false);
    html(EP, 'outerHTML', true);
    html(SR, 'innerHTML', false);
    [EP, SR].forEach(function (P) {
      method(P, 'setHTMLUnsafe', function (t, self, a) {
        var r = apply(t, self, a);
        if (hasHtml(a[0])) scan(self);
        return r;
      });
    });
    method(EP, 'insertAdjacentHTML', function (t, self, a) {
      var root = null;
      try { root = apply(parentNode, self, []); } catch (e) {}
      var r = apply(t, self, a);
      if (hasHtml(a[1])) { scan(self); scan(root); }
      return r;
    });
    var DP = win.Document && win.Document.prototype;
    ['write', 'writeln'].forEach(function (k) {
      method(DP, k, function (t, self, a) {
        var r = apply(t, self, a);
        for (var i = 0; i < a.length; i++) if (hasHtml(a[i])) { try { scan(apply(docEl, self, [])); } catch (e) {} break; }
        return r;
      });
    });
  }

  function child(w) {
    if (!w || typeof w !== 'object') return;
    try {
      if (apply(setHas, installed, [w])) return;
      if (!/^https?:$/.test(w.location.protocol)) delete w[NAME];
    } catch (e) {
      return;
    }
    install(w);
  }

  function maskToString(win) {
    var fp = win.Function.prototype;
    var d = getDesc(fp, 'toString');
    if (!d || typeof d.value !== 'function') return;
    var orig = d.value;
    d.value = new Proxy(orig, {
      apply: function (t, self, a) {
        if (a.length && a[0] === MARK) {
          if (a[1] === 'adopt') child(a[2]);
          return REPLY;
        }
        var real = (typeof self === 'function' || (typeof self === 'object' && self !== null)) ? apply(mapGet, masked, [self]) : undefined;
        return apply(t, real || self, a);
      },
    });
    apply(mapSet, masked, [d.value, orig]);
    defineProperty(fp, 'toString', d);
  }

  function install(win) {
    try {
      if (apply(setHas, installed, [win])) return;
      apply(setAdd, installed, [win]);
      var ts = win.Function.prototype.toString;
      if (apply(ts, ts, [MARK]) === REPLY) return;
    } catch (e) {
      return;
    }
    [maskToString, canvas, fonts, webgl, audio, device, screens, rects, frames].forEach(function (part) {
      try { part(win); } catch (e) {}
    });
  }

  function adoptedByParent() {
    try {
      if (W === W.parent) return false;
      var ts = W.parent.Function.prototype.toString;
      return apply(ts, ts, [MARK, 'adopt', W]) === REPLY;
    } catch (e) {
      return false;
    }
  }

  if (!adoptedByParent()) install(W);
})();
