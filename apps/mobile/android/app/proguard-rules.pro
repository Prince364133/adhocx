# ==============================================================================
# AdhocX Release R8 Configuration (Google Play DEX Optimization >= 75%)
# ==============================================================================
# NOTE: Flutter embedding, Firebase, Google Play Services, ML Kit, CameraX,
# Razorpay Checkout, and Google Tink all bundle their own precision consumer
# ProGuard rules inside their AAR/JARs. NEVER add blanket wildcard
# `-keep class ...** { *; }` rules here — doing so disables R8 shrinking,
# optimization, and obfuscation across those libraries and causes Google Play
# Console "DEX code optimisation is below threshold (<25%)" warnings.

# Keep only the exact OverlayService class name resolved via Class.forName in MainActivity.kt
-keep class flutter.overlay.window.flutter_overlay_window.OverlayService

# Ensure WebView @JavascriptInterface callbacks (used by Razorpay Checkout) stay intact
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Repackage obfuscated classes into the root package for smaller DEX & stronger obfuscation
-repackageclasses ''

# Suppress warnings for optional/compile-only transitive references
-dontwarn com.google.android.play.core.**
-dontwarn com.google.mlkit.**
-dontwarn com.google.android.gms.internal.mlkit_vision_face.**
-dontwarn com.google.crypto.tink.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**


