import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

OUT = Path(__file__).parent / "android/src/main/assets/adblock"
UBO = "https://ublockorigin.github.io/uAssets/filters/"
LISTS = {
    "easylist.txt": "https://easylist.to/easylist/easylist.txt",
    "easyprivacy.txt": "https://easylist.to/easylist/easyprivacy.txt",
    "fanboy-annoyance.txt": "https://easylist.to/easylist/fanboy-annoyance.txt",
    "ubo-filters.txt": UBO + "filters.txt",
    "ubo-quick-fixes.txt": UBO + "quick-fixes.txt",
    "ubo-privacy.txt": UBO + "privacy.txt",
    "ubo-unbreak.txt": UBO + "unbreak.txt",
    "ubo-cookies.txt": UBO + "annoyances-cookies.txt",
    "ubo-annoyances.txt": UBO + "annoyances-others.txt",
    "brave-specific.txt": "https://raw.githubusercontent.com/brave/adblock-lists/master/brave-lists/brave-specific.txt",
    "brave-unbreak.txt": "https://raw.githubusercontent.com/brave/adblock-lists/master/brave-unbreak.txt",
}
# Serene runs in Android System WebView: Chromium on a phone.
TRUE = {"env_chromium", "env_mobile", "cap_user_stylesheet", "true"}


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "list-fetch"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", "replace")


def holds(cond):
    expr = re.sub(r"[A-Za-z_][A-Za-z0-9_]*", lambda m: "True" if m.group(0) in TRUE else "False", cond)
    expr = expr.replace("&&", " and ").replace("||", " or ").replace("!", " not ")
    try:
        return bool(eval(expr, {"__builtins__": {}}))
    except Exception:
        return False


def expand(url, text, depth=0):
    out = []
    stack = []
    for line in text.splitlines():
        s = line.strip()
        if s.startswith("!#if "):
            stack.append(holds(s[5:]))
            continue
        if s.startswith("!#else"):
            if stack:
                stack[-1] = not stack[-1]
            continue
        if s.startswith("!#endif"):
            if stack:
                stack.pop()
            continue
        if not all(stack):
            continue
        if s.startswith("!#include ") and depth < 3:
            child = urllib.parse.urljoin(url, s[10:].strip())
            out.append(expand(child, fetch(child), depth + 1))
            continue
        out.append(line)
    return "\n".join(out)


def main():
    for name, url in LISTS.items():
        text = expand(url, fetch(url))
        (OUT / name).write_text(text + "\n", encoding="utf-8")
        print(f"{name}: {len(text.splitlines())} lines")


if __name__ == "__main__":
    sys.exit(main())
