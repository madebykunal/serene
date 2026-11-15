package expo.modules.wallpaper

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream
import kotlin.math.max

class WallpaperModule : Module() {
  private var pending: Promise? = null
  private var maxSide = 1440

  override fun definition() = ModuleDefinition {
    Name("Wallpaper")

    AsyncFunction("pick") { side: Int, promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.resolve(null)
        return@AsyncFunction
      }
      pending?.resolve(null)
      pending = promise
      maxSide = side.coerceIn(480, 2400)
      val intent = if (Build.VERSION.SDK_INT >= 33) {
        Intent(MediaStore.ACTION_PICK_IMAGES).setType("image/*")
      } else {
        Intent(Intent.ACTION_GET_CONTENT).setType("image/*").addCategory(Intent.CATEGORY_OPENABLE)
      }
      try {
        activity.startActivityForResult(intent, REQUEST)
      } catch (_: Throwable) {
        pending = null
        promise.resolve(null)
      }
    }.runOnQueue(Queues.MAIN)

    Function("clear") {
      dir()?.listFiles()?.forEach { it.delete() }
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode != REQUEST) return@OnActivityResult
      val promise = pending ?: return@OnActivityResult
      pending = null
      val uri = payload.data?.data
      if (payload.resultCode != Activity.RESULT_OK || uri == null) {
        promise.resolve(null)
        return@OnActivityResult
      }
      Thread {
        val out = try {
          save(uri)
        } catch (_: Throwable) {
          null
        }
        promise.resolve(out)
      }.start()
    }
  }

  private fun dir(): File? = appContext.reactContext?.let { File(it.filesDir, "wallpaper") }

  // Decoded once here at screen-backdrop size, so Home never holds a full-resolution photo.
  private fun save(uri: Uri): String? {
    val ctx = appContext.reactContext ?: return null
    val resolver = ctx.contentResolver
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
    var sample = 1
    while (max(bounds.outWidth, bounds.outHeight) / (sample * 2) >= maxSide) sample *= 2
    val opts = BitmapFactory.Options().apply {
      inSampleSize = sample
      inPreferredConfig = Bitmap.Config.RGB_565
    }
    var bmp = resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, opts) } ?: return null
    val rotation = try {
      resolver.openInputStream(uri)?.use {
        when (ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
          ExifInterface.ORIENTATION_ROTATE_90 -> 90f
          ExifInterface.ORIENTATION_ROTATE_180 -> 180f
          ExifInterface.ORIENTATION_ROTATE_270 -> 270f
          else -> 0f
        }
      } ?: 0f
    } catch (_: Throwable) {
      0f
    }
    val long = max(bmp.width, bmp.height)
    val scale = if (long > maxSide) maxSide.toFloat() / long else 1f
    if (scale < 1f || rotation != 0f) {
      val m = Matrix().apply {
        if (scale < 1f) postScale(scale, scale)
        if (rotation != 0f) postRotate(rotation)
      }
      val next = Bitmap.createBitmap(bmp, 0, 0, bmp.width, bmp.height, m, true)
      if (next !== bmp) bmp.recycle()
      bmp = next
    }
    val folder = dir() ?: return null
    folder.mkdirs()
    folder.listFiles()?.forEach { it.delete() }
    val file = File(folder, "wp-${System.currentTimeMillis()}.jpg")
    FileOutputStream(file).use { bmp.compress(Bitmap.CompressFormat.JPEG, 86, it) }
    bmp.recycle()
    return Uri.fromFile(file).toString()
  }

  companion object {
    private const val REQUEST = 47021
  }
}
