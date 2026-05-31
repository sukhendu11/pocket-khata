# Pocket Khata ProGuard / R8 Rules
# This app uses Capacitor (WebView-based) — these rules preserve
# code required for WebView JavaScript bridge, Capacitor plugins,
# and reflection-based Android framework features.

# ========== CAPACITOR / WEBVIEW ==========

# Keep Capacitor plugin classes (loaded via reflection)
-keep class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }

# Keep JavaScript bridge interface methods (called from JS)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep WebView-related classes
-keep class android.webkit.** { *; }

# ========== CAPACITOR CORDOVA PLUGINS ==========

-keep class org.apache.cordova.** { *; }
-keep class * extends org.apache.cordova.CordovaPlugin { *; }

# ========== ANDROID FRAMEWORK (reflection-heavy) ==========

# Keep all classes used with parcelables and serialization
-keepclassmembers class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator CREATOR;
}

-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Keep R (resources) classes so getIdentifier() works if plugins use it
-keep class **.R$* { *; }

# ========== EXCEPTION HANDLING ==========

# Keep line numbers for crash reporting
-keepattributes SourceFile,LineNumberTable

# Keep exception names
-keep public class * extends java.lang.Exception

# ========== GENERAL WEBVIEW SAFETY ==========

# Prevent obfuscation of class names used in WebView JavaScript bridge
-keepattributes Signature,*Annotation*,EnclosingMethod

# Keep annotations
-keepattributes *Annotation*

# Keep enum classes (often used with reflection in Android)
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}
