package expo.modules.shield

import android.webkit.JavascriptInterface
import android.webkit.WebView
import java.lang.ref.WeakReference

class ShieldBridge(view: WebView) {
  private val view = WeakReference(view)

  private fun top(href: String): String = view.get()?.let { AdblockService.pageOf(it) } ?: href

  @JavascriptInterface
  fun rules(href: String): String = AdblockService.pageRules(href, top(href))

  @JavascriptInterface
  fun generic(href: String, classes: String, ids: String): String = AdblockService.genericSelectors(href, top(href), classes, ids)

  @JavascriptInterface
  fun blocked(href: String, items: String): String = AdblockService.blockedIndices(top(href), items)

  @JavascriptInterface
  fun farble(top: String, frame: String): String = Farble.config(view.get(), top, frame)

  @JavascriptInterface
  fun noise(top: String, digest: String): String = Farble.noise(top, digest)
}
