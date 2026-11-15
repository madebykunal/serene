(function () {
  'use strict';
  var NAME = '__BRIDGE__';
  var W = window;
  var D = document;
  var B = W[NAME];
  if (!B || !/^https?:$/.test(location.protocol)) return;
  try { delete W[NAME]; } catch (e) {}
  var href = location.href;
  var rules;
  try { rules = JSON.parse(B.rules(href) || 'null'); } catch (e) { rules = null; }
  if (!rules) return;

  var nativeSetTimeout = W.setTimeout.bind(W);
  var hasOwn = Function.prototype.call.bind(Object.prototype.hasOwnProperty);
  var magic = String.fromCharCode(Date.now() % 26 + 97) + Math.floor(Math.random() * 982451653 + 982451653).toString(36);
  var noop = function () {};

  W.addEventListener('error', function (e) {
    if (typeof e.message === 'string' && e.message.indexOf(magic) !== -1) e.preventDefault();
  }, true);

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function pattern(raw, opts) {
    var s = raw == null ? '' : String(raw);
    var not = false;
    if (opts !== false && s.charAt(0) === '!') { not = true; s = s.slice(1); }
    var re = null;
    if (s !== '') {
      var m = /^\/(.+)\/([dgimsuy]*)$/.exec(s);
      try { re = m ? new RegExp(m[1], m[2].replace('g', '')) : new RegExp(escapeRe(s)); } catch (e) { re = /(?!)/; }
    }
    return {
      empty: re === null,
      test: function (t) { var r = re === null ? true : re.test(String(t)); return not ? !r : r; }
    };
  }

  function whenReady(fn) {
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function observe(fn, opts) {
    var pending = false;
    var run = function () { pending = false; try { fn(); } catch (e) {} };
    var schedule = function () { if (!pending) { pending = true; nativeSetTimeout(run, 50); } };
    whenReady(function () {
      run();
      new MutationObserver(schedule).observe(D.documentElement || D, opts || { childList: true, subtree: true });
    });
  }

  function constValue(raw) {
    var v = raw == null ? 'undefined' : String(raw);
    if (v.indexOf('json:') === 0) { try { return { v: JSON.parse(v.slice(5)) }; } catch (e) { return null; } }
    switch (v) {
      case 'undefined': return { v: undefined };
      case 'null': return { v: null };
      case 'false': return { v: false };
      case 'true': return { v: true };
      case "''": case '': case 'emptyStr': return { v: '' };
      case 'noopFunc': return { v: function () {} };
      case 'trueFunc': return { v: function () { return true; } };
      case 'falseFunc': return { v: function () { return false; } };
      case 'throwFunc': return { v: function () { throw new Error(magic); } };
      case 'emptyObj': case '{}': return { v: {} };
      case 'emptyArr': case '[]': return { v: [] };
      case 'noopCallbackFunc': return { v: function () { return function () {}; } };
      case 'noopPromiseResolve': return { v: function () { return Promise.resolve(); } };
      case 'noopPromiseReject': return { v: function () { return Promise.reject(); } };
      case 'NaN': return { v: NaN };
      case 'Infinity': return { v: Infinity };
      case '-Infinity': return { v: -Infinity };
    }
    if (/^-?\d+(\.\d+)?$/.test(v)) return { v: Number(v) };
    if (/^['"].*['"]$/.test(v)) return { v: v.slice(1, -1) };
    return { v: v };
  }

  function chainTrap(owner, chain, leaf) {
    var pos = chain.indexOf('.');
    if (pos === -1) { leaf(owner, chain); return; }
    var prop = chain.slice(0, pos);
    var rest = chain.slice(pos + 1);
    var v;
    try { v = owner[prop]; } catch (e) { return; }
    if (v !== null && (typeof v === 'object' || typeof v === 'function')) { chainTrap(v, rest, leaf); return; }
    var desc = Object.getOwnPropertyDescriptor(owner, prop);
    if (desc && desc.configurable === false) return;
    try {
      Object.defineProperty(owner, prop, {
        configurable: true,
        get: function () { return v; },
        set: function (a) {
          v = a;
          if (a !== null && (typeof a === 'object' || typeof a === 'function')) chainTrap(a, rest, leaf);
        }
      });
    } catch (e) {}
  }

  var S = {};

  S.set_constant = function (chain, raw, as, kind) {
    if (!chain) return;
    var c = constValue(raw);
    if (!c) return;
    var cValue = c.v;
    if (as === 'as') {
      if (kind === 'function') { var fv = cValue; cValue = function () { return fv; }; }
      else if (kind === 'callback') { var cv = cValue; cValue = function () { return function () { return cv; }; }; }
      else if (kind === 'resolved') cValue = Promise.resolve(cValue);
      else if (kind === 'rejected') cValue = Promise.reject(cValue);
    }
    var incompatible = function (v) {
      if (v === undefined || v === null || cValue === undefined || cValue === null) return false;
      return typeof v !== typeof cValue;
    };
    chainTrap(W, chain, function (owner, prop) {
      var desc = Object.getOwnPropertyDescriptor(owner, prop);
      if (desc && desc.configurable === false) return;
      var prev = desc && hasOwn(desc, 'value') ? desc.value : undefined;
      if (incompatible(prev)) return;
      var getter = desc && desc.get;
      var setter = desc && desc.set;
      try {
        Object.defineProperty(owner, prop, {
          configurable: false,
          get: function () { if (getter) { try { getter.call(owner); } catch (e) {} } return cValue; },
          set: function (a) { if (setter) { try { setter.call(owner, a); } catch (e) {} } if (incompatible(a)) cValue = a; }
        });
      } catch (e) {}
    });
  };

  function abortGetter(chain, test) {
    chainTrap(W, chain, function (owner, prop) {
      var desc = Object.getOwnPropertyDescriptor(owner, prop);
      if (desc && desc.configurable === false) return;
      var value = desc && hasOwn(desc, 'value') ? desc.value : undefined;
      var getter = desc && desc.get;
      var setter = desc && desc.set;
      try {
        Object.defineProperty(owner, prop, {
          configurable: true,
          get: function () {
            if (test('get')) throw new ReferenceError(magic);
            return getter ? getter.call(owner) : value;
          },
          set: function (a) {
            if (test('set')) throw new ReferenceError(magic);
            if (setter) setter.call(owner, a); else value = a;
          }
        });
      } catch (e) {}
    });
  }

  S.abort_on_property_read = function (chain) {
    if (chain) abortGetter(chain, function (op) { return op === 'get'; });
  };

  S.abort_on_property_write = function (chain) {
    if (chain) abortGetter(chain, function (op) { return op === 'set'; });
  };

  function scriptText(el) {
    var text = el.textContent;
    if (text && text.trim() !== '') return text;
    var m = /^data:[^,]*,(.+)$/.exec((el.src || '').trim());
    if (!m) return '';
    try { return /;base64/.test(el.src.slice(0, el.src.indexOf(','))) ? atob(m[1]) : decodeURIComponent(m[1]); } catch (e) { return ''; }
  }

  S.abort_current_script = function (target, needle, context) {
    if (!target) return;
    var re = pattern(needle);
    var ctx = pattern(context);
    var self = D.currentScript;
    abortGetter(target, function () {
      var el = D.currentScript;
      if (!(el instanceof HTMLScriptElement) || el === self) return false;
      if (context && !ctx.test(el.src)) return false;
      if (re.empty) return true;
      return re.test(scriptText(el)) || (!!el.src && re.test(el.src));
    });
  };

  S.abort_on_stack_trace = function (chain, needle) {
    if (!chain) return;
    var re = pattern(needle);
    abortGetter(chain, function () {
      var stack = '';
      try { stack = new Error().stack || ''; } catch (e) {}
      return re.test(stack.split('\n').slice(2).join('\n'));
    });
  };

  function wrapMethod(owner, name, wrapper) {
    var orig = owner && owner[name];
    if (typeof orig !== 'function') return;
    var proxied = new Proxy(orig, { apply: function (target, thisArg, args) { return wrapper(target, thisArg, args); } });
    try { owner[name] = proxied; } catch (e) {}
  }

  function fnText(f) {
    if (typeof f === 'function') return Function.prototype.toString.call(f);
    if (f && typeof f.handleEvent === 'function') return Function.prototype.toString.call(f.handleEvent);
    return String(f);
  }

  S.addEventListener_defuser = function (type, needle) {
    var t = pattern(type);
    var n = pattern(needle);
    wrapMethod(EventTarget.prototype, 'addEventListener', function (target, thisArg, args) {
      var text = '';
      try { text = fnText(args[1]); } catch (e) {}
      if (t.test(String(args[0])) && n.test(text)) return;
      return Reflect.apply(target, thisArg, args);
    });
  };

  function delayMatch(raw) {
    if (raw === undefined || raw === '' || raw === '*') return function () { return true; };
    var not = String(raw).charAt(0) === '!';
    var n = parseInt(not ? String(raw).slice(1) : raw, 10);
    if (isNaN(n)) return function () { return true; };
    return function (d) { var ok = (d | 0) === n; return not ? !ok : ok; };
  }

  function timerDefuser(name) {
    return function (needle, delay) {
      var re = pattern(needle);
      var dm = delayMatch(delay);
      wrapMethod(W, name, function (target, thisArg, args) {
        var text = typeof args[0] === 'function' ? fnText(args[0]) : String(args[0]);
        if (re.test(text) && dm(args[1])) return Reflect.apply(target, thisArg, [noop, args[1]]);
        return Reflect.apply(target, thisArg, args);
      });
    };
  }
  S.no_setTimeout_if = timerDefuser('setTimeout');
  S.no_setInterval_if = timerDefuser('setInterval');

  function timerBooster(name) {
    return function (needle, delay, boost) {
      var re = pattern(needle);
      var d = delay === undefined || delay === '' ? 1000 : delay === '*' ? '*' : parseInt(delay, 10);
      var b = parseFloat(boost);
      if (isNaN(b) || !isFinite(b)) b = 0.05;
      b = Math.min(Math.max(b, 0.001), 50);
      wrapMethod(W, name, function (target, thisArg, args) {
        var text = typeof args[0] === 'function' ? fnText(args[0]) : String(args[0]);
        if (re.test(text) && (d === '*' || (args[1] | 0) === d)) args[1] = (args[1] | 0) * b;
        return Reflect.apply(target, thisArg, args);
      });
    };
  }
  S.adjust_setTimeout = timerBooster('setTimeout');
  S.adjust_setInterval = timerBooster('setInterval');

  S.no_requestAnimationFrame_if = function (needle) {
    var re = pattern(needle);
    wrapMethod(W, 'requestAnimationFrame', function (target, thisArg, args) {
      if (re.test(fnText(args[0]))) return Reflect.apply(target, thisArg, [noop]);
      return Reflect.apply(target, thisArg, args);
    });
  };

  S.noeval_if = function (needle) {
    var re = pattern(needle);
    wrapMethod(W, 'eval', function (target, thisArg, args) {
      if (re.test(String(args[0]))) return;
      return Reflect.apply(target, thisArg, args);
    });
  };

  function fakeWindow() {
    var fake = { closed: false, opener: W, location: { href: 'about:blank' } };
    ['close', 'focus', 'blur', 'postMessage', 'moveTo', 'resizeTo', 'scrollTo', 'print'].forEach(function (k) {
      fake[k] = function () { if (k === 'close') fake.closed = true; };
    });
    return new Proxy(fake, { get: function (t, p) { return p in t ? t[p] : undefined; }, set: function () { return true; } });
  }

  S.window_open_defuser = function (needle) {
    var allow = needle === '0';
    var re = pattern(needle === '1' || needle === '0' ? '' : needle);
    wrapMethod(W, 'open', function (target, thisArg, args) {
      var hit = re.test(String(args[0] || ''));
      if (allow ? !hit : hit) return fakeWindow();
      return Reflect.apply(target, thisArg, args);
    });
  };

  function selectAll(sel) {
    try { return D.querySelectorAll(sel); } catch (e) { return []; }
  }

  S.remove_attr = function (attrs, selector) {
    if (!attrs) return;
    var list = String(attrs).split(/\s*\|\s*/).filter(Boolean);
    var sel = selector || list.map(function (a) { return '[' + a + ']'; }).join(',');
    observe(function () {
      selectAll(sel).forEach(function (el) { list.forEach(function (a) { el.removeAttribute(a); }); });
    }, { childList: true, subtree: true, attributes: true, attributeFilter: list });
  };

  S.remove_class = function (classes, selector) {
    if (!classes) return;
    var list = String(classes).split(/\s*\|\s*/).filter(Boolean);
    var sel = selector || list.map(function (c) { return '.' + CSS.escape(c); }).join(',');
    observe(function () {
      selectAll(sel).forEach(function (el) { list.forEach(function (c) { el.classList.remove(c); }); });
    }, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  };

  S.set_attr = function (selector, attr, value) {
    if (!selector || !attr) return;
    var v = value === undefined ? '' : String(value);
    observe(function () {
      selectAll(selector).forEach(function (el) {
        var next = /^\[.+\]$/.test(v) ? el.getAttribute(v.slice(1, -1)) : v;
        if (next !== null && el.getAttribute(attr) !== next) el.setAttribute(attr, next);
      });
    }, { childList: true, subtree: true, attributes: true, attributeFilter: [attr] });
  };

  function textNodes(nodeName, needle, edit) {
    var nn = pattern(nodeName, false);
    var re = pattern(needle);
    var handle = function (node) {
      if (!nn.test(node.nodeName.toLowerCase())) return;
      var text = node.nodeType === 3 ? node.nodeValue : node.textContent;
      if (!text || !re.test(text)) return;
      edit(node, text);
    };
    var walk = function (root) {
      var walker = D.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
      var n;
      while ((n = walker.nextNode())) handle(n);
    };
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          handle(added[j]);
          if (added[j].nodeType === 1 && added[j].nodeName !== 'SCRIPT') walk(added[j]);
        }
      }
    }).observe(D, { childList: true, subtree: true });
    whenReady(function () { walk(D.documentElement); });
  }

  S.remove_node_text = function (nodeName, needle) {
    if (!nodeName) return;
    textNodes(nodeName, needle, function (node) {
      if (node.nodeType === 3) node.nodeValue = '';
      else node.textContent = '';
    });
  };

  S.replace_node_text = function (nodeName, needle, replacement) {
    if (!nodeName || !needle) return;
    var m = /^\/(.+)\/([dgimsuy]*)$/.exec(needle);
    var re;
    try { re = m ? new RegExp(m[1], m[2]) : new RegExp(escapeRe(needle), 'g'); } catch (e) { return; }
    var rep = replacement === undefined ? '' : replacement;
    textNodes(nodeName, needle, function (node, text) {
      var next = text.replace(re, rep);
      if (node.nodeType === 3) node.nodeValue = next;
      else node.textContent = next;
    });
  };

  function prune(root, path, act) {
    if (root === null || typeof root !== 'object') return false;
    var pos = path.indexOf('.');
    var head = pos === -1 ? path : path.slice(0, pos);
    var rest = pos === -1 ? '' : path.slice(pos + 1);
    var found = false;
    var k;
    if (head === '[]' || head === '*') {
      for (k in root) {
        if (!hasOwn(root, k)) continue;
        if (rest === '') { if (act) delete root[k]; found = true; }
        else if (prune(root[k], rest, act)) found = true;
      }
      return found;
    }
    if (head === '[-]' || head === '{-}') {
      if (rest === '') return false;
      if (Array.isArray(root)) {
        for (var i = root.length - 1; i >= 0; i--) {
          if (prune(root[i], rest, false)) { if (act) root.splice(i, 1); found = true; }
        }
      } else {
        for (k in root) {
          if (hasOwn(root, k) && prune(root[k], rest, false)) { if (act) delete root[k]; found = true; }
        }
      }
      return found;
    }
    if (!hasOwn(root, head)) return false;
    if (rest === '') { if (act) delete root[head]; return true; }
    return prune(root[head], rest, act);
  }

  function pruner(prunePaths, needlePaths, stackNeedle) {
    var paths = String(prunePaths || '').split(/ +/).filter(Boolean);
    var needles = String(needlePaths || '').split(/ +/).filter(Boolean);
    var stack = stackNeedle ? pattern(stackNeedle) : null;
    return function (obj) {
      if (!paths.length || obj === null || typeof obj !== 'object') return false;
      if (stack) {
        var s = '';
        try { s = new Error().stack || ''; } catch (e) {}
        if (!stack.test(s)) return false;
      }
      for (var i = 0; i < needles.length; i++) if (!prune(obj, needles[i], false)) return false;
      var changed = false;
      for (var j = 0; j < paths.length; j++) if (prune(obj, paths[j], true)) changed = true;
      return changed;
    };
  }

  S.json_prune = function (prunePaths, needlePaths, stackNeedle) {
    var run = pruner(prunePaths, needlePaths, stackNeedle);
    wrapMethod(JSON, 'parse', function (target, thisArg, args) {
      var obj = Reflect.apply(target, thisArg, args);
      try { run(obj); } catch (e) {}
      return obj;
    });
    wrapMethod(Response.prototype, 'json', function (target, thisArg, args) {
      return Reflect.apply(target, thisArg, args).then(function (obj) { try { run(obj); } catch (e) {} return obj; });
    });
  };

  function propsMatcher(raw) {
    var tests = [];
    String(raw || '').split(/\s+/).filter(Boolean).forEach(function (part) {
      var m = /^(\w+):(.*)$/.exec(part);
      tests.push({ key: m ? m[1] : 'url', re: pattern(m ? m[2] : part, false) });
    });
    return function (details) {
      if (!tests.length) return false;
      for (var i = 0; i < tests.length; i++) {
        var v = details[tests[i].key];
        if (v === undefined || !tests[i].re.test(v)) return false;
      }
      return true;
    };
  }

  function extraArg(args, name) {
    for (var i = 0; i < args.length - 1; i++) if (args[i] === name) return args[i + 1];
    return undefined;
  }

  function fetchDetails(args) {
    var input = args[0];
    var init = args[1] || {};
    var details = { url: '', method: 'GET' };
    try {
      if (input instanceof Request) { details.url = input.url; details.method = input.method; }
      else details.url = String(input);
      if (init.method) details.method = String(init.method).toUpperCase();
      if (typeof init.body === 'string') details.body = init.body;
      details.url = new URL(details.url, location.href).href;
    } catch (e) {}
    return details;
  }

  function rebuild(response, text) {
    var out = new Response(text, { status: response.status, statusText: response.statusText, headers: response.headers });
    try {
      Object.defineProperties(out, {
        url: { value: response.url },
        type: { value: response.type },
        redirected: { value: response.redirected }
      });
    } catch (e) {}
    return out;
  }

  function wrapFetch(match, transform) {
    wrapMethod(W, 'fetch', function (target, thisArg, args) {
      var p = Reflect.apply(target, thisArg, args);
      if (!match(fetchDetails(args))) return p;
      return p.then(function (response) {
        return response.clone().text().then(function (text) {
          var next = transform(text);
          return next === null ? response : rebuild(response, next);
        }).catch(function () { return response; });
      });
    });
  }

  function wrapXhr(onOpen, transform, fake) {
    var X = W.XMLHttpRequest;
    if (typeof X !== 'function') return;
    var state = new WeakMap();
    var proto = X.prototype;
    var open = proto.open;
    var send = proto.send;
    proto.open = function (method, url) {
      var details = { method: String(method || 'GET').toUpperCase(), url: '' };
      try { details.url = new URL(String(url), location.href).href; } catch (e) { details.url = String(url); }
      state.set(this, onOpen(details) ? { on: true } : null);
      return open.apply(this, arguments);
    };
    if (fake) {
      proto.send = function () {
        var s = state.get(this);
        if (!s || !s.on) return send.apply(this, arguments);
        var xhr = this;
        s.fake = fake;
        nativeSetTimeout(function () {
          ['readystatechange', 'load', 'loadend'].forEach(function (t) {
            try { xhr.dispatchEvent(new Event(t)); } catch (e) {}
          });
        }, 1);
      };
    }
    var get = function (name, compute) {
      var desc = Object.getOwnPropertyDescriptor(proto, name);
      if (!desc || !desc.get) return;
      Object.defineProperty(proto, name, {
        configurable: true,
        enumerable: desc.enumerable,
        get: function () {
          var s = state.get(this);
          if (!s || !s.on) return desc.get.call(this);
          return compute.call(this, s, desc.get);
        }
      });
    };
    if (fake) {
      get('readyState', function (s, g) { return s.fake ? 4 : g.call(this); });
      get('status', function (s, g) { return s.fake ? 200 : g.call(this); });
      get('statusText', function (s, g) { return s.fake ? 'OK' : g.call(this); });
    }
    var body = function (s, g) {
      if (this.readyState !== 4) return g.call(this);
      if (s.done === undefined) {
        var raw = g.call(this);
        if (typeof raw !== 'string') { s.done = raw; return raw; }
        var next = transform(raw);
        s.done = next === null ? raw : next;
      }
      return s.done;
    };
    get('responseText', function (s, g) {
      if (s.fake) return s.fake.text;
      var type = this.responseType;
      if (type !== '' && type !== 'text') return g.call(this);
      return body.call(this, s, g);
    });
    get('response', function (s, g) {
      var type = this.responseType;
      if (s.fake) {
        if (type !== 'json') return s.fake.text;
        try { return s.fake.text ? JSON.parse(s.fake.text) : null; } catch (e) { return null; }
      }
      if (type === 'json') {
        if (this.readyState !== 4) return g.call(this);
        if (s.json === undefined) {
          var obj = g.call(this);
          try { var t = transform(JSON.stringify(obj)); s.json = t === null ? obj : JSON.parse(t); } catch (e) { s.json = obj; }
        }
        return s.json;
      }
      if (type !== '' && type !== 'text') return g.call(this);
      return body.call(this, s, g);
    });
  }

  function jsonTransform(run) {
    return function (text) {
      var obj;
      try { obj = JSON.parse(text); } catch (e) { return null; }
      return run(obj) ? JSON.stringify(obj) : null;
    };
  }

  S.json_prune_fetch_response = function (prunePaths, needlePaths) {
    var props = extraArg(Array.prototype.slice.call(arguments, 2), 'propsToMatch');
    wrapFetch(props ? propsMatcher(props) : function () { return true; }, jsonTransform(pruner(prunePaths, needlePaths)));
  };

  S.json_prune_xhr_response = function (prunePaths, needlePaths) {
    var props = extraArg(Array.prototype.slice.call(arguments, 2), 'propsToMatch');
    wrapXhr(props ? propsMatcher(props) : function () { return true; }, jsonTransform(pruner(prunePaths, needlePaths)));
  };

  function replacer(needle, replacement) {
    if (!needle) return null;
    var m = /^\/(.+)\/([dgimsuy]*)$/.exec(needle);
    var re;
    try { re = m ? new RegExp(m[1], m[2]) : new RegExp(escapeRe(needle), 'g'); } catch (e) { return null; }
    var rep = replacement === undefined ? '' : replacement;
    return function (text) {
      var next = text.replace(re, rep);
      return next === text ? null : next;
    };
  }

  S.trusted_replace_fetch_response = function (needle, replacement, props) {
    var t = replacer(needle, replacement);
    if (t) wrapFetch(props ? propsMatcher(props) : function () { return true; }, t);
  };

  S.trusted_replace_xhr_response = function (needle, replacement, props) {
    var t = replacer(needle, replacement);
    if (t) wrapXhr(props ? propsMatcher(props) : function () { return true; }, t);
  };

  function fakeBody(raw) {
    switch (raw) {
      case 'emptyObj': return '{}';
      case 'emptyArr': return '[]';
      case undefined: case '': case 'emptyStr': return '';
      case 'true': return 'true';
      default: return /^\{.*\}$|^\[.*\]$/.test(raw) ? raw : '';
    }
  }

  S.no_fetch_if = function (props, body) {
    if (!props) return;
    var match = propsMatcher(props);
    var text = fakeBody(body);
    wrapMethod(W, 'fetch', function (target, thisArg, args) {
      var details = fetchDetails(args);
      if (!match(details)) return Reflect.apply(target, thisArg, args);
      var res = new Response(text, { status: 200, statusText: 'OK', headers: { 'Content-Type': 'text/plain' } });
      try { Object.defineProperty(res, 'url', { value: details.url }); } catch (e) {}
      return Promise.resolve(res);
    });
  };

  S.no_xhr_if = function (props, directive) {
    if (!props) return;
    wrapXhr(propsMatcher(props), function () { return null; }, { text: fakeBody(directive) });
  };

  function getCookie(name) {
    var parts = D.cookie.split(/\s*;\s*/);
    for (var i = 0; i < parts.length; i++) {
      var eq = parts[i].indexOf('=');
      var k = eq === -1 ? parts[i] : parts[i].slice(0, eq);
      if (k === name) return eq === -1 ? '' : parts[i].slice(eq + 1);
    }
    return undefined;
  }

  function writeCookie(name, value, opts) {
    var s = name + '=' + value + '; path=' + (opts.path && opts.path !== 'none' ? opts.path : '/');
    if (opts.expires) s += '; expires=' + opts.expires;
    if (opts.domain) s += '; domain=' + opts.domain;
    if (location.protocol === 'https:') s += '; SameSite=Lax';
    D.cookie = s;
  }

  S.set_cookie = function (name, value, path) {
    if (!name || getCookie(name) !== undefined) return;
    writeCookie(name, encodeURIComponent(value === undefined ? '' : String(value)), { path: path });
  };

  function trustedValue(raw) {
    var now = Date.now();
    return String(raw === undefined ? '' : raw)
      .replace('$now$', String(now))
      .replace('$currentDate$', new Date(now).toUTCString())
      .replace('$currentISODate$', new Date(now).toISOString());
  }

  function offsetExpiry(raw) {
    if (!raw) return '';
    var units = { '1day': 86400, '1year': 31536000 };
    var secs = units[raw] !== undefined ? units[raw] : parseInt(raw, 10);
    if (isNaN(secs)) return '';
    return new Date(Date.now() + secs * 1000).toUTCString();
  }

  function trustedCookie(name, value, offset, path, domain) {
    if (!name) return false;
    var v = trustedValue(value);
    if (getCookie(name) === v) return false;
    writeCookie(name, v, { expires: offsetExpiry(offset), path: path, domain: domain && domain !== 'none' ? domain : '' });
    return getCookie(name) === v;
  }

  S.trusted_set_cookie = function (name, value, offset, path, domain) { trustedCookie(name, value, offset, path, domain); };

  S.trusted_set_cookie_reload = function (name, value, offset, path, domain) {
    if (trustedCookie(name, value, offset, path, domain)) location.reload();
  };

  S.remove_cookie = function (needle) {
    var re = pattern(needle);
    var run = function () {
      D.cookie.split(/\s*;\s*/).forEach(function (part) {
        var name = part.split('=')[0];
        if (!name || !re.test(name)) return;
        var host = location.hostname;
        var expires = '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        [host, '.' + host, '.' + host.split('.').slice(-2).join('.'), ''].forEach(function (domain) {
          ['/', location.pathname].forEach(function (path) {
            D.cookie = name + '=; path=' + path + expires + (domain ? '; domain=' + domain : '');
          });
        });
      });
    };
    run();
    W.addEventListener('DOMContentLoaded', run);
    W.addEventListener('beforeunload', run);
  };

  function storageValue(raw) {
    var v = raw === undefined ? '' : String(raw);
    switch (v) {
      case 'emptyObj': return '{}';
      case 'emptyArr': return '[]';
      case "''": case 'emptyStr': return '';
    }
    return trustedValue(v);
  }

  function storageItem(kind) {
    return function (key, value) {
      if (!key) return;
      try {
        var store = W[kind];
        if (value === '$remove$') {
          if (!/^\/.+\/[a-z]*$/.test(key)) { store.removeItem(key); return; }
          var re = pattern(key, false);
          for (var i = store.length - 1; i >= 0; i--) { var k = store.key(i); if (re.test(k)) store.removeItem(k); }
          return;
        }
        store.setItem(key, storageValue(value));
      } catch (e) {}
    };
  }
  S.set_local_storage_item = storageItem('localStorage');
  S.set_session_storage_item = storageItem('sessionStorage');

  function querySelectorEx(sel) {
    var parts = sel.split(/\s*>>>\s*/);
    var node = D;
    for (var i = 0; i < parts.length; i++) {
      if (i > 0) node = node && node.shadowRoot;
      if (!node) return null;
      try { node = node.querySelector(parts[i]); } catch (e) { return null; }
    }
    return node;
  }

  S.trusted_click_element = function (selectors, extraMatch, delay) {
    if (!selectors) return;
    var list = String(selectors).split(/\s*,\s*/).filter(Boolean);
    if (extraMatch) {
      var ok = String(extraMatch).split(/\s*,\s*/).every(function (cond) {
        var m = /^(!)?(cookie|localStorage):(.+)$/.exec(cond);
        if (!m) return true;
        var re = pattern(m[3], false);
        var hit = false;
        if (m[2] === 'cookie') hit = D.cookie.split(/\s*;\s*/).some(function (c) { return re.test(c.split('=')[0]); });
        else { try { for (var i = 0; i < localStorage.length; i++) if (re.test(localStorage.key(i))) hit = true; } catch (e) {} }
        return m[1] ? !hit : hit;
      });
      if (!ok) return;
    }
    var wait = Math.min(Math.max(parseInt(delay, 10) || 1, 1), 10000);
    var deadline = Date.now() + 10000;
    var busy = false;
    var mo = null;
    var stop = function () { if (mo) { mo.disconnect(); mo = null; } };
    var step = function () {
      if (busy || !list.length) return;
      if (Date.now() > deadline) { stop(); return; }
      var el = querySelectorEx(list[0]);
      if (!el) return;
      busy = true;
      nativeSetTimeout(function () {
        busy = false;
        try { if (el.isConnected) el.click(); } catch (e) {}
        list.shift();
        if (!list.length) { stop(); return; }
        step();
      }, wait);
    };
    whenReady(function () {
      step();
      if (!list.length) return;
      mo = new MutationObserver(step);
      mo.observe(D.documentElement, { childList: true, subtree: true, attributes: true });
      nativeSetTimeout(stop, 10000);
    });
  };

  S.href_sanitizer = function (selector, source) {
    if (!selector) return;
    var src = source || 'text';
    var valid = function (u) { try { var x = new URL(u, location.href); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch (e) { return ''; } };
    observe(function () {
      selectAll(selector).forEach(function (a) {
        if (a.dataset.sereneSane) return;
        var next = '';
        if (src === 'text') next = valid((a.textContent || '').trim());
        else if (/^\[.+\]$/.test(src)) next = valid(a.getAttribute(src.slice(1, -1)) || '');
        else if (src.charAt(0) === '?') { try { next = valid(new URL(a.href).searchParams.get(src.slice(1)) || ''); } catch (e) {} }
        if (next) { a.setAttribute('href', next); a.dataset.sereneSane = '1'; }
      });
    });
  };

  S.nowebrtc = function () {
    var Fake = function () {};
    Fake.prototype = {
      close: noop, createDataChannel: function () { return { close: noop }; }, createOffer: function () { return Promise.reject(new Error(magic)); },
      setRemoteDescription: function () { return Promise.resolve(); }, addEventListener: noop, removeEventListener: noop
    };
    ['RTCPeerConnection', 'webkitRTCPeerConnection'].forEach(function (n) { if (W[n]) { try { W[n] = Fake; } catch (e) {} } });
  };

  S.nofab = function () {
    var F = function () {};
    F.prototype = {
      check: noop, clearEvent: noop, emitEvent: noop, setOption: noop,
      on: function (detected, cb) { if (!detected && typeof cb === 'function') cb(); return this; },
      onDetected: function () { return this; },
      onNotDetected: function (cb) { if (typeof cb === 'function') cb(); return this; }
    };
    try { W.FuckAdBlock = W.BlockAdBlock = F; W.fuckAdBlock = W.blockAdBlock = new F(); } catch (e) {}
  };

  S.refresh_defuser = function (delay) {
    whenReady(function () {
      var meta = D.querySelector('meta[http-equiv="refresh" i][content]');
      if (!meta) return;
      var secs = delay === undefined || delay === '' ? parseFloat(meta.content) : parseFloat(delay);
      if (isNaN(secs)) return;
      nativeSetTimeout(function () { W.stop(); }, Math.max(secs * 1000 - 1, 0));
    });
  };

  S.disable_newtab_links = function () {
    D.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[target]') : null;
      if (!a || a.target === '_self' || a.target === '_top' || a.target === '_parent') return;
      e.stopPropagation();
      e.preventDefault();
    }, true);
  };

  S.serene_ad_skip = function () {
    W.setInterval(function () {
      var player = D.querySelector('.ad-showing, .ad-interrupting');
      var video = player && player.querySelector('video');
      if (video) {
        video.muted = true;
        if (isFinite(video.duration) && video.duration > 0 && video.currentTime < video.duration - 0.1) {
          try { video.playbackRate = 16; video.currentTime = video.duration; } catch (e) {}
        }
      }
      var skip = D.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-skip-button-slot button, .ytm-skip-ad-button');
      if (skip) { try { skip.click(); } catch (e) {} }
      var close = D.querySelector('.ytp-ad-overlay-close-button');
      if (close) { try { close.click(); } catch (e) {} }
    }, 300);
  };

  (rules.js || []).forEach(function (call) {
    var fn = S[call[0]];
    if (typeof fn !== 'function') return;
    try { fn.apply(null, call.slice(1)); } catch (e) {}
  });

  var sheets = [];
  function attachSheets() {
    try {
      var current = D.adoptedStyleSheets;
      var missing = sheets.filter(function (s) { return current.indexOf(s) === -1; });
      if (missing.length) D.adoptedStyleSheets = current.concat(missing);
    } catch (e) {}
  }
  function addSheet(css) {
    var sheet;
    try {
      sheet = new CSSStyleSheet();
      if (css) sheet.replaceSync(css);
    } catch (e) { return null; }
    sheets.push(sheet);
    attachSheets();
    return sheet;
  }

  addSheet(rules.css || '');
  var genericSheet = rules.generic ? addSheet('') : null;

  var ours = new WeakSet();
  var kept = new WeakSet();
  function hide(el) {
    if (!el || !el.style || kept.has(el)) return;
    if (el.style.getPropertyValue('display') !== 'none') el.style.setProperty('display', 'none', 'important');
    ours.add(el);
  }

  var AGE = /\b(18|21)\s*\+|\b(over|older than|at least|above)\s+(18|21)\b|\b(18|21)\s*(years|yrs|or older|and over|or over)|\bi\s*(am|'m|\u2019m)\s+(18|21|an adult|over|of legal age)|\badults? only\b|\bage verification\b|\bverify (your )?age\b|\bconfirm (your )?age\b|\bdate of birth\b|\byears of age\b|\blegal age\b|\badult content\b|\bsexually explicit\b|\bmature content\b|\bage[- ]restricted\b/i;
  var CONFIRM = /\b(enter|agree|yes|continue|confirm|accept|i am|i'm|over 18|18\+|proceed|ok)\b/i;
  var isTop = W === W.top;

  function gateOf(el) {
    for (var e = el, i = 0; e && e !== D.body && i < 10; e = e.parentElement, i++) {
      var controls = e.querySelectorAll('button, a, input[type=submit], input[type=button], [role=button]');
      for (var k = 0; k < controls.length && k < 40; k++) {
        if (CONFIRM.test(controls[k].textContent || controls[k].value || '')) return e;
      }
    }
    return null;
  }

  function release(gate) {
    var chain = [];
    for (var e = gate; e && e !== D.documentElement; e = e.parentElement) chain.push(e);
    var inner = gate.querySelectorAll('*');
    for (var i = 0; i < inner.length && i < 400; i++) chain.push(inner[i]);
    chain.forEach(function (el) {
      kept.add(el);
      if (ours.has(el)) { el.style.removeProperty('display'); ours.delete(el); }
      if (getComputedStyle(el).display !== 'none') return;
      sheets.forEach(function (sheet) {
        for (var r = sheet.cssRules.length - 1; r >= 0; r--) {
          var rule = sheet.cssRules[r];
          try { if (rule.selectorText && el.matches(rule.selectorText)) sheet.deleteRule(r); } catch (x) {}
        }
      });
    });
  }

  var lastProtect = 0;
  function protect(force) {
    if (!isTop || !D.body) return;
    var now = Date.now();
    if (!force && now - lastProtect < 1000) return;
    lastProtect = now;
    var text = D.body.textContent || '';
    if (text.length > 3000000 || !AGE.test(text)) return;
    var walker = D.createTreeWalker(D.body, NodeFilter.SHOW_TEXT);
    var n;
    var hits = 0;
    while ((n = walker.nextNode()) && hits < 20) {
      var v = n.nodeValue;
      if (!v || v.length > 2000 || !AGE.test(v)) continue;
      var p = n.parentElement;
      if (!p || p.closest('script, style, noscript, template')) continue;
      hits++;
      var gate = gateOf(p);
      if (gate && !kept.has(gate)) release(gate);
    }
  }

  var OPS = ['has-text', '-abp-contains', 'contains', 'upward', 'nth-ancestor', 'matches-css', 'matches-css-before', 'matches-css-after',
    'xpath', 'min-text-length', 'matches-attr', 'matches-path', 'matches-media', 'matches-prop', '-abp-has', 'if', 'if-not', 'has',
    'others', 'watch-attr', 'remove', 'style', 'remove-attr', 'remove-class'];
  var ACTIONS = { remove: 1, style: 1, 'remove-attr': 1, 'remove-class': 1 };
  var NESTED = /:(has-text|-abp-contains|contains|upward|nth-ancestor|xpath|matches-|min-text-length|if|-abp-has)\(/;

  function findOp(s, from) {
    var depthP = 0;
    var depthB = 0;
    var quote = '';
    for (var i = from; i < s.length; i++) {
      var c = s.charAt(i);
      if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; continue; }
      if (c === '"' || c === "'") { quote = c; continue; }
      if (c === '\\') { i++; continue; }
      if (c === '[') depthB++;
      else if (c === ']') depthB--;
      else if (c === '(') depthP++;
      else if (c === ')') depthP--;
      else if (c === ':' && depthP === 0 && depthB === 0) {
        var m = /^:([-a-z]+)\(/.exec(s.slice(i));
        if (m && OPS.indexOf(m[1]) !== -1) {
          if (m[1] === 'has') {
            var end = closeParen(s, i + m[0].length);
            if (end === -1 || !NESTED.test(s.slice(i + m[0].length, end))) continue;
          }
          return { at: i, op: m[1], argStart: i + m[0].length };
        }
      }
    }
    return null;
  }

  function closeParen(s, from) {
    var depth = 1;
    var quote = '';
    var inRe = false;
    for (var i = from; i < s.length; i++) {
      var c = s.charAt(i);
      if (c === '\\') { i++; continue; }
      if (quote) { if (c === quote) quote = ''; continue; }
      if (inRe) { if (c === '/') inRe = false; continue; }
      if (c === '/' && i === from) { inRe = true; continue; }
      if ((c === '"' || c === "'") && i === from) { quote = c; continue; }
      if (c === '(') depth++;
      else if (c === ')') { depth--; if (depth === 0) return i; }
    }
    return -1;
  }

  function parseProc(s) {
    s = s.trim();
    var first = findOp(s, 0);
    if (!first) return null;
    var out = { css: s.slice(0, first.at).trim(), steps: [], action: null };
    var pos = first.at;
    while (pos < s.length) {
      var op = findOp(s, pos);
      if (!op) { var tail = s.slice(pos).trim(); if (tail) out.steps.push({ op: 'spath', arg: tail }); break; }
      if (op.at > pos) { var mid = s.slice(pos, op.at).trim(); if (mid) out.steps.push({ op: 'spath', arg: mid }); }
      var end = closeParen(s, op.argStart);
      if (end === -1) return null;
      var arg = s.slice(op.argStart, end);
      if (ACTIONS[op.op]) out.action = { type: op.op, arg: arg };
      else out.steps.push({ op: op.op, arg: arg });
      pos = end + 1;
    }
    return out;
  }

  function textPattern(arg) {
    var a = String(arg).trim();
    if (/^(['"]).*\1$/.test(a)) a = a.slice(1, -1);
    return pattern(a, false);
  }

  function cssMatcher(arg, pseudo) {
    var i = arg.indexOf(':');
    if (i === -1) return null;
    var prop = arg.slice(0, i).trim();
    var val = arg.slice(i + 1).trim();
    var re = /^\/.+\/[a-z]*$/.test(val) ? pattern(val, false) : { test: function (v) { return v === val; } };
    return function (el) { return re.test(getComputedStyle(el, pseudo).getPropertyValue(prop)); };
  }

  function attrMatcher(arg) {
    var m = /^("?)(\/.+?\/[a-z]*|[^=]+)\1(?:=("?)(.*)\3)?$/.exec(String(arg).trim());
    if (!m) return null;
    var nameRe = /^\/.+\/[a-z]*$/.test(m[2]) ? pattern(m[2], false) : { test: function (n) { return n === m[2]; } };
    var valRe = m[4] === undefined ? null : pattern(m[4], false);
    return function (el) {
      var attrs = el.attributes;
      for (var i = 0; i < attrs.length; i++) {
        if (nameRe.test(attrs[i].name) && (!valRe || valRe.test(attrs[i].value))) return true;
      }
      return false;
    };
  }

  function qsa(root, sel) {
    try { return Array.prototype.slice.call(root.querySelectorAll(sel)); } catch (e) { return []; }
  }

  function addUnique(list, el) { if (el && list.indexOf(el) === -1) list.push(el); }

  function runSteps(nodes, steps) {
    for (var i = 0; i < steps.length && nodes.length; i++) {
      var st = steps[i];
      var arg = st.arg;
      var next = [];
      switch (st.op) {
        case 'has-text': case '-abp-contains': case 'contains': {
          var re = textPattern(arg);
          next = nodes.filter(function (n) { return re.test(n.textContent || ''); });
          break;
        }
        case 'min-text-length': {
          var min = parseInt(arg, 10) || 0;
          next = nodes.filter(function (n) { return (n.textContent || '').length >= min; });
          break;
        }
        case 'upward': case 'nth-ancestor': {
          var n = parseInt(arg, 10);
          var numeric = !isNaN(n) && String(n) === String(arg).trim();
          nodes.forEach(function (el) {
            var p = el;
            if (numeric) { for (var k = 0; k < n && p; k++) p = p.parentElement; }
            else { try { p = el.parentElement && el.parentElement.closest(arg); } catch (e) { p = null; } }
            addUnique(next, p);
          });
          break;
        }
        case 'matches-css': case 'matches-css-before': case 'matches-css-after': {
          var mc = cssMatcher(arg, st.op === 'matches-css-before' ? '::before' : st.op === 'matches-css-after' ? '::after' : null);
          next = mc ? nodes.filter(mc) : [];
          break;
        }
        case 'matches-attr': {
          var ma = attrMatcher(arg);
          next = ma ? nodes.filter(ma) : [];
          break;
        }
        case 'matches-path': {
          next = textPattern(arg).test(location.pathname + location.search) ? nodes : [];
          break;
        }
        case 'matches-media': {
          var mm = false;
          try { mm = W.matchMedia(arg).matches; } catch (e) {}
          next = mm ? nodes : [];
          break;
        }
        case 'xpath': {
          nodes.forEach(function (el) {
            try {
              var r = D.evaluate(arg, el, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
              for (var k = 0; k < r.snapshotLength; k++) { var x = r.snapshotItem(k); if (x.nodeType === 1) addUnique(next, x); }
            } catch (e) {}
          });
          break;
        }
        case '-abp-has': case 'if': case 'has': case 'if-not': {
          var inner = parseProc(arg);
          var want = st.op !== 'if-not';
          next = nodes.filter(function (el) {
            var found = inner ? select(inner, el).length > 0 : qsa(el, arg.charAt(0) === '>' ? ':scope ' + arg : arg).length > 0;
            return found === want;
          });
          break;
        }
        case 'spath': {
          nodes.forEach(function (el) { qsa(el, ':scope ' + arg).forEach(function (x) { addUnique(next, x); }); });
          break;
        }
        default:
          next = nodes;
      }
      nodes = next;
    }
    return nodes;
  }

  function select(proc, root) {
    var start;
    if (proc.css) start = qsa(root || D, root && proc.css.charAt(0) === '>' ? ':scope ' + proc.css : proc.css);
    else start = [root || D.documentElement];
    return runSteps(start, proc.steps);
  }

  function applyAction(el, action) {
    if (!action) { hide(el); return; }
    try {
      switch (action.type) {
        case 'remove': el.remove(); break;
        case 'style':
          String(action.arg || '').split(';').forEach(function (decl) {
            var i = decl.indexOf(':');
            if (i === -1) return;
            var v = decl.slice(i + 1).trim();
            var important = /!important\s*$/.test(v);
            el.style.setProperty(decl.slice(0, i).trim(), v.replace(/\s*!important\s*$/, ''), important ? 'important' : '');
          });
          break;
        case 'remove-attr': {
          var ra = pattern(action.arg, false);
          Array.prototype.slice.call(el.attributes).forEach(function (a) { if (ra.test(a.name)) el.removeAttribute(a.name); });
          break;
        }
        case 'remove-class': {
          var rc = pattern(action.arg, false);
          Array.prototype.slice.call(el.classList).forEach(function (c) { if (rc.test(c)) el.classList.remove(c); });
          break;
        }
      }
    } catch (e) {}
  }

  var procs = [];
  (rules.pro || []).forEach(function (raw) {
    var p = parseProc(raw);
    if (p) procs.push(p);
  });
  (rules.proc || []).forEach(function (f) {
    if (!f || !Array.isArray(f.selector) || !f.selector.length) return;
    var steps = f.selector.map(function (s) { return { op: s.type === 'css-selector' ? 'spath' : s.type, arg: s.arg }; });
    var css = steps[0].op === 'spath' ? steps.shift().arg : '';
    procs.push({ css: css, steps: steps, action: f.action || null });
  });

  function runProcs() {
    for (var i = 0; i < procs.length; i++) {
      var hits;
      try { hits = select(procs[i]); } catch (e) { continue; }
      for (var j = 0; j < hits.length; j++) applyAction(hits[j], procs[i].action);
    }
  }

  var seenClass = Object.create(null);
  var seenId = Object.create(null);
  var newClasses = [];
  var newIds = [];
  var COLLAPSE = 'iframe, frame, img, embed, object, video[src], audio[src], source[src]';

  function collect(el) {
    if (!genericSheet || el.nodeType !== 1) return;
    var id = el.id;
    if (id && typeof id === 'string' && !seenId[id]) { seenId[id] = 1; newIds.push(id); }
    var cl = el.classList;
    if (cl) for (var i = 0; i < cl.length; i++) { var c = cl[i]; if (!seenClass[c]) { seenClass[c] = 1; newClasses.push(c); } }
  }

  function kindOf(el) {
    switch (el.localName) {
      case 'iframe': case 'frame': return 'sub_frame';
      case 'img': return 'image';
      case 'embed': case 'object': return 'object';
      default: return 'media';
    }
  }

  function scanCollapse(root) {
    var els = root.matches(COLLAPSE) ? [root] : [];
    els = els.concat(qsa(root, COLLAPSE));
    var items = [];
    var targets = [];
    els.forEach(function (el) {
      var url = el.localName === 'object' ? el.data : el.currentSrc || el.src;
      if (!url || !/^https?:/.test(url) || el.dataset.sereneSrc === url) return;
      el.dataset.sereneSrc = url;
      items.push(kindOf(el) + '\t' + url);
      targets.push(el);
    });
    if (!items.length) return;
    var res = '';
    try { res = B.blocked(href, items.join('\n')); } catch (e) {}
    if (!res) return;
    res.split(',').forEach(function (i) {
      var el = targets[+i];
      if (el) hide(el.localName === 'source' ? el.parentElement : el);
    });
  }

  function flushGeneric() {
    if (!genericSheet || (!newClasses.length && !newIds.length)) return;
    var classes = newClasses.join('\n');
    var ids = newIds.join('\n');
    newClasses = [];
    newIds = [];
    var out = '';
    try { out = B.generic(href, classes, ids); } catch (e) {}
    if (!out) return;
    out.split('\n').forEach(function (sel) {
      if (!sel) return;
      try { genericSheet.insertRule(sel + '{display:none!important}', genericSheet.cssRules.length); } catch (e) {}
    });
  }

  var trees = [];
  var touched = [];
  var flushTimer = 0;
  var lastProcs = 0;

  function flush() {
    flushTimer = 0;
    var roots = trees;
    var els = touched;
    trees = [];
    touched = [];
    var i;
    for (i = 0; i < roots.length; i++) {
      var r = roots[i];
      if (!r.isConnected) continue;
      collect(r);
      if (genericSheet) {
        var all = r.querySelectorAll('[id],[class]');
        for (var j = 0; j < all.length; j++) collect(all[j]);
      }
      scanCollapse(r);
    }
    for (i = 0; i < els.length; i++) {
      if (!els[i].isConnected) continue;
      collect(els[i]);
      if (els[i].matches(COLLAPSE)) scanCollapse(els[i]);
    }
    flushGeneric();
    attachSheets();
    if (procs.length) {
      var now = Date.now();
      if (now - lastProcs > 250) { lastProcs = now; runProcs(); }
      else if (!flushTimer) flushTimer = nativeSetTimeout(flush, 260 - (now - lastProcs));
    }
    try { protect(false); } catch (e) {}
  }

  function schedule(node, attr) {
    if (node) (attr ? touched : trees).push(node);
    if (!flushTimer) flushTimer = nativeSetTimeout(flush, trees.length > 200 ? 0 : 60);
  }

  var watcher = new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      if (r.type === 'attributes') schedule(r.target, true);
      else for (var j = 0; j < r.addedNodes.length; j++) if (r.addedNodes[j].nodeType === 1) schedule(r.addedNodes[j]);
    }
  });

  function begin() {
    if (!D.documentElement) return false;
    schedule(D.documentElement);
    watcher.observe(D.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'id', 'src', 'data'] });
    return true;
  }
  if (!begin()) {
    var early = new MutationObserver(function () { if (begin()) early.disconnect(); });
    early.observe(D, { childList: true });
  }
  whenReady(function () { schedule(D.documentElement); });
  W.addEventListener('load', function () {
    schedule(D.documentElement);
    [300, 1500, 4000].forEach(function (t) { nativeSetTimeout(function () { try { protect(true); } catch (e) {} }, t); });
  });
})();
