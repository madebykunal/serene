package expo.modules.shield

import android.content.Context
import android.net.Uri
import android.util.Base64
import org.json.JSONArray

object Debounce {
  private class Rule(
    val include: List<Regex>,
    val exclude: List<Regex>,
    val action: String,
    val param: String,
    val scheme: String?,
    val template: String?,
  )

  @Volatile private var context: Context? = null
  @Volatile private var rules: List<Rule>? = null

  fun start(app: Context) {
    context = app
  }

  fun resolve(url: String): String? {
    var current = url
    for (i in 0 until 3) {
      current = step(current) ?: break
    }
    return if (current == url) null else current
  }

  private fun step(url: String): String? {
    val uri = Uri.parse(url)
    val scheme = uri.scheme?.lowercase() ?: return null
    if (scheme != "http" && scheme != "https") return null
    val host = uri.host?.lowercase() ?: return null
    val path = uri.encodedPath ?: "/"
    val full = "$scheme://$host$path" + (uri.encodedQuery?.let { "?$it" } ?: "")
    for (rule in loaded()) {
      if (rule.include.none { it.matches(full) } || rule.exclude.any { it.matches(full) }) continue
      val target = target(rule, uri, path) ?: continue
      if (isValid(target, host)) return target
    }
    return null
  }

  private fun target(rule: Rule, uri: Uri, path: String): String? = try {
    when (rule.action) {
      "redirect" -> uri.getQueryParameter(rule.param)
      "base64,redirect" -> uri.getQueryParameter(rule.param)?.let { decodeBase64(it) }
      "regex-path", "regex-path-template" -> {
        val groups = Regex(rule.param).matchEntire(path)?.groupValues?.drop(1)
        val template = rule.template
        when {
          groups.isNullOrEmpty() -> null
          template != null -> groups.foldIndexed(template) { i, acc, g -> acc.replace("$" + (i + 1), Uri.decode(g)) }
          rule.scheme != null -> rule.scheme + "://" + Uri.decode(groups.joinToString(""))
          else -> Uri.decode(groups.joinToString(""))
        }
      }
      else -> null
    }
  } catch (e: Exception) {
    null
  }

  private fun decodeBase64(value: String): String {
    val flags = if (value.contains('-') || value.contains('_')) Base64.URL_SAFE else Base64.DEFAULT
    return String(Base64.decode(value, flags or Base64.NO_WRAP))
  }

  private fun isValid(target: String, fromHost: String): Boolean {
    val next = Uri.parse(target)
    val scheme = next.scheme?.lowercase()
    if (scheme != "http" && scheme != "https") return false
    val host = next.host?.lowercase() ?: return false
    return try {
      AdblockNative.baseDomain(host) != AdblockNative.baseDomain(fromHost)
    } catch (e: Throwable) {
      host != fromHost
    }
  }

  private fun loaded(): List<Rule> {
    rules?.let { return it }
    synchronized(this) {
      rules?.let { return it }
      val parsed = try {
        val text = context?.assets?.open("adblock/debounce.json")?.bufferedReader()?.use { it.readText() } ?: "[]"
        parse(JSONArray(text))
      } catch (e: Exception) {
        emptyList()
      }
      rules = parsed
      return parsed
    }
  }

  private fun parse(list: JSONArray): List<Rule> {
    val out = ArrayList<Rule>()
    for (i in 0 until list.length()) {
      val o = list.optJSONObject(i) ?: continue
      if (o.has("pref")) continue
      val include = patterns(o.optJSONArray("include"))
      if (include.isEmpty()) continue
      out.add(
        Rule(
          include,
          patterns(o.optJSONArray("exclude")),
          o.optString("action"),
          o.optString("param"),
          o.optString("prepend_scheme").ifEmpty { null },
          o.optString("redirect_url_template").ifEmpty { null },
        ),
      )
    }
    return out
  }

  private fun patterns(arr: JSONArray?): List<Regex> {
    if (arr == null) return emptyList()
    return (0 until arr.length()).mapNotNull { pattern(arr.optString(it)) }
  }

  private fun pattern(p: String): Regex? {
    val m = Regex("^(\\*|https?)://([^/]+)(/.*)$").matchEntire(p) ?: return null
    val (scheme, host, path) = m.destructured
    val s = if (scheme == "*") "https?" else Regex.escape(scheme)
    val h = when {
      host == "*" -> "[^/]+"
      host.startsWith("*.") -> "(?:[^/]+\\.)?" + Regex.escape(host.substring(2).lowercase())
      else -> Regex.escape(host.lowercase())
    }
    val pathRe = path.split("*").joinToString(".*") { if (it.isEmpty()) "" else Regex.escape(it) }
    return Regex("$s://$h$pathRe")
  }
}
