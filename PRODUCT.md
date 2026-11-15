# Product

## Platform

android

## Users

Inferred, not confirmed: people who want a quiet, private default browser on their phone for everyday searching and reading, without setting anything up. They open it from the home screen or from links in other apps, search, read a few pages, and leave.

## Product Purpose

Serene is a mobile web browser. Pages load in the device's own WebView; Serene adds a tab carousel with pinned tabs and auto-archive, a search panel with suggestions, a library (bookmarks, history, downloads), and protections that are on from the first launch. Success is a browser people make their default and stop thinking about.

## Positioning

All four are confirmed commitments:

- Calm by design: fewer pop-ups, sign-in prompts and app banners; pages feel quiet.
- Private by default: ad and tracker blocking (Brave's engine), Privacy Badger-style learning, ClearURLs link cleaning, tracking-redirect skipping, AMP skipping, HTTPS upgrade, third-party cookie blocking, GPC. No accounts, no backend, no analytics. All on with no setup.
- Light and fast: small app, one WebView at a time, quick to open.
- Tabs that tidy up: pinned sites stay; everything else archives itself after a chosen time.

## Operating Context

One-handed phone use. Opened from the launcher or as the system default browser for links from other apps (Android). Used in daylight and at night; the app has light, dark and system themes and can darken websites.

## Capabilities and Constraints

- Expo SDK 58, React Native 0.88. Runs in Expo Go for development; ad blocking, Privacy Badger, tracking-redirect skipping and downloads need the installed Android build.
- Android is the shipping target. iOS builds don't exist yet (inferred: iOS later reuses the same design rather than a separate native one).
- No UI kits, gesture or animation libraries beyond React Native's `Animated` and `PanResponder`; no icon font or SVG library; no haptics. Ask before adding any dependency. The Android JS bundle sits at the 1.2 MB budget.
- Terminology: tabs, pinned tabs, private tabs, library, bookmarks, history, downloads, site settings, protections.

## Brand Commitments

- Name: Serene. Identity values live in `brand.json`; the code never hard-codes the name.
- Official logo (supplied 2026-11-14): a deep-teal rounded square holding an "S" made of a mint river winding out of a cream sunset sky over green hills.
- Never use Arc's or Safari's logo, name or tagline.

## Evidence on Hand

- Logo artwork from the user (2026-11-14).
- Reference screenshots from the user: Safari's start page, search suggestions, tab overview and link preview menu, used as interaction references only.
- No testimonials, users, metrics or press exist; never invent them.

## Product Principles

1. Protection is the default, never a setup task.
2. Quiet over clever: every element earns its place on a small screen.
3. One hand, one thumb: primary actions live at the bottom.
4. The web page is the content; the browser chrome recedes.
5. Light in size and memory: nothing added without a reason.
