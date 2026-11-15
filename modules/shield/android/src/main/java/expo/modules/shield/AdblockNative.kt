package expo.modules.shield

object AdblockNative {
  init {
    System.loadLibrary("shield")
  }

  @JvmStatic external fun create(rules: String): Long
  @JvmStatic external fun deserialize(data: ByteArray): Long
  @JvmStatic external fun serialize(ptr: Long): ByteArray
  @JvmStatic external fun check(ptr: Long, url: String, source: String, kind: String): String
  @JvmStatic external fun pageRules(ptr: Long, url: String): String
  @JvmStatic external fun genericSelectors(ptr: Long, url: String, classes: String, ids: String): String
  @JvmStatic external fun baseDomain(host: String): String
  @JvmStatic external fun destroy(ptr: Long)
}
