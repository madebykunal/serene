(function () {
  'use strict';
  var noop = function () {};
  var self = function () { return this; };
  var slot = function (path, id) {
    var s = {
      addService: self, clearCategoryExclusions: self, clearTargeting: self, defineSizeMapping: self,
      get: function () { return null; }, getAdUnitPath: function () { return path || ''; },
      getAttributeKeys: function () { return []; }, getCategoryExclusions: function () { return []; },
      getDomId: function () { return id || ''; }, getResponseInformation: function () { return null; },
      getSlotElementId: function () { return id || ''; }, getSlotId: function () { return s; },
      getTargeting: function () { return []; }, getTargetingKeys: function () { return []; },
      set: self, setCategoryExclusion: self, setClickUrl: self, setCollapseEmptyDiv: self,
      setConfig: self, setForceSafeFrame: self, setSafeFrameConfig: self, setTargeting: self, updateTargetingFromMap: self
    };
    return s;
  };
  var listeners = {};
  var pubads = {
    addEventListener: function (t, f) { (listeners[t] = listeners[t] || []).push(f); return pubads; },
    removeEventListener: function () { return true; },
    clear: noop, clearCategoryExclusions: self, clearTagForChildDirectedTreatment: self, clearTargeting: self,
    collapseEmptyDivs: self, defineOutOfPagePassback: function () { return slot(); }, definePassback: function () { return slot(); },
    disableInitialLoad: noop, display: noop, enableAsyncRendering: noop, enableLazyLoad: noop, enableSingleRequest: noop,
    enableSyncRendering: noop, enableVideoAds: noop, get: function () { return null; }, getAttributeKeys: function () { return []; },
    getTargeting: function () { return []; }, getTargetingKeys: function () { return []; }, getSlots: function () { return []; },
    isInitialLoadDisabled: function () { return true; }, refresh: noop, set: self, setCategoryExclusion: self,
    setCentering: noop, setCookieOptions: self, setForceSafeFrame: self, setLocation: self, setPrivacySettings: self,
    setPublisherProvidedId: self, setRequestNonPersonalizedAds: self, setSafeFrameConfig: self, setTagForChildDirectedTreatment: self,
    setTargeting: self, setVideoContent: self, updateCorrelator: noop
  };
  var gt = window.googletag || {};
  var queue = Array.isArray(gt.cmd) ? gt.cmd : [];
  Object.assign(gt, {
    apiReady: true, pubadsReady: true, _loaded_: true,
    companionAds: function () { return { addEventListener: self, enableSyncLoading: noop, setRefreshUnfilledSlots: noop }; },
    content: function () { return { addEventListener: self, setContent: noop }; },
    defineOutOfPageSlot: function (p, id) { return slot(p, id); },
    defineSlot: function (p, s, id) { return slot(p, id); },
    destroySlots: function () { return true; }, disablePublisherConsole: noop, display: noop, enableServices: noop,
    getVersion: function () { return ''; }, openConsole: noop, pubads: function () { return pubads; },
    setAdIframeTitle: noop, setConfig: noop, sizeMapping: function () { return { addSize: self, build: function () { return []; } }; }
  });
  gt.cmd = { push: function (f) { try { f(); } catch (e) {} return 1; } };
  window.googletag = gt;
  queue.forEach(function (f) { try { f(); } catch (e) {} });
})();
