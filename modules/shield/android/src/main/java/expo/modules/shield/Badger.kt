package expo.modules.shield

import android.content.Context
import android.webkit.CookieManager
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

object Badger {
  private const val THRESHOLD = 3
  private val SAFE = setOf(
    "googleapis.com", "gstatic.com", "google.com", "youtube.com", "ytimg.com", "ggpht.com", "googleusercontent.com",
    "cloudflare.com", "cloudflare.net", "jsdelivr.net", "unpkg.com", "cdnjs.com", "bootstrapcdn.com", "jquery.com",
    "akamaihd.net", "akamaized.net", "akamai.net", "fastly.net", "fastly.com", "cloudfront.net", "amazonaws.com",
    "azureedge.net", "azurefd.net", "windows.net", "apple.com", "icloud.com", "microsoft.com", "microsoftonline.com",
    "live.com", "recaptcha.net", "hcaptcha.com", "challenges.cloudflare.com", "stripe.com", "stripe.network",
    "paypal.com", "paypalobjects.com", "gravatar.com", "wp.com", "wordpress.com", "github.com", "githubusercontent.com",
    "githubassets.com", "fbcdn.net", "twimg.com", "redditstatic.com", "redditmedia.com", "duckduckgo.com",
    "wikimedia.org", "wikipedia.org", "vimeocdn.com", "jwplayer.com", "typekit.net", "fonts.net", "shopify.com",
    "shopifycdn.com", "squarespace.com", "wixstatic.com", "okta.com", "auth0.com", "appleid.cdn-apple.com",
  )
  private val IGNORED_COOKIES = Regex(
    "^(__cf_bm|cf_clearance|_cfuvid|__cfruid|cookieconsent.*|.*consent.*|euconsent.*|lang|language|locale|tz|timezone|theme|csrf.*|xsrf.*)$",
    RegexOption.IGNORE_CASE,
  )

  @Volatile var enabled = true
  private val sites = ConcurrentHashMap<String, MutableSet<String>>()
  private val blocked: MutableSet<String> = ConcurrentHashMap.newKeySet()
  private val checked: MutableSet<String> = ConcurrentHashMap.newKeySet()
  private val bases = ConcurrentHashMap<String, String>()
  private val io = Executors.newSingleThreadScheduledExecutor { r -> Thread(r, "badger").apply { priority = Thread.MIN_PRIORITY } }
  private val savePending = AtomicBoolean(false)
  @Volatile private var file: File? = null

  val learned: Int
    get() = blocked.size

  fun start(context: Context) {
    val f = File(context.filesDir, "badger.json")
    file = f
    io.execute {
      try {
        if (!f.exists()) return@execute
        val json = JSONObject(f.readText())
        json.optJSONArray("blocked")?.let { arr -> for (i in 0 until arr.length()) blocked.add(arr.getString(i)) }
        json.optJSONObject("sites")?.let { obj ->
          for (key in obj.keys()) {
            val arr = obj.getJSONArray(key)
            val set: MutableSet<String> = ConcurrentHashMap.newKeySet()
            for (i in 0 until arr.length()) set.add(arr.getString(i))
            sites[key] = set
          }
        }
      } catch (_: Throwable) {
      }
    }
  }

  fun base(host: String): String {
    bases[host]?.let { return it }
    val b = try {
      AdblockNative.baseDomain(host)
    } catch (_: Throwable) {
      host
    }
    if (bases.size > 4000) bases.clear()
    bases[host] = b
    return b
  }

  fun shouldBlock(requestHost: String, pageHost: String): Boolean {
    if (!enabled) return false
    val tracker = base(requestHost)
    val site = base(pageHost)
    if (tracker == site || tracker in SAFE || requestHost in SAFE) return false
    if (tracker in blocked) return true
    if (checked.add("$tracker|$site")) {
      if (checked.size > 20000) checked.clear()
      if (hasIdentifierCookie(requestHost)) learn(tracker, site)
    }
    return false
  }

  fun reset() {
    sites.clear()
    blocked.clear()
    checked.clear()
    scheduleSave()
  }

  private fun learn(tracker: String, site: String) {
    val set = sites.getOrPut(tracker) { ConcurrentHashMap.newKeySet() }
    if (set.size >= THRESHOLD) return
    set.add(site)
    if (set.size >= THRESHOLD) blocked.add(tracker)
    scheduleSave()
  }

  private fun hasIdentifierCookie(host: String): Boolean {
    val raw = try {
      CookieManager.getInstance().getCookie("https://$host/")
    } catch (_: Throwable) {
      null
    } ?: return false
    return raw.split(';').any { part ->
      val i = part.indexOf('=')
      if (i <= 0) return@any false
      val name = part.substring(0, i).trim()
      val value = part.substring(i + 1).trim().trim('"')
      if (IGNORED_COOKIES.matches(name)) return@any false
      looksLikeId(value)
    }
  }

  private fun looksLikeId(v: String): Boolean {
    if (v.length < 10) return false
    if (v.equals("true", true) || v.equals("false", true)) return false
    val distinct = v.toSet().size
    val hasDigit = v.any { it.isDigit() }
    val hasLetter = v.any { it.isLetter() }
    return distinct >= 8 && (hasDigit && hasLetter || v.length >= 20)
  }

  private fun scheduleSave() {
    if (!savePending.compareAndSet(false, true)) return
    io.schedule({
      savePending.set(false)
      val f = file ?: return@schedule
      try {
        val json = JSONObject()
        json.put("blocked", JSONArray(blocked.toList()))
        val obj = JSONObject()
        for ((k, v) in sites) obj.put(k, JSONArray(v.toList()))
        json.put("sites", obj)
        val tmp = File(f.parentFile, "badger.tmp")
        tmp.writeText(json.toString())
        tmp.renameTo(f)
      } catch (_: Throwable) {
      }
    }, 5, TimeUnit.SECONDS)
  }
}
