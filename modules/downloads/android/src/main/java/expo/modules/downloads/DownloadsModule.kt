package expo.modules.downloads

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DownloadsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("Downloads")

    Function("start") { url: String, userAgent: String?, mime: String? ->
      val ctx = appContext.reactContext ?: return@Function false
      Downloads.start(ctx, url, userAgent, mime)
    }

    Function("list") {
      val ctx = appContext.reactContext ?: return@Function emptyList<Map<String, Any?>>()
      Downloads.list(ctx)
    }

    Function("open") { id: Double ->
      val ctx = appContext.reactContext ?: return@Function false
      Downloads.open(ctx, id.toLong())
    }

    Function("remove") { id: Double ->
      appContext.reactContext?.let { Downloads.remove(it, id.toLong()) }
    }
  }
}
