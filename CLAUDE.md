# Serene

A calm, tab-first mobile browser: a tab grid with pinned tabs and auto-archive, a bottom search box with suggestions, and settings. Pages load in the device's own WebView. Expo SDK 58, React Native 0.88, runs in Expo Go.

# Design

- Dusk glass (product truth in `PRODUCT.md`): liquid-glass panes (`src/ui/Glass.tsx`): a real `expo-blur` blur, a translucent tint, a top-lit `linear-gradient` sheen, inset rim highlights and a soft `boxShadow`. On Android a pane only blurs what sits inside a `GlassTarget` under the nearest `GlassScope` (Dimezis BlurView, Android 12+); panes inside a target, on older Android or with no scope fall back to a near-opaque tint. Each target needs its own background color (gaps show the window's teal). WebView content never reaches the blur capture, so `App` turns the root scope off on the page view and the browser bar uses see-through tinted glass instead (`see` prop). `Frost` is the full-screen blurred scrim (Search, sheets). The palette is Brave-style neutral; `bg-day.jpg` and `bg-night.jpg` now only back Welcome. Mint `river` is reserved for "current / go": the selected segment's indicator, the tabs Done button, the page progress bar.
- Tokens live in `src/ui/theme.ts`: palette (`glass`, `glassStrong`, `glassEdge`, `river`, `onRiver`, `onBg` for text over the backdrop), `type` (display, title, body, bodyStrong, label, caption; rank by weight, system sans) and `motion` (quick 160, base 240, slow 360 ms; `enter`/`exit` easings).
- Home (`src/screens/Home.tsx`) is a three-page pager, History · Home · Bookmarks, opening on Home; the mint indicator glides with the swipe. Home shows only pinned tabs as a 4-column tile grid plus a settings button. The bottom bar is back-to-page · search pill · tab count.
- Tab overview (`src/screens/Tabs.tsx`): the card carousel over the backdrop, a search button that filters tabs, Close all, and a bottom bar of + (goes Home with search open) · Private/N Tabs toggle · Done (back to the current page, or Home when no page is open). Home and Tabs sit on a static opaque `c.bg` view and only their content animates in, so the mounted page under them never flashes through. After a card is closed the carousel scrolls the next card (or the previous, for the last) into its place. Closing a tab offers Undo (`reopenTab`, without its thumbnail).
- Rename: long-press a bookmark row, or Rename in a tab's menu (pinned tiles included). Names live in `tab.name` and `bookmark.name`; `tabLabel` prefers the name and page titles never overwrite it. `Rename.tsx` sits near the top so the keyboard can't cover it.
- Wallpaper (Settings → Appearance → Wallpaper, Home page only): None, Dusk hills (`bg-night.jpg`), Dawn hills (`bg-day.jpg`) or a photo. A photo goes through the system picker (no storage permission), is decoded once natively with `inSampleSize` in RGB_565 to about 60 % of the screen's long edge, EXIF-rotated, saved as one JPEG in `filesDir/wallpaper/` (older ones deleted) and stored as `settings.wallpaperUri`. Home draws it inside its `GlassTarget` (so the glass bars blur it) with `resizeMethod="resize"` and a theme scrim. Never show the original picked file.
- Settings switches: mint `brandSoft` track when on, a mid-grey track when off; never `c.text` (white on white in dark mode). Row titles wrap to two lines and subtitles to three.
- Text fields use `c.selection` (translucent) for `selectionColor` and `c.text` for the cursor and handles; an opaque selection colour hides selected text, e.g. when the address is selected on edit.
- Search: suggestions list from the top, typed row highlighted, ↖ fills a suggestion into the field, input pill above the keyboard with clear and close. Suggestions warm the connection on open, fetch the first keystroke immediately then debounce 40 ms, cache results and narrow the last list while a request is in flight.
- Long-press on a link or image opens a compact popover (`LinkMenu` in `Menus.tsx`) anchored at the press point (`LONG_PRESS` reports x/y as fractions of the viewport); page and tab menus stay bottom sheets.
- Onboarding keeps its heading text; the rest follows the system.
- Branding and copy are Serene's own. Never use Arc's logo, name or tagline.
- The app's name isn't final. Its identity lives only in `brand.json` (display name, slug, URL scheme, Android package and iOS bundle ID); `app.config.js` applies it on top of `app.json`, and UI text uses `APP_NAME` from `src/brand.ts`. Never hard-code the name, package or scheme anywhere else; native modules, files and threads use neutral names (`shield`, `downloads`, `state.json`). Renaming also needs new art in `assets/` (`logo.png`, icons, splash).
- The logo is the user's official artwork (2026-11-14); `logo.png`, `icon.png`, the adaptive foreground and monochrome, and `splash-icon.png` are derived from it, and every shipping raster retains its provenance. There is no gradient library.

# Commands

- Check: `npx tsc --noEmit`, `npx eslint .`
- Install: `npx expo install <pkg>`, never guess versions
- Run: `npm start` (Expo Go)
- Bundle size: `npx expo export --platform android --no-bytecode --source-maps --output-dir /tmp/app-size`. Never use `EXPO_ATLAS=true`.

# Layout

- `src/App.tsx`: app shell and layer switching.
- `src/state/store.ts`: tabs, history, bookmarks, settings, site rules.
- `src/screens/`: one file per screen or sheet. `screens/browser/` holds the in-page browser: `Browser.tsx`, the shared `web` controller (`controller.ts`), user agents, the tabs glyph and the load-error page.
- `src/privacy/`: everything that protects the user. `adblock.ts` (ad blocking and cosmetic CSS), `badger.ts` (Privacy Badger), `clearurls/` (link cleaning), `gpc.ts` (GPC and DNT), `native.ts` (the `Shield` native module shared by adblock and Badger) and `index.ts` (`tidyUrl`, `cleanNavigation`, `usePrivacySync`, which pushes settings to the native side).
- `src/inject/`: scripts injected into web pages (dark mode, pop-up cleaner, long press, pull to refresh, find, page info).
- `src/lib/`: plain helpers (`url.ts` for search engines and URLs, `tabs.ts`, `downloads.ts`).
- `src/ui/`: shared components and `theme.ts`.
- `modules/shield/`: native ad blocking and Privacy Badger (Rust engine plus Kotlin request hook). `modules/downloads/`: native downloads. `modules/wallpaper/`: the system photo picker plus a one-time downscale (Android only; `src/lib/wallpaper.ts`).

# Motion

- Every `Tap` springs its scale down on press-in (0.94 for buttons; rows pass `scale` 0.98–0.985) and back with a small bounce, on the native driver, so feedback starts with the touch. Use `Tap` for anything pressable.
- Springs, not long timings: entrances use `Animated.spring` (damping 20–26, stiffness 280–340, mass 0.8–0.85), exits are 150–170 ms timings. Interpolations fed by springs clamp where overshoot would show a gap (sheets, opacity).
- Home pages fade and scale (0.93) with the pager's native scroll value; Settings pages slide 18 % in; sheets, Rename and Tabs spring in; tab cards shrink as they're swiped up; the Private/Tabs switch slides its pill.

# Code

- No comments by default; one short line only when the code can't show a constraint.
- TypeScript strict, no `any`. `StyleSheet.create`, colors from `useTheme()` in `src/ui/theme.ts`.
- No router: `src/App.tsx` switches between the grid, browser, search overlay and sheets with plain state. Android back is handled per layer with `BackHandler`.
- State lives in `src/state/store.ts` (a tiny external store over `useSyncExternalStore`), saved as JSON with `expo-file-system`. Thumbnails are JPEGs in the cache dir; store only file names.
- `Favicon` tries the page's own icon, then the site's `/favicon.ico`, then a letter tile. History entries store the page icon (`setVisitIcon`).
- Icons are Phosphor (`phosphor-react-native` over `react-native-svg`), mapped by name in `src/ui/Icon.tsx`. Import each icon from `phosphor-react-native/src/icons/<Name>`, never the package index: the index pulls in every icon (the bundle went from 1.5 MB to 7.1 MB). `tsconfig.json` maps those paths to the package's `.d.ts` files, because its `.tsx` sources fail strict type-checking. The `weight` prop is a stroke in px; it's converted to Phosphor's weights (most UI icons land on `bold`; `thin`/`light` read too faint). Use `Icon` everywhere, never PNG glyphs or hand-drawn View shapes (the tab-count box is the one exception: it shows a number).
- Android draws edge-to-edge, so the window doesn't resize for the keyboard; `Browser` shrinks the WebView by the keyboard's height itself so page inputs stay visible.
- On Android, `react-native-webview` forwards iOS-only props straight to its native component. Check a prop's type in `node_modules/react-native-webview/src/RNCWebViewNativeComponent.ts` before passing it: `decelerationRate="normal"` crashed Android with "String cannot be cast to Double", so it's `0.998`.
- Dark pages: `src/inject/darkMode.ts` is injected before content loads. Google-family sites (google.*, YouTube, Gmail, Blogger, googleusercontent…) are never restyled: their JS themes clash with forced darkening. YouTube gets its own dark theme by setting bit 0x400 in its `PREF` cookie's `f6` (other PREF fields are kept) plus one guarded reload. DuckDuckGo gets its `ae` cookie and `kae=d` in `searchUrl`. Other sites get `matchMedia` reporting dark and their own `prefers-color-scheme: dark` CSS re-applied.
- Pop-up cleaner: `src/inject/declutter.ts` is injected before content loads when Settings → Hide Pop-ups is on (default). It hides Google sign-in prompt containers and known in-page app banners (`#siteNotice`, smart-app-banner classes) by selector. It also hides fixed or sticky elements whose short text matches promo or sign-in phrases, but only bottom banners and sheets, dialogs, or tiny top strips; it never touches `header`, `nav`, or a top bar with a search box or more than two controls (YouTube's header contains "Open App"). Then it unlocks page scrolling. It rescans at most every 450 ms on DOM changes. Any DOM write in an injected script must guard against `document.documentElement` being null at document start.
- Card screenshots are captured at the card's on-screen pixel width (`cardWidth × PixelRatio`, JPEG 0.82) so small page text stays sharp.
- Dark websites (Settings → Darken Websites): if at least 4 of 5 sample points are still light, `html` is inverted (`invert(0.94) hue-rotate(180deg)`), and the invert is removed again if the page later turns itself dark. Only videos, canvases, frames and raster photos of at least 96×64 (`img[data-srp]`) are flipped back; small images, SVGs and logos stay inverted so dark-ink logos stay visible.
- Browser identity: Android sends a standard Chrome-for-Android user agent (`Linux; Android 10; K`, the reduced form Chrome uses) with the WebView's real Chromium major version, learned from `navigator.userAgentData` and stored as `state.chrome`. iOS appends `Version/N Safari/604.1`. Both props are strings in the native spec.
- Default browser (Android): `intentFilters` handle VIEW + BROWSABLE for http/https plus MAIN + APP_BROWSER. It needs a real build (`eas build -p android --profile preview`); Expo Go can't register as a browser. `expo-system-ui` makes the native theme follow day/night.
- Web pages follow the app theme: `App.tsx` calls `Appearance.setColorScheme` so the native theme matches Settings → Theme, which sets the pages' `prefers-color-scheme`, and `Browser` passes `forceDarkOn` for Android 10–12. Android 13+ ignores `forceDarkOn`, so pages without their own dark theme stay light there.
- The in-page bar floats above the page: back circle (dimmed when there's no history) · pill with ≡ (page sheet), the clean host (tap to edit the address, shrinks to fit) and reload, with the mint load-progress line along its bottom edge · tab-count circle (tap for the tab overview, long-press for a new tab; swiping up on the bar also opens the overview). Over web content it's `c.panel` glass (private `#241B45`) at `BAR_SEE` (26 %) see-through, because WebView can't be blurred; it blends with the page but stays readable. The reload icon spins while a page loads. Any link tap in the page posts `go` (from `PAGE_INFO`), which brings a hidden bar back and starts the progress line before the load begins; a 5 s timer stops the spinner if no load follows. The page sheet holds Reload/Bookmark/Copy link/Share, then Find, Desktop site, Site settings, Pin, Settings, Close.
- The tab overview is a horizontal carousel of tall preview cards (site icon and search words or page title above, swipe up to close, long-press for options; all cards are the same size, centred between the top and bottom bars and lifted slightly (`LIFT`); free scrolling with no snapping, like the iPhone app switcher, and no press feedback on cards). Don't add `removeClippedSubviews` or a small `windowSize` to it: both left cards blank or text half-drawn after fast flings., not a grid. Previews are captured 0.9 s after each page load.
- `ios/` and `android/` are generated; configure native behavior in `app.json`.

# Ad blocking (Android)

- Brave's `adblock` crate (0.13.5, MPL 2.0) is wrapped by `modules/shield/rust` and exposed over JNI as `expo.modules.shield.AdblockNative` (`check`, `pageRules`, `genericSelectors`). The prebuilt `libshield.so` (arm64-v8a, 16 KB-aligned) and the lists in `assets/adblock/` are committed.
- Lists (aggressive on purpose): EasyList, EasyPrivacy, Fanboy's Annoyance (includes the EasyList Cookie list), uBlock filters (yearly files inlined), quick fixes, privacy, unbreak, uBlock cookie and other annoyances, Brave specific and unbreak, plus `serene.txt` (mobile YouTube player ads, Google One Tap, consent overlays). `modules/shield/lists.py` downloads them, inlines `!#include` and resolves `!#if` for mobile Chromium; the engine ignores both directives, so never copy raw uBlock lists in.
- Rebuild or refresh with `modules/shield/build-android.sh` (runs `lists.py`, the Rust tests and the NDK build; needs Rust, the `aarch64-linux-android` target and NDK r28c at `~/Library/Android/android-ndk-r28c`). Keep the crate's `single-thread` feature off: the engine is shared across WebView and JavaBridge threads.
- At first launch after an install or update the engine is built from the lists on a background thread, then cached as `filesDir/adblock-shield-2-…-<lastUpdateTime>.dat`; later launches load it in a few ms.
- Network: `AdblockService` blocks sub-requests through `requestHook` and service-worker requests through `ServiceWorkerController`. Request type comes from `Sec-Fetch-Dest`, then Accept and extension; untyped requests are also checked as `xhr`. Blocked images get a 1×1 GIF, frames empty HTML. `$redirect` rules and blocked ad SDKs (IMA, GPT, AdSense, Analytics, GTM, APS) get Serene's own surrogates from `rust/resources/`, so players and pages don't wait on them.
- Cosmetics and scriptlets run in `assets/shield/content.js`, registered for every frame with `addDocumentStartJavaScript`. It asks the per-WebView `ShieldBridge` (a JavascriptInterface with a random per-launch name the script deletes from `window`) for the page's rules, then: runs scriptlets from its own library (engine resources are stubs named after uBlock scriptlets and their aliases, so the engine only reports which to call and with what arguments; no `eval`, so page CSP doesn't matter), adds hide CSS through `adoptedStyleSheets`, runs uBlock procedural filters (`:has-text`, `:upward`, `:xpath`, `:matches-css`, `:style`, `:remove`…, which the engine passes through as raw selectors), sends new classes and ids for generic hiding, and collapses frames, images and media whose URLs the engine blocks. Test it in Chromium with a mock bridge (Playwright) before a device build.
- Age gates ("I'm 18 or older") must never be hidden: `lib.rs` drops any hide rule whose selector or text looks like one (`AGE_GATE`), `content.js` (`protect`) deletes whichever of its rules hid a visible-text age gate with a confirm button, and `declutter.ts` skips them.
- Unknown scriptlets are skipped. Add one by naming it in `SCRIPTLETS` in `lib.rs` (canonical name plus aliases) and implementing it in `content.js` under the canonical name with `-` and `.` turned into `_`.
- `patches/react-native-webview+14.0.1.patch` adds `RNCWebViewClient.requestHook` (a static `BiFunction`) with a `shouldInterceptRequest` override, `RNCWebViewClient.viewHook` (called when each WebView is created; returns a script to register at document start), true document-start injection for `injectedJavaScriptBeforeContentLoaded` (react-native-webview otherwise runs it from `onPageStarted`, which races the page), and the risky-download dialog. `postinstall` runs patch-package; re-check the patch whenever react-native-webview is upgraded. R8 keep rules live in the module's `proguard-rules.pro`.
- Expo Go has no native module, so `src/privacy/native.ts` and `src/lib/downloads.ts` use `requireOptionalNativeModule`; blocking and downloads are simply off there. iOS isn't built yet; it needs WKContentRuleList (the crate's `content-blocking` feature) and full Xcode.
- Local Android builds use JDK 17 at `~/Library/Java/jdk-17*`, the SDK at `~/Library/Android/sdk` (platform 37.0, build-tools 37.0.0, NDK 27.1.12297006). `android/` is generated; delete it after local builds.

# Browsing features

- In-page scripts live in `src/inject/pageScripts.ts` (`PAGE_INFO` reports the icon, theme color, Chromium version and scroll direction). `LONG_PRESS` sends `ctx` messages for links and images after a 0.48 s hold, which open `LinkMenu`. `PULL_TO_REFRESH` (Android only) sends `pull` and `pullEnd`. `findScript(q, step)` wraps matches in `<mark>` and reports `find {n,i}`. `guard(hosts, script)` skips a script on listed hosts. Their behaviour was checked in Chromium with real touch events.
- Per-site rules (`state.sites[host]`, host without `www.`): `ads: false` goes to the native `setSiteExceptions` (skips ad blocking and tracker learning for that page). `darken` and `popups` wrap their scripts in `guard`; `https` and `cookies` turn the HTTPS upgrade and third-party cookie blocking off for the site. Rules are edited from the page sheet (`SiteSheet`) or Settings → Privacy & Security → Site Settings.
- Private tabs (`tab.private`): never written to `state.json`, never added to history or visit icons, and use `cacheEnabled={false}`. iOS also uses WebView `incognito`; Android must not, because react-native-webview's Android incognito wipes every cookie on the phone. The search panel's eye toggles private mode, and private UI uses `#241B45`.
- Downloads: Android WebView downloads go through the system DownloadManager (react-native-webview's own listener). The separate `modules/downloads` module (`Downloads`, `Downloads.kt`) lists, opens and removes them and starts image downloads. Saving needs Android 10+ because WRITE_EXTERNAL_STORAGE stays blocked.
- Desktop site is per tab (`tab.desktop`): a desktop user agent plus a `width=1100` viewport, then a reload. Text size: Android `textZoom` (an Int32, so pass a number); iOS sets `-webkit-text-size-adjust` by script.
- Android edge strips (14 dp) swipe back and forward. On phones with gesture navigation the system usually takes the edge, so system Back still works.
- Settings is a stack of `Page`s. Main has categories (General, Search, Privacy & Security, Appearance), Downloads (`Library.tsx`, default export) and About. History and Bookmarks live only on Home's pager (`History`/`Bookmarks` from `Library.tsx`), not in Settings. Shared rows are in `src/ui/Rows.tsx`.

# Privacy features

- ClearURLs: `src/privacy/clearurls/clearUrls.ts` is a port of ClearURLs' algorithm. It applies redirect unwrapping, then raw rules, then removes query and fragment fields, over the official rules file `src/privacy/clearurls/rules.json` (37 KB, LGPL 3.0; refresh from https://rules2.clearurls.xyz/data.minify.json). Rules compile lazily and invalid regexes are skipped. `tidyUrl` (Settings → Remove Tracking from Links) runs on every URL Serene opens, on top-frame navigations in `onShouldStartLoadWithRequest` (`cleanNavigation` in `src/privacy/index.ts` stops redirect loops after two tries), and on Copy link, Share and Bookmark.
- Privacy Badger (Android, native): `Badger.kt` learns trackers the way Privacy Badger does. A third-party base domain (from the crate's public-suffix resolver via JNI `baseDomain`) holding an identifier-like cookie on 3 distinct sites gets blocked. It's checked once per tracker and site pair, skips a built-in list of essential infrastructure (CDNs, fonts, login, payment, captcha), and is saved to `filesDir/badger.json`. It shares the WebView request hook with the ad blocker.
- Link pipeline: `tidyUrl` runs tracking-redirect skipping, then AMP unwrapping, then ClearURLs; `navigationUrl` adds the HTTPS upgrade. Each step has its own setting (on by default).
- Tracking redirects (Android, native): `Debounce.kt` applies Brave's debounce list (`modules/shield/android/src/main/assets/adblock/debounce.json`, MPL 2.0, refreshed by `build-android.sh`) through the sync `debounce(url)` function. Rules with a `pref` (Brave's AMP rules) are skipped; a redirect must change the base domain.
- AMP (`src/privacy/amp.ts`): Google AMP, AMP-cache and Turbo Pages URLs are rewritten in JS; `AMP_SCRIPT` posts `amp` with the canonical link from real AMP pages, and `leaveAmp` allows one hop per URL per 30 s.
- HTTPS upgrade (`src/privacy/https.ts`): top-level `http://` loads become `https://` except dotless, local and IP hosts, explicit ports and `https: false` sites. An https→http bounce within 5 s marks the host plain for the session. A failed upgraded load shows "No secure version" with Continue to HTTP, which saves `https: false`.
- Third-party cookies (Android): `thirdPartyCookiesEnabled` is off unless Settings → Block Third-Party Cookies is off or the site has `cookies: false`. iOS blocks them by default.
- Safe Browsing stays on and isn't a setting: the shield manifest sets `EnableSafeBrowsing`, `ShieldModule` calls `WebView.startSafeBrowsing` at launch so cold-start links are checked, top-frame `data:` navigations are refused, and the webview patch asks before downloading APKs and other executables (WebView doesn't scan downloads).
- Global Privacy Control: `Sec-GPC: 1` and `DNT: 1` headers on pages Serene loads itself (WebView only lets apps set headers on the top-level load), plus `navigator.globalPrivacyControl` and `doNotTrack` injected before content loads.

# Size and memory

- One WebView at a time: only the active tab is mounted; other tabs are URLs plus a small thumbnail.
- Use `Animated` with the native driver and `PanResponder`; no Reanimated or gesture-handler.
- Don't add UI kits, Redux, lodash, date libraries, AsyncStorage, MMKV, Lottie, or any analytics, crash-reporting or ad SDK. Ask before adding any dependency and report its KB cost.
- Android JS bundle is about 1.23 MB (1,229,876 bytes on 2026-11-14); keep it under 1.2 MB.
- Tabs auto-archive (close) after the chosen time unless pinned; there is no archive list. Saved pages live on Home (History and Bookmarks pages) and in Settings → Downloads.
- No haptics anywhere; don't add expo-haptics back.
- Android only: the app registers as a browser for http/https links (`intentFilters`); `App.tsx` opens incoming links as new tabs.

# Privacy

- No backend, accounts or analytics. The app's own requests are only search suggestions (toggle in Settings, sent to the chosen engine).
- Never log page URLs or typed text. `console.*` is stripped in production.

## Development assistance

This project is human-directed and maintained. AI tools may be used for development assistance, such as research, drafting, implementation support, and review; they are not project authors or contributors. Do not commit local tool configuration, session data, generated analysis, or workflow artifacts.
