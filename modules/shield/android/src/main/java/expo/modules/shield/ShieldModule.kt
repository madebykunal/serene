package expo.modules.shield

import android.os.Build
import android.os.Handler
import android.os.Looper
import android.webkit.WebView
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ShieldModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("Shield")

    OnCreate {
      appContext.reactContext?.let { ctx ->
        val app = ctx.applicationContext
        if (Build.VERSION.SDK_INT >= 27) Handler(Looper.getMainLooper()).post { WebView.startSafeBrowsing(app, null) }
        Debounce.start(app)
        AdblockService.start(ctx)
      }
    }

    Function("debounce") { url: String ->
      Debounce.resolve(url)
    }

    Function("setEnabled") { on: Boolean ->
      AdblockService.enabled = on
    }

    Function("setBadgerEnabled") { on: Boolean ->
      Badger.enabled = on
    }

    Function("badgerLearned") {
      Badger.learned
    }

    Function("resetBadger") {
      Badger.reset()
    }

    Function("setSiteExceptions") { hosts: List<String> ->
      AdblockService.exempt = hosts.map { it.lowercase() }.toSet()
    }

    Function("setFingerprinting") { on: Boolean, hosts: List<String> ->
      Farble.enabled = on
      Farble.exempt = hosts.map { it.lowercase().removePrefix("www.") }.toSet()
    }

    Function("setPrivate") { on: Boolean ->
      Farble.private = on
    }

    Function("resetPrivateFingerprint") {
      Farble.resetPrivate()
    }

    Function("resetFingerprint") {
      Farble.reset()
    }
  }
}
