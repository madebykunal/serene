(function () {
  'use strict';
  var q = window.adsbygoogle;
  window.adsbygoogle = { loaded: true, push: function () {}, length: 0 };
  if (Array.isArray(q)) q.length = 0;
  var hide = function () {
    document.querySelectorAll('ins.adsbygoogle').forEach(function (el) {
      el.setAttribute('data-adsbygoogle-status', 'done');
      el.style.setProperty('display', 'none', 'important');
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hide);
  else hide();
})();
