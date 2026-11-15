package expo.modules.downloads

import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Environment
import android.webkit.CookieManager
import android.webkit.URLUtil

object Downloads {
  private fun manager(context: Context) = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager

  fun start(context: Context, url: String, userAgent: String?, mime: String?): Boolean {
    return try {
      val name = URLUtil.guessFileName(url, null, mime)
      val request = DownloadManager.Request(Uri.parse(url))
        .setTitle(name)
        .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
        .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name)
      CookieManager.getInstance().getCookie(url)?.let { request.addRequestHeader("Cookie", it) }
      if (!userAgent.isNullOrEmpty()) request.addRequestHeader("User-Agent", userAgent)
      if (!mime.isNullOrEmpty()) request.setMimeType(mime)
      manager(context).enqueue(request)
      true
    } catch (_: Throwable) {
      false
    }
  }

  fun list(context: Context): List<Map<String, Any?>> {
    val out = mutableListOf<Map<String, Any?>>()
    try {
      manager(context).query(DownloadManager.Query()).use { c ->
        val id = c.getColumnIndexOrThrow(DownloadManager.COLUMN_ID)
        val title = c.getColumnIndexOrThrow(DownloadManager.COLUMN_TITLE)
        val status = c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS)
        val done = c.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR)
        val total = c.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES)
        val mime = c.getColumnIndexOrThrow(DownloadManager.COLUMN_MEDIA_TYPE)
        val time = c.getColumnIndexOrThrow(DownloadManager.COLUMN_LAST_MODIFIED_TIMESTAMP)
        while (c.moveToNext()) {
          out.add(
            mapOf(
              "id" to c.getLong(id).toDouble(),
              "title" to (c.getString(title) ?: "Download"),
              "status" to when (c.getInt(status)) {
                DownloadManager.STATUS_SUCCESSFUL -> "done"
                DownloadManager.STATUS_FAILED -> "failed"
                DownloadManager.STATUS_PAUSED -> "paused"
                DownloadManager.STATUS_RUNNING -> "running"
                else -> "pending"
              },
              "bytes" to c.getLong(done).toDouble(),
              "total" to c.getLong(total).toDouble(),
              "mime" to c.getString(mime),
              "at" to c.getLong(time).toDouble(),
            ),
          )
        }
      }
    } catch (_: Throwable) {
    }
    return out.sortedByDescending { it["at"] as Double }
  }

  fun open(context: Context, id: Long): Boolean {
    return try {
      val dm = manager(context)
      val uri = dm.getUriForDownloadedFile(id) ?: return false
      val mime = dm.getMimeTypeForDownloadedFile(id) ?: "*/*"
      val intent = Intent(Intent.ACTION_VIEW)
        .setDataAndType(uri, mime)
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(Intent.createChooser(intent, null).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      true
    } catch (_: Throwable) {
      false
    }
  }

  fun remove(context: Context, id: Long) {
    try {
      manager(context).remove(id)
    } catch (_: Throwable) {
    }
  }
}
