package expo.modules.shield

import android.content.Context
import android.content.res.Resources
import android.net.Uri
import android.webkit.CookieManager
import android.webkit.WebView
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.security.SecureRandom
import java.util.concurrent.ConcurrentHashMap
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import kotlin.math.max
import kotlin.math.roundToInt

object Farble {
  private val FEATURES = listOf(
    "canvas", "fonts", "rects", "webgl", "audio", "hardware", "language", "screen",
    "voices", "devices", "battery", "network", "storage", "uadata", "gpu",
  )
  private val STANDARD = mapOf(
    "canvas" to 1, "fonts" to 0, "rects" to 0, "webgl" to 1, "audio" to 1, "hardware" to 1, "language" to 1, "screen" to 1,
    "voices" to 1, "devices" to 1, "battery" to 1, "network" to 0, "storage" to 0, "uadata" to 0, "gpu" to 1,
  )
  private val GRAPHICS = mapOf("canvas" to 1, "fonts" to 0, "rects" to 0, "webgl" to 1)
  private val BOT_COOKIE = Regex("(?:^|;\\s*)(?:_abck|bm_sz|ak_bmsc|_px3|_pxhd|_pxvid|pxcts|datadome|reese84|cf_clearance|KP_UIDz(?:-ssn)?|incap_ses_\\w*|visid_incap_\\w*)=")

  @Volatile var enabled = true
  @Volatile var exempt: Set<String> = emptySet()
  @Volatile var private = false

  private val random = SecureRandom()
  @Volatile private var session = fresh()
  @Volatile private var privateKey = fresh()
  @Volatile private var stableKey = fresh()
  private val tokens = ConcurrentHashMap<String, ByteArray>()
  private val tallest = ConcurrentHashMap<Int, Int>()
  @Volatile private var keyFile: File? = null

  private var standard: List<String> = emptyList()
  private var frames: List<String> = emptyList()
  private var graphics: List<String> = emptyList()
  private var off: Map<String, List<String>> = emptyMap()

  private fun fresh() = ByteArray(32).also { random.nextBytes(it) }

  fun start(context: Context) {
    try {
      val json = JSONObject(context.assets.open("shield/farble.json").bufferedReader().use { it.readText() })
      standard = list(json.optJSONArray("standard"))
      frames = list(json.optJSONArray("frames"))
      graphics = list(json.optJSONArray("graphics"))
      val o = json.optJSONObject("off")
      off = o?.keys()?.asSequence()?.associateWith { list(o.optJSONArray(it)) } ?: emptyMap()
    } catch (_: Throwable) {
    }
    try {
      val f = File(context.filesDir, "farble.key")
      keyFile = f
      val saved = if (f.exists()) f.readBytes() else null
      if (saved != null && saved.size == 32) stableKey = saved else f.writeBytes(stableKey)
    } catch (_: Throwable) {
    }
  }

  fun reset() {
    session = fresh()
    privateKey = fresh()
    stableKey = fresh()
    tokens.clear()
    try {
      keyFile?.writeBytes(stableKey)
    } catch (_: Throwable) {
    }
  }

  fun resetPrivate() {
    privateKey = fresh()
    tokens.keys.removeAll { it.startsWith("p:") }
  }

  private fun list(a: JSONArray?): List<String> = a?.let { arr -> (0 until arr.length()).map { arr.optString(it).lowercase() } } ?: emptyList()

  private fun host(url: String): String = try {
    (Uri.parse(url).host ?: "").lowercase().removePrefix("www.")
  } catch (_: Throwable) {
    ""
  }

  private fun base(host: String): String = try {
    AdblockNative.baseDomain(host).ifEmpty { host }
  } catch (_: Throwable) {
    host
  }

  private fun matches(host: String, base: String, entries: List<String>): Boolean = entries.any { e ->
    if (e.endsWith(".*")) base.startsWith(e.dropLast(1)) else host == e || host.endsWith(".$e")
  }

  private fun exempted(host: String): Boolean {
    val list = exempt
    return list.isNotEmpty() && list.any { host == it || host.endsWith(".$it") }
  }

  private fun hmac(key: ByteArray, data: String): ByteArray =
    Mac.getInstance("HmacSHA256").run {
      init(SecretKeySpec(key, "HmacSHA256"))
      doFinal(data.toByteArray())
    }

  private fun token(topHost: String): ByteArray {
    val b = base(topHost)
    val mode = when {
      private -> "p"
      matches(topHost, b, standard) -> "s"
      else -> "n"
    }
    return tokens.getOrPut("$mode:$b") {
      hmac(
        when (mode) {
          "p" -> privateKey
          "s" -> stableKey
          else -> session
        },
        b,
      )
    }
  }

  private fun hex(bytes: ByteArray): String = bytes.joinToString("") { "%02x".format(it) }

  private fun word(b: ByteArray, i: Int): Long =
    ((b[i].toLong() and 0xff) shl 24) or ((b[i + 1].toLong() and 0xff) shl 16) or ((b[i + 2].toLong() and 0xff) shl 8) or (b[i + 3].toLong() and 0xff)

  fun config(view: WebView?, top: String, frame: String): String {
    if (!enabled) return ""
    val topHost = host(top)
    if (topHost.isEmpty() || exempted(topHost)) return ""
    val topBase = base(topHost)
    val frameHost = host(frame)
    val frameBase = if (frameHost.isEmpty()) "" else base(frameHost)

    val levels = HashMap<String, Int>()
    FEATURES.forEach { levels[it] = 2 }
    val relaxed = matches(topHost, topBase, standard) ||
      (frameHost.isNotEmpty() && (matches(frameHost, frameBase, frames) || matches(frameHost, frameBase, standard))) ||
      botCookies(top)
    if (relaxed) STANDARD.forEach { (k, v) -> levels[k] = minOf(levels[k] ?: 2, v) }
    if (matches(topHost, topBase, graphics)) GRAPHICS.forEach { (k, v) -> levels[k] = minOf(levels[k] ?: 2, v) }
    off.forEach { (feature, entries) -> if (matches(topHost, topBase, entries)) levels[feature] = 0 }

    val t = token(topHost)
    val values = hmac(t, "values")
    val r = JSONArray()
    for (i in 0 until 8) r.put(word(values, i * 4) / 4294967296.0)
    val (w, h) = size(view)
    return JSONObject()
      .put("l", JSONObject(levels as Map<*, *>))
      .put("r", r)
      .put("m", "_" + hex(hmac(t, "mark")).take(24))
      .put("w", w)
      .put("h", h)
      .toString()
  }

  fun noise(top: String, digest: String): String {
    if (!enabled || digest.length > 64) return ""
    val topHost = host(top)
    if (topHost.isEmpty()) return ""
    return hex(hmac(token(topHost), "c:$digest"))
  }

  private fun botCookies(top: String): Boolean = try {
    val c = CookieManager.getInstance().getCookie(top)
    c != null && BOT_COOKIE.containsMatchIn(c)
  } catch (_: Throwable) {
    false
  }

  private fun size(view: WebView?): Pair<Int, Int> {
    val dm = (view?.resources ?: Resources.getSystem()).displayMetrics
    val d = if (dm.density > 0f) dm.density else 1f
    var w = ((view?.width ?: 0) / d).roundToInt()
    var h = ((view?.height ?: 0) / d).roundToInt()
    if (w <= 0 || h <= 0) {
      w = (dm.widthPixels / d).roundToInt()
      h = (dm.heightPixels / d).roundToInt()
    }
    val best = max(h, tallest[w] ?: 0)
    tallest[w] = best
    return w to best
  }
}
