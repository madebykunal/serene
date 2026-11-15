use adblock::lists::{FilterSet, ParseOptions};
use adblock::request::Request;
use adblock::resources::{MimeType, PermissionMask, Resource, ResourceType};
use adblock::Engine;
use base64::{engine::Engine as _, prelude::BASE64_STANDARD};

pub fn base_domain(host: &str) -> String {
    adblock::url_parser::parse_url(&format!("https://{host}/"))
        .map(|u| u.domain().to_string())
        .unwrap_or_else(|| host.to_string())
}

// Scriptlets run from the content script's own library; the engine only reports which to call.
// (canonical name, aliases)
const SCRIPTLETS: &[(&str, &[&str])] = &[
    ("set-constant", &["set", "trusted-set", "trusted-set-constant"]),
    ("abort-on-property-read", &["aopr"]),
    ("abort-on-property-write", &["aopw"]),
    ("abort-current-script", &["acs", "abort-current-inline-script", "acis"]),
    ("abort-on-stack-trace", &["aost"]),
    ("addEventListener-defuser", &["aeld", "prevent-addEventListener"]),
    ("no-setTimeout-if", &["nostif", "prevent-setTimeout", "setTimeout-defuser"]),
    ("no-setInterval-if", &["nosiif", "prevent-setInterval", "setInterval-defuser"]),
    ("adjust-setTimeout", &["nano-stb", "nano-setTimeout-booster"]),
    ("adjust-setInterval", &["nano-sib", "nano-setInterval-booster"]),
    ("no-requestAnimationFrame-if", &["norafif", "prevent-requestAnimationFrame"]),
    ("noeval-if", &["noeval", "silent-noeval", "prevent-eval-if"]),
    ("window.open-defuser", &["nowoif", "no-window-open-if", "prevent-window-open"]),
    ("remove-attr", &["ra"]),
    ("remove-class", &["rc"]),
    ("set-attr", &["trusted-set-attr"]),
    ("remove-node-text", &["rmnt"]),
    ("replace-node-text", &["rpnt", "trusted-replace-node-text", "trusted-rpnt"]),
    ("json-prune", &[]),
    ("json-prune-fetch-response", &[]),
    ("json-prune-xhr-response", &[]),
    ("no-fetch-if", &["prevent-fetch", "trusted-prevent-fetch"]),
    ("no-xhr-if", &["prevent-xhr", "trusted-prevent-xhr"]),
    ("trusted-replace-fetch-response", &["trusted-rpfr"]),
    ("trusted-replace-xhr-response", &[]),
    ("set-cookie", &[]),
    ("trusted-set-cookie", &[]),
    ("trusted-set-cookie-reload", &["set-cookie-reload"]),
    ("remove-cookie", &["cookie-remover"]),
    ("set-local-storage-item", &["trusted-set-local-storage-item"]),
    ("set-session-storage-item", &["trusted-set-session-storage-item"]),
    ("trusted-click-element", &[]),
    ("href-sanitizer", &[]),
    ("nowebrtc", &[]),
    ("nofab", &["fuckadblock.js-3.2.0"]),
    ("refresh-defuser", &["prevent-refresh"]),
    ("disable-newtab-links", &[]),
    ("serene-ad-skip", &[]),
];

// uBO procedural operators the engine leaves inside plain selectors; the content script runs them.
const PROCEDURAL: &[&str] = &[
    ":has-text(", ":-abp-contains(", ":contains(", ":upward(", ":nth-ancestor(", ":matches-css(", ":matches-css-before(",
    ":matches-css-after(", ":xpath(", ":min-text-length(", ":matches-attr(", ":matches-path(", ":matches-media(",
    ":matches-prop(", ":-abp-has(", ":if(", ":if-not(", ":others(", ":watch-attr(", ":remove(", ":style(", ":remove-attr(",
    ":remove-class(",
];

// Age gates must stay usable: hiding one leaves adult sites locked behind an invisible wall.
const AGE_GATE: &[&str] = &[
    "age-gate", "agegate", "age_gate", "age-verif", "ageverif", "age_verif", "age-check", "agecheck", "age_check",
    "age-confirm", "ageconfirm", "age_confirm", "age-warning", "agewarning", "age-popup", "agepopup", "age-modal",
    "agemodal", "age-overlay", "age-wall", "agewall", "age-restrict", "age-disclaimer", "age-consent", "agecookie",
    "over18", "over-18", "over_18", "18plus", "18-plus", "plus18", "adult-warning", "adultwarning", "adult-content",
    "adult-check", "adult-confirm", "adult-disclaimer", "adult-verif", "adult-and", "adult_warning", "enter-site",
    "entersite", "enter_site", "disclaimer", "parental", "mature-content", "legal-age", "18+", "i am 18", "i'm 18",
    "over 18", "18 years", "years of age", "age verification", "verify your age", "confirm your age", "adult content",
];

fn is_age_gate(sel: &str) -> bool {
    let lower = sel.to_ascii_lowercase();
    AGE_GATE.iter().any(|m| lower.contains(m))
}

fn is_procedural(sel: &str) -> bool {
    PROCEDURAL.iter().any(|m| sel.contains(m))
}

// Surrogates served for `$redirect` rules so pages keep working without the real ad scripts.
const SURROGATES: &[(&str, &[&str], &str, &str)] = &[
    ("noop.js", &["noopjs", "abp-resource:blank-js"], "application/javascript", "(function(){})();"),
    ("noop.txt", &["nooptext"], "text/plain", ""),
    ("noop.html", &["noopframe"], "text/html", "<!DOCTYPE html><html><head></head><body></body></html>"),
    ("noop.json", &["noopjson"], "application/json", "{}"),
    ("googletagservices_gpt.js", &["googletagservices.com/gpt.js"], "application/javascript", include_str!("../resources/gpt.js")),
    ("googlesyndication_adsbygoogle.js", &["googlesyndication.com/adsbygoogle.js"], "application/javascript", include_str!("../resources/adsbygoogle.js")),
    ("google-analytics_analytics.js", &["google-analytics.com/analytics.js", "google-analytics_ga.js", "google-analytics.com/ga.js"], "application/javascript", include_str!("../resources/analytics.js")),
    ("googletagmanager_gtm.js", &["googletagmanager.com/gtm.js"], "application/javascript", include_str!("../resources/gtm.js")),
    ("google-ima.js", &["google-ima3"], "application/javascript", include_str!("../resources/ima.js")),
    ("amazon_apstag.js", &["amazon-adsystem.com/aax2/amzn_ads.js"], "application/javascript", include_str!("../resources/apstag.js")),
];

// Blocked SDKs that pages wait on get a stand-in even without an explicit `$redirect` rule.
const AUTO_SURROGATES: &[(&str, &str)] = &[
    ("imasdk.googleapis.com/js/sdkloader/ima3", "google-ima.js"),
    ("/tag/js/gpt.js", "googletagservices_gpt.js"),
    ("googletagservices.com/tag/js/gpt", "googletagservices_gpt.js"),
    ("/pagead/js/adsbygoogle.js", "googlesyndication_adsbygoogle.js"),
    ("google-analytics.com/analytics.js", "google-analytics_analytics.js"),
    ("google-analytics.com/ga.js", "google-analytics_analytics.js"),
    ("googletagmanager.com/gtm.js", "googletagmanager_gtm.js"),
    ("amazon-adsystem.com/aax2/apstag.js", "amazon_apstag.js"),
];

fn surrogate(url: &str) -> Option<String> {
    let name = AUTO_SURROGATES.iter().find(|(needle, _)| url.contains(needle))?.1;
    let (_, _, mime, body) = SURROGATES.iter().find(|(n, ..)| *n == name)?;
    Some(format!("data:{mime};base64,{}", BASE64_STANDARD.encode(body)))
}

const GIF_1X1: &str = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const PNG_2X2: &str = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAC0lEQVQI12NgQAcAABIAAe+JVKQAAAAASUVORK5CYII=";

fn fn_name(name: &str) -> String {
    name.replace(['-', '.'], "_")
}

fn resource(name: &str, aliases: &[&str], mime: &str, b64: String) -> Resource {
    Resource {
        name: name.to_string(),
        aliases: aliases.iter().map(|a| a.to_string()).collect(),
        kind: ResourceType::Mime(MimeType::from(mime)),
        content: b64,
        dependencies: vec![],
        permission: PermissionMask::default(),
    }
}

fn resources() -> Vec<Resource> {
    let mut out = Vec::new();
    for (name, aliases) in SCRIPTLETS {
        let names: Vec<String> = aliases.iter().map(|a| format!("{a}.js")).collect();
        let refs: Vec<&str> = names.iter().map(String::as_str).collect();
        let body = format!("function {}() {{}}", fn_name(name));
        out.push(resource(&format!("{name}.js"), &refs, "application/javascript", BASE64_STANDARD.encode(body)));
    }
    for (name, aliases, mime, body) in SURROGATES {
        out.push(resource(name, aliases, mime, BASE64_STANDARD.encode(body)));
    }
    out.push(resource("1x1.gif", &["1x1-transparent.gif"], "image/gif", GIF_1X1.to_string()));
    out.push(resource("2x2.png", &["2x2-transparent.png", "3x2.png", "3x2-transparent.png", "32x32.png", "32x32-transparent.png"], "image/png", PNG_2X2.to_string()));
    out
}

fn json_str(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    out.push('"');
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 || c == '\u{2028}' || c == '\u{2029}' => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

// Turns the engine's `try {\nname("a", "b")\n} catch ( e ) { }` blocks into `[["name","a","b"]]`.
fn scriptlet_calls(script: &str) -> String {
    let mut calls = Vec::new();
    for block in script.split("try {\n").skip(1) {
        let Some(end) = block.find("\n} catch ( e ) { }") else { continue };
        let call = &block[..end];
        let (Some(open), true) = (call.find('('), call.ends_with(')')) else { continue };
        let name = &call[..open];
        let args = call[open + 1..call.len() - 1].trim();
        if args.is_empty() {
            calls.push(format!("[{}]", json_str(name)));
        } else {
            calls.push(format!("[{},{}]", json_str(name), args));
        }
    }
    format!("[{}]", calls.join(","))
}

pub struct Shield {
    engine: Engine,
}

impl Shield {
    pub fn from_lists<I: IntoIterator<Item = String>>(lists: I) -> Self {
        let mut set = FilterSet::new(false);
        for list in lists {
            set.add_filter_list(list, ParseOptions::default());
        }
        let mut engine = Engine::new_with_filter_set(set);
        engine.use_resources(resources());
        Shield { engine }
    }

    pub fn from_bytes(bytes: &[u8]) -> Option<Self> {
        let mut engine = Engine::default();
        engine.deserialize(bytes).ok()?;
        engine.use_resources(resources());
        Some(Shield { engine })
    }

    pub fn to_bytes(&self) -> Vec<u8> {
        self.engine.serialize()
    }

    /// "" to allow, "b" to block, or a `data:` URL to serve instead.
    pub fn check(&self, url: &str, source_url: &str, request_type: &str) -> String {
        let Ok(req) = Request::new(url, source_url, request_type, "GET") else { return String::new() };
        let res = self.engine.check_network_request(&req);
        if !res.should_block() {
            return String::new();
        }
        res.redirect
            .or_else(|| if request_type == "script" { surrogate(url) } else { None })
            .unwrap_or_else(|| "b".to_string())
    }

    pub fn should_block(&self, url: &str, source_url: &str, request_type: &str) -> bool {
        !self.check(url, source_url, request_type).is_empty()
    }

    pub fn page_rules(&self, url: &str) -> String {
        let res = self.engine.url_cosmetic_resources(url);
        let mut css = String::new();
        let mut pro = Vec::new();
        for sel in &res.hide_selectors {
            if is_age_gate(sel) {
                continue;
            }
            if is_procedural(sel) {
                pro.push(json_str(sel));
            } else if !sel.contains('{') && !sel.contains('}') {
                css.push_str(sel);
                css.push_str("{display:none!important}\n");
            }
        }
        let proc: Vec<&str> = res.procedural_actions.iter().map(String::as_str).filter(|p| !is_age_gate(p)).collect();
        format!(
            "{{\"css\":{},\"js\":{},\"proc\":[{}],\"pro\":[{}],\"generic\":{}}}",
            json_str(&css),
            scriptlet_calls(&res.injected_script),
            proc.join(","),
            pro.join(","),
            !res.generichide
        )
    }

    pub fn cosmetic_css(&self, url: &str) -> String {
        let res = self.engine.url_cosmetic_resources(url);
        res.hide_selectors
            .iter()
            .filter(|s| !s.contains('{') && !s.contains('}'))
            .map(|s| format!("{s}{{display:none!important}}\n"))
            .collect()
    }

    /// Generic hiding rules for the classes and ids seen on a page, one selector per line.
    pub fn generic_selectors(&self, url: &str, classes: &str, ids: &str) -> String {
        let res = self.engine.url_cosmetic_resources(url);
        if res.generichide {
            return String::new();
        }
        let classes = classes.split('\n').filter(|s| !s.is_empty());
        let ids = ids.split('\n').filter(|s| !s.is_empty());
        self.engine
            .hidden_class_id_selectors(classes, ids, &res.exceptions)
            .into_iter()
            .filter(|s| !s.contains('{') && !s.contains('}') && !is_age_gate(s))
            .collect::<Vec<_>>()
            .join("\n")
    }
}

#[cfg(target_os = "android")]
mod android {
    use super::Shield;
    use jni::objects::{JByteArray, JClass, JString};
    use jni::sys::{jbyteArray, jlong, jstring};
    use jni::JNIEnv;

    fn shield<'a>(ptr: jlong) -> Option<&'a Shield> {
        if ptr == 0 {
            None
        } else {
            Some(unsafe { &*(ptr as *const Shield) })
        }
    }

    fn text(env: &mut JNIEnv, s: &JString) -> String {
        env.get_string(s).map(|s| s.into()).unwrap_or_default()
    }

    fn out(env: &JNIEnv, s: String) -> jstring {
        env.new_string(s).map(|s| s.into_raw()).unwrap_or(std::ptr::null_mut())
    }

    #[no_mangle]
    pub extern "system" fn Java_expo_modules_shield_AdblockNative_create<'l>(
        mut env: JNIEnv<'l>,
        _class: JClass<'l>,
        rules: JString<'l>,
    ) -> jlong {
        let rules = text(&mut env, &rules);
        Box::into_raw(Box::new(Shield::from_lists([rules]))) as jlong
    }

    #[no_mangle]
    pub extern "system" fn Java_expo_modules_shield_AdblockNative_deserialize<'l>(
        env: JNIEnv<'l>,
        _class: JClass<'l>,
        data: JByteArray<'l>,
    ) -> jlong {
        let bytes = match env.convert_byte_array(&data) {
            Ok(b) => b,
            Err(_) => return 0,
        };
        match Shield::from_bytes(&bytes) {
            Some(s) => Box::into_raw(Box::new(s)) as jlong,
            None => 0,
        }
    }

    #[no_mangle]
    pub extern "system" fn Java_expo_modules_shield_AdblockNative_serialize<'l>(
        env: JNIEnv<'l>,
        _class: JClass<'l>,
        ptr: jlong,
    ) -> jbyteArray {
        let bytes = shield(ptr).map(|s| s.to_bytes()).unwrap_or_default();
        env.byte_array_from_slice(&bytes).map(|a| a.into_raw()).unwrap_or(std::ptr::null_mut())
    }

    #[no_mangle]
    pub extern "system" fn Java_expo_modules_shield_AdblockNative_check<'l>(
        mut env: JNIEnv<'l>,
        _class: JClass<'l>,
        ptr: jlong,
        url: JString<'l>,
        source: JString<'l>,
        kind: JString<'l>,
    ) -> jstring {
        let Some(s) = shield(ptr) else { return out(&env, String::new()) };
        let url = text(&mut env, &url);
        let source = text(&mut env, &source);
        let kind = text(&mut env, &kind);
        let res = s.check(&url, &source, &kind);
        out(&env, res)
    }

    #[no_mangle]
    pub extern "system" fn Java_expo_modules_shield_AdblockNative_pageRules<'l>(
        mut env: JNIEnv<'l>,
        _class: JClass<'l>,
        ptr: jlong,
        url: JString<'l>,
    ) -> jstring {
        let url = text(&mut env, &url);
        let rules = shield(ptr).map(|s| s.page_rules(&url)).unwrap_or_default();
        out(&env, rules)
    }

    #[no_mangle]
    pub extern "system" fn Java_expo_modules_shield_AdblockNative_genericSelectors<'l>(
        mut env: JNIEnv<'l>,
        _class: JClass<'l>,
        ptr: jlong,
        url: JString<'l>,
        classes: JString<'l>,
        ids: JString<'l>,
    ) -> jstring {
        let url = text(&mut env, &url);
        let classes = text(&mut env, &classes);
        let ids = text(&mut env, &ids);
        let sels = shield(ptr).map(|s| s.generic_selectors(&url, &classes, &ids)).unwrap_or_default();
        out(&env, sels)
    }

    #[no_mangle]
    pub extern "system" fn Java_expo_modules_shield_AdblockNative_baseDomain<'l>(
        mut env: JNIEnv<'l>,
        _class: JClass<'l>,
        host: JString<'l>,
    ) -> jstring {
        let base = super::base_domain(&text(&mut env, &host));
        out(&env, base)
    }

    #[no_mangle]
    pub extern "system" fn Java_expo_modules_shield_AdblockNative_destroy<'l>(
        _env: JNIEnv<'l>,
        _class: JClass<'l>,
        ptr: jlong,
    ) {
        if ptr != 0 {
            drop(unsafe { Box::from_raw(ptr as *mut Shield) });
        }
    }
}

#[cfg(test)]
mod tests {
    use super::Shield;

    #[test]
    fn base_domains() {
        assert_eq!(super::base_domain("news.bbc.co.uk"), "bbc.co.uk");
        assert_eq!(super::base_domain("pagead2.googlesyndication.com"), "googlesyndication.com");
        assert_eq!(super::base_domain("a.b.example.github.io"), "example.github.io");
        assert_eq!(super::base_domain("localhost"), "localhost");
    }

    #[test]
    fn blocks_and_allows() {
        let s = Shield::from_lists([String::from(
            "||ads.example.com^\n||tracker.net^$third-party\n@@||ads.example.com/ok.js\nexample.org##.banner-ad",
        )]);
        assert!(s.should_block("https://ads.example.com/x.js", "https://news.com/", "script"));
        assert!(!s.should_block("https://ads.example.com/ok.js", "https://news.com/", "script"));
        assert!(s.should_block("https://tracker.net/p.gif", "https://news.com/", "image"));
        assert!(!s.should_block("https://tracker.net/p.gif", "https://tracker.net/", "image"));
        assert!(!s.should_block("https://news.com/app.js", "https://news.com/", "script"));
        assert!(s.cosmetic_css("https://example.org/page").contains(".banner-ad{display:none!important}"));

        let again = Shield::from_bytes(&s.to_bytes()).expect("round trip");
        assert!(again.should_block("https://ads.example.com/x.js", "https://news.com/", "script"));
    }

    #[test]
    fn redirects_to_surrogates() {
        let s = Shield::from_lists([String::from(
            "||securepubads.g.doubleclick.net/tag/js/gpt.js$script,redirect=googletagservices_gpt.js\n||imasdk.googleapis.com/js/sdkloader/ima3.js$script,redirect=google-ima.js\n||pixel.example^$image,redirect=1x1.gif",
        )]);
        let gpt = s.check("https://securepubads.g.doubleclick.net/tag/js/gpt.js", "https://news.com/", "script");
        assert!(gpt.starts_with("data:application/javascript;base64,"), "{gpt}");
        assert!(s.check("https://imasdk.googleapis.com/js/sdkloader/ima3.js", "https://news.com/", "script").starts_with("data:application/javascript"));
        assert!(s.check("https://pixel.example/p", "https://news.com/", "image").starts_with("data:image/gif"));
        assert_eq!(s.check("https://news.com/a.js", "https://news.com/", "script"), "");
        let auto = Shield::from_lists([String::from("||imasdk.googleapis.com^\n||ads.example^")]);
        assert!(auto.check("https://imasdk.googleapis.com/js/sdkloader/ima3_dai.js", "https://news.com/", "script").starts_with("data:application/javascript"));
        assert_eq!(auto.check("https://ads.example/x.js", "https://news.com/", "script"), "b");
    }

    #[test]
    fn page_rules_and_scriptlets() {
        let s = Shield::from_lists([String::from(
            "youtube.com##+js(json-prune, playerResponse.adPlacements playerResponse.playerAds, , \"q\\\\x\")\nyoutube.com##+js(set, ytInitialPlayerResponse.adSlots, undefined)\nexample.org##+js(nowoif)\nexample.org##.ad\nexample.org##.cookie:has-text(Accept)\n##.generic-ad\n###banner_ad\nnogeneric.org#@#.generic-ad",
        )]);
        let yt = s.page_rules("https://m.youtube.com/watch?v=1");
        assert!(yt.contains("[\"json_prune\",\"playerResponse.adPlacements playerResponse.playerAds\", \"\""), "{yt}");
        assert!(yt.contains("[\"set_constant\",\"ytInitialPlayerResponse.adSlots\", \"undefined\"]"), "{yt}");
        let ex = s.page_rules("https://example.org/");
        assert!(ex.contains("[\"window_open_defuser\"]"), "{ex}");
        assert!(ex.contains(".ad{display:none!important}"), "{ex}");
        assert!(ex.contains("\"pro\":[\".cookie:has-text(Accept)\"]"), "{ex}");
        assert!(!ex.contains("has-text(Accept){"), "{ex}");
        assert!(ex.contains("\"generic\":true"), "{ex}");
        let g = s.generic_selectors("https://news.com/", "generic-ad\nother", "banner_ad");
        assert!(g.contains(".generic-ad") && g.contains("#banner_ad"), "{g}");
        assert!(!s.generic_selectors("https://nogeneric.org/", "generic-ad", "").contains(".generic-ad"));

        let gate = Shield::from_lists([String::from("###cookieAgeCheck\n##.agegate-cookie\nadult.example##.modal:has-text(I am 18 or older)\nadult.example##.age-verification\nadult.example##.ad-box")]);
        let rules = gate.page_rules("https://adult.example/");
        assert!(!rules.contains("age-verification") && !rules.contains("I am 18") && rules.contains(".ad-box"), "{rules}");
        assert!(gate.generic_selectors("https://adult.example/", "agegate-cookie", "cookieAgeCheck").is_empty());
    }
}
