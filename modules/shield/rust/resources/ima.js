(function () {
  'use strict';
  if (window.google && window.google.ima && window.google.ima.AdsLoader) return;
  var noop = function () {};
  var Target = function () { this._l = {}; };
  Target.prototype.addEventListener = function (t, f) {
    var ts = Array.isArray(t) ? t : [t];
    for (var i = 0; i < ts.length; i++) (this._l[ts[i]] = this._l[ts[i]] || []).push(f);
  };
  Target.prototype.removeEventListener = function (t, f) {
    var l = this._l[t];
    if (l) this._l[t] = l.filter(function (x) { return x !== f; });
  };
  Target.prototype._fire = function (t, e) {
    (this._l[t] || []).slice().forEach(function (f) { try { typeof f === 'function' ? f(e) : f.handleEvent(e); } catch (x) {} });
  };
  var AdError = function (msg) { this.message = msg; };
  AdError.prototype = {
    getErrorCode: function () { return 1009; }, getInnerError: function () { return null; },
    getMessage: function () { return this.message; }, getType: function () { return 'adLoadError'; },
    getVastErrorCode: function () { return 303; }, toString: function () { return 'AdError 1009: ' + this.message; }
  };
  AdError.ErrorCode = { VAST_EMPTY_RESPONSE: 1009, UNKNOWN_ERROR: 900 };
  AdError.Type = { AD_LOAD: 'adLoadError', AD_PLAY: 'adPlayError' };
  var AdErrorEvent = function (err, ctx) { this.error = err; this.ctx = ctx; this.type = 'adError'; };
  AdErrorEvent.prototype = { getError: function () { return this.error; }, getUserRequestContext: function () { return this.ctx || {}; } };
  AdErrorEvent.Type = { AD_ERROR: 'adError' };
  var Settings = function () {};
  ['setAutoPlayAdBreaks', 'setCompanionBackfill', 'setCookiesEnabled', 'setDisableCustomPlaybackForIOS10Plus', 'setFeatureFlags',
   'setLocale', 'setNumRedirects', 'setPlayerType', 'setPlayerVersion', 'setPpid', 'setSessionId', 'setVpaidAllowed', 'setVpaidMode']
    .forEach(function (m) { Settings.prototype[m] = noop; });
  Settings.prototype.getLocale = function () { return 'en'; };
  Settings.prototype.isCookiesEnabled = function () { return false; };
  Settings.VpaidMode = { DISABLED: 0, ENABLED: 1, INSECURE: 2 };
  var settings = new Settings();
  var AdsLoader = function () { Target.call(this); };
  AdsLoader.prototype = Object.create(Target.prototype);
  AdsLoader.prototype.contentComplete = noop;
  AdsLoader.prototype.destroy = noop;
  AdsLoader.prototype.getSettings = function () { return settings; };
  AdsLoader.prototype.getVersion = function () { return '3.0.0'; };
  AdsLoader.prototype.requestAds = function (req, ctx) {
    var self = this;
    setTimeout(function () { self._fire('adError', new AdErrorEvent(new AdError('No ads'), ctx)); }, 1);
  };
  var AdsManager = function () { Target.call(this); };
  AdsManager.prototype = Object.create(Target.prototype);
  ['collapse', 'configureAdsManager', 'destroy', 'discardAdBreak', 'expand', 'focus', 'init', 'pause', 'resize', 'resume',
   'setVolume', 'skip', 'start', 'stop', 'updateAdsRenderingSettings', 'setAdWillAutoPlay', 'setAdWillPlayMuted']
    .forEach(function (m) { AdsManager.prototype[m] = noop; });
  AdsManager.prototype.getCuePoints = function () { return []; };
  AdsManager.prototype.getRemainingTime = function () { return 0; };
  AdsManager.prototype.getVolume = function () { return 1; };
  AdsManager.prototype.isCustomClickTrackingUsed = function () { return false; };
  AdsManager.prototype.isCustomPlaybackUsed = function () { return false; };
  var AdsManagerLoadedEvent = function () { this.type = 'adsManagerLoaded'; };
  AdsManagerLoadedEvent.prototype = { getAdsManager: function () { return new AdsManager(); }, getUserRequestContext: function () { return {}; } };
  AdsManagerLoadedEvent.Type = { ADS_MANAGER_LOADED: 'adsManagerLoaded' };
  var AdEvent = function (t) { this.type = t; };
  AdEvent.prototype = { getAd: function () { return null; }, getAdData: function () { return null; } };
  AdEvent.Type = {};
  ['AD_BREAK_READY', 'AD_BUFFERING', 'AD_CAN_PLAY', 'AD_METADATA', 'ALL_ADS_COMPLETED', 'CLICK', 'COMPLETE', 'CONTENT_PAUSE_REQUESTED',
   'CONTENT_RESUME_REQUESTED', 'DURATION_CHANGE', 'FIRST_QUARTILE', 'IMPRESSION', 'INTERACTION', 'LINEAR_CHANGED', 'LOADED', 'LOG',
   'MIDPOINT', 'PAUSED', 'RESUMED', 'SKIPPABLE_STATE_CHANGED', 'SKIPPED', 'STARTED', 'THIRD_QUARTILE', 'USER_CLOSE', 'VIDEO_CLICKED',
   'VIDEO_ICON_CLICKED', 'VOLUME_CHANGED', 'VOLUME_MUTED']
    .forEach(function (k) { AdEvent.Type[k] = k.toLowerCase().replace(/_(\w)/g, function (_, c) { return c.toUpperCase(); }); });
  var AdsRequest = function () {};
  AdsRequest.prototype = { setAdWillAutoPlay: noop, setAdWillPlayMuted: noop, setContinuousPlayback: noop };
  var Display = function () {};
  Display.prototype = { initialize: noop, destroy: noop };
  var ima = {
    AdCuePoints: function () {}, AdDisplayContainer: Display, AdError: AdError, AdErrorEvent: AdErrorEvent, AdEvent: AdEvent,
    AdsLoader: AdsLoader, AdsManager: AdsManager, AdsManagerLoadedEvent: AdsManagerLoadedEvent, AdsRenderingSettings: function () {},
    AdsRequest: AdsRequest, CompanionAdSelectionSettings: function () {}, ImaSdkSettings: Settings,
    OmidAccessMode: { DOMAIN: 'domain', FULL: 'full', LIMITED: 'limited' }, OmidVerificationVendor: {},
    UiElements: { AD_ATTRIBUTION: 'adAttribution', COUNTDOWN: 'countdown' }, UniversalAdIdInfo: function () {},
    ViewMode: { FULLSCREEN: 'fullscreen', NORMAL: 'normal' }, VERSION: '3.0.0', settings: settings
  };
  window.google = window.google || {};
  window.google.ima = ima;
})();
