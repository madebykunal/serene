package expo.modules.shield

import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.webkit.ServiceWorkerClient
import android.webkit.ServiceWorkerController
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import java.io.ByteArrayInputStream
import java.io.File
import java.security.SecureRandom
import java.util.Collections
import java.util.WeakHashMap
import java.util.concurrent.atomic.AtomicBoolean
import java.util.function.BiFunction

object AdblockService {
  private const val ENGINE_FORMAT = "shield-2-adblock-0.13.5"
  private val LISTS = listOf(
    "easylist.txt", "easyprivacy.txt", "fanboy-annoyance.txt", "ubo-filters.txt", "ubo-quick-fixes.txt", "ubo-privacy.txt",
    "ubo-unbreak.txt", "ubo-cookies.txt", "ubo-annoyances.txt", "brave-specific.txt", "brave-unbreak.txt", "serene.txt",
  )
  private val IMAGE = Regex("\\.(png|jpe?g|gif|webp|avif|svg|ico|bmp)$")
  private val FONT = Regex("\\.(woff2?|ttf|otf|eot)$")
  private val MEDIA = Regex("\\.(mp4|webm|m3u8|mpd|ts|mp3|m4a|ogg)$")
  private val GIF = Base64.decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", Base64.DEFAULT)

  @Volatile var enabled = true
  @Volatile var exempt: Set<String> = emptySet()
  @Volatile private var ptr = 0L
  @Volatile private var lastPage: String? = null
  private val started = AtomicBoolean(false)
  private val pages: MutableMap<WebView, String> = Collections.synchronizedMap(WeakHashMap())
  private val bridgeName = "_" + ByteArray(6).also { SecureRandom().nextBytes(it) }.joinToString("") { "%02x".format(it) }
  @Volatile private var content: String? = null

  fun start(context: Context) {
    if (!started.compareAndSet(false, true)) return
    val app = context.applicationContext
    Farble.start(app)
    installHooks(app)
    Badger.start(app)
    Thread({ load(app) }, "shield").apply {
      priority = Thread.MIN_PRIORITY
      start()
    }
  }

  fun pageOf(view: WebView): String? = pages[view]

  private fun active(top: String): Long {
    val p = ptr
    if (p == 0L || !enabled) return 0L
    val host = Uri.parse(top).host ?: return p
    return if (isExempt(host)) 0L else p
  }

  fun pageRules(href: String, top: String): String {
    val p = active(top)
    if (p == 0L) return ""
    return try {
      AdblockNative.pageRules(p, href)
    } catch (_: Throwable) {
      ""
    }
  }

  fun genericSelectors(href: String, top: String, classes: String, ids: String): String {
    val p = active(top)
    if (p == 0L) return ""
    return try {
      AdblockNative.genericSelectors(p, href, classes, ids)
    } catch (_: Throwable) {
      ""
    }
  }

  fun blockedIndices(top: String, items: String): String {
    val p = active(top)
    if (p == 0L || items.isEmpty()) return ""
    val hits = ArrayList<Int>()
    items.split('\n').forEachIndexed { i, line ->
      val tab = line.indexOf('\t')
      if (tab <= 0) return@forEachIndexed
      val url = line.substring(tab + 1)
      if (!url.startsWith("http")) return@forEachIndexed
      val blocked = try {
        AdblockNative.check(p, url, top, line.substring(0, tab)).isNotEmpty()
      } catch (_: Throwable) {
        false
      }
      if (blocked) hits.add(i)
    }
    return hits.joinToString(",")
  }

  private fun cacheKey(context: Context): String {
    val updated = try {
      context.packageManager.getPackageInfo(context.packageName, 0).lastUpdateTime
    } catch (_: Throwable) {
      0L
    }
    return "$ENGINE_FORMAT-$updated"
  }

  private fun load(context: Context) {
    try {
      val key = cacheKey(context)
      val cache = File(context.filesDir, "adblock-$key.dat")
      var p = 0L
      if (cache.exists()) p = AdblockNative.deserialize(cache.readBytes())
      if (p == 0L) {
        val rules = StringBuilder()
        LISTS.forEach { name ->
          try {
            context.assets.open("adblock/$name").bufferedReader().use { rules.append(it.readText()).append('\n') }
          } catch (_: Throwable) {
          }
        }
        p = AdblockNative.create(rules.toString())
        context.filesDir.listFiles { f -> f.name.startsWith("adblock-") }?.forEach { it.delete() }
        val tmp = File(context.filesDir, "adblock-$key.tmp")
        tmp.writeBytes(AdblockNative.serialize(p))
        tmp.renameTo(cache)
      }
      ptr = p
    } catch (_: Throwable) {
    }
  }

  private fun contentScript(context: Context): String? {
    content?.let { return it }
    return try {
      val read = { name: String -> context.assets.open(name).bufferedReader().use { it.readText() } }
      (read("shield/farble.js") + "\n" + read("shield/content.js"))
        .replace("__BRIDGE__", bridgeName)
        .also { content = it }
    } catch (_: Throwable) {
      null
    }
  }

  private fun installHooks(context: Context) {
    try {
      val client = Class.forName("com.reactnativecommunity.webview.RNCWebViewClient")
      client.getField("requestHook").set(null, BiFunction<WebView, WebResourceRequest, WebResourceResponse?> { view, req -> intercept(view, req) })
      client.getField("viewHook").set(null, java.util.function.Function<WebView, String?> { view ->
        view.addJavascriptInterface(ShieldBridge(view), bridgeName)
        contentScript(context)
      })
    } catch (_: Throwable) {
    }
    if (Build.VERSION.SDK_INT >= 24) {
      Handler(Looper.getMainLooper()).post {
        try {
          ServiceWorkerController.getInstance().setServiceWorkerClient(object : ServiceWorkerClient() {
            override fun shouldInterceptRequest(request: WebResourceRequest): WebResourceResponse? = interceptWorker(request)
          })
        } catch (_: Throwable) {
        }
      }
    }
  }

  private fun intercept(view: WebView, req: WebResourceRequest): WebResourceResponse? {
    if (req.isForMainFrame) {
      val full = req.url.toString()
      pages[view] = full
      lastPage = full
      return null
    }
    return filter(req, pages[view] ?: return null)
  }

  private fun interceptWorker(req: WebResourceRequest): WebResourceResponse? {
    val headers = req.requestHeaders
    val source = headers["Referer"] ?: headers["referer"] ?: lastPage ?: return null
    return filter(req, source)
  }

  private fun filter(req: WebResourceRequest, source: String): WebResourceResponse? {
    val url = req.url
    val scheme = url.scheme
    if (scheme != "http" && scheme != "https") return null
    val host = url.host ?: return null
    val pageHost = Uri.parse(source).host ?: return null
    if (isExempt(pageHost)) return null
    val full = url.toString()
    val kind = typeOf(req)
    val p = ptr
    var verdict = ""
    if (enabled && p != 0L) {
      verdict = AdblockNative.check(p, full, source, kind)
      if (verdict.isEmpty() && kind == "other") verdict = AdblockNative.check(p, full, source, "xhr")
    }
    if (verdict.isEmpty() && Badger.shouldBlock(host, pageHost)) verdict = "b"
    if (verdict.isEmpty()) return null
    if (verdict.startsWith("data:")) dataResponse(verdict)?.let { return it }
    return empty(kind)
  }

  private fun dataResponse(url: String): WebResourceResponse? {
    val comma = url.indexOf(',')
    if (comma < 0) return null
    val meta = url.substring(5, comma)
    val mime = meta.substringBefore(';')
    val bytes = if (meta.endsWith(";base64")) Base64.decode(url.substring(comma + 1), Base64.DEFAULT) else url.substring(comma + 1).toByteArray()
    return WebResourceResponse(mime, "utf-8", ByteArrayInputStream(bytes)).withCors()
  }

  private fun empty(kind: String): WebResourceResponse {
    val (mime, bytes) = when (kind) {
      "image" -> "image/gif" to GIF
      "script" -> "text/javascript" to ByteArray(0)
      "stylesheet" -> "text/css" to ByteArray(0)
      "sub_frame" -> "text/html" to ByteArray(0)
      else -> "text/plain" to ByteArray(0)
    }
    return WebResourceResponse(mime, "utf-8", ByteArrayInputStream(bytes)).withCors()
  }

  private fun WebResourceResponse.withCors(): WebResourceResponse {
    responseHeaders = mapOf("Access-Control-Allow-Origin" to "*", "Cache-Control" to "no-store")
    return this
  }

  private fun isExempt(pageHost: String): Boolean {
    val list = exempt
    if (list.isEmpty()) return false
    val h = pageHost.lowercase().removePrefix("www.")
    return list.any { h == it || h.endsWith(".$it") }
  }

  private fun typeOf(req: WebResourceRequest): String {
    val headers = req.requestHeaders
    when ((headers["Sec-Fetch-Dest"] ?: headers["sec-fetch-dest"] ?: "").lowercase()) {
      "script", "worker", "sharedworker", "serviceworker" -> return "script"
      "image" -> return "image"
      "style" -> return "stylesheet"
      "font" -> return "font"
      "iframe", "frame", "embed", "object" -> return "sub_frame"
      "video", "audio", "track" -> return "media"
      "empty" -> return "xhr"
    }
    val accept = (headers["Accept"] ?: headers["accept"] ?: "").lowercase()
    val path = (req.url.path ?: "").lowercase()
    return when {
      accept.contains("text/html") -> "sub_frame"
      accept.startsWith("text/css") -> "stylesheet"
      accept.startsWith("image/") -> "image"
      path.endsWith(".js") || path.endsWith(".mjs") -> "script"
      path.endsWith(".css") -> "stylesheet"
      IMAGE.containsMatchIn(path) -> "image"
      FONT.containsMatchIn(path) -> "font"
      MEDIA.containsMatchIn(path) -> "media"
      accept.contains("application/json") || accept.contains("text/plain") -> "xhr"
      else -> "other"
    }
  }
}
