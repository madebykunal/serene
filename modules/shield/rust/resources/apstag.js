(function () {
  'use strict';
  var noop = function () {};
  var q = window.apstag && window.apstag._Q;
  window.apstag = {
    _Q: [], init: noop, deleteId: noop, dpa: noop, rpa: noop, upa: noop, setDisplayBids: noop,
    targetingKeys: function () { return []; },
    fetchBids: function (cfg, cb) { if (typeof cb === 'function') setTimeout(function () { cb([]); }, 1); }
  };
  if (Array.isArray(q)) q.forEach(function (c) { if (c && c[0] === 'f' && typeof c[1][1] === 'function') c[1][1]([]); });
})();
