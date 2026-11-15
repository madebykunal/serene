(function () {
  'use strict';
  var noop = function () {};
  var callback = function (args) {
    for (var i = 0; i < args.length; i++) {
      var a = args[i];
      if (a && typeof a === 'object' && typeof a.hitCallback === 'function') {
        try { a.hitCallback(); } catch (e) {}
      }
    }
  };
  var tracker = { get: noop, set: noop, send: function () { callback(arguments); } };
  var name = window.GoogleAnalyticsObject || 'ga';
  var old = window[name];
  var ga = function () {
    var a = arguments;
    if (typeof a[0] === 'function') { try { a[0](tracker); } catch (e) {} return; }
    callback(a);
  };
  ga.create = function () { return tracker; };
  ga.getByName = function () { return tracker; };
  ga.getAll = function () { return [tracker]; };
  ga.remove = noop;
  ga.loaded = true;
  window[name] = ga;
  if (old && Array.isArray(old.q)) old.q.forEach(function (a) { ga.apply(null, a); });
  window._gaq = window._gaq || { push: function (f) { if (typeof f === 'function') try { f(); } catch (e) {} } };
})();
