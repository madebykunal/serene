(function () {
  'use strict';
  var run = function (o) {
    if (o && typeof o === 'object' && typeof o.eventCallback === 'function') {
      try { setTimeout(o.eventCallback, 1); } catch (e) {}
    }
  };
  var dl = window.dataLayer;
  if (Array.isArray(dl)) {
    var push = dl.push;
    dl.push = function (o) { run(o); return push.apply(dl, arguments); };
    dl.forEach(run);
  }
  window.google_tag_manager = window.google_tag_manager || {};
})();
