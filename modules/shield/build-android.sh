#!/bin/sh
set -e
cd "$(dirname "$0")"
NDK="${ANDROID_NDK_HOME:-$HOME/Library/Android/android-ndk-r28c}"
TC="$NDK/toolchains/llvm/prebuilt/darwin-x86_64/bin"

if [ "$1" != "--no-lists" ]; then
  python3 -I lists.py
  curl -sSfL -o android/src/main/assets/adblock/debounce.json https://raw.githubusercontent.com/brave/adblock-lists/master/brave-lists/debounce.json
fi

cd rust
cargo test --release
CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER="$TC/aarch64-linux-android24-clang" \
CC_aarch64_linux_android="$TC/aarch64-linux-android24-clang" \
AR_aarch64_linux_android="$TC/llvm-ar" \
  cargo build --release --target aarch64-linux-android --lib
cp target/aarch64-linux-android/release/libshield.so ../android/src/main/jniLibs/arm64-v8a/
echo "Updated libshield.so and filter lists"
