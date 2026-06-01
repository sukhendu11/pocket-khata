package com.pocketkhata.app;

import android.graphics.Bitmap;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // ── PRIMARY DEFENSE: Synchronous cache clear ──────────────────
        //
        // When a new APK is installed over an existing one (standard
        // Android update without uninstall), the app's private data
        // directory — including the Android WebView disk cache — survives
        // the upgrade. If the WebView serves a cached index.html from the
        // OLD build, it will reference old JS chunk hashes that either:
        //   (a) no longer exist on disk (404s → broken app), OR
        //   (b) are themselves cached, causing the old JS to run with the
        //       old BUILD_VERSION, defeating our JS-side version check.
        //
        // Clearing the cache HERE (synchronously, NOT via post()) is
        // critical because:
        //   – super.onCreate() -> BridgeActivity.onCreate() has already
        //     initialized the bridge and WebView by the time this line
        //     executes.
        //   – The page load (bridge.load()) is queued but hasn't started
        //     yet — it runs later in onCreate after our code returns.
        //   – Using post() would defer the clear to a future message
        //     queue iteration, AFTER the WebView has already started
        //     loading from the stale disk cache — defeating the purpose.
        //   – Synchronous clearCache(true) deletes the cached files
        //     immediately, so the subsequent load must fetch fresh
        //     assets from the new APK.
        // ──────────────────────────────────────────────────────────────
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().clearCache(true);

            // ── SECOND LINE OF DEFENSE: Custom WebViewClient ─────────
            // Replace Capacitor's default BridgeWebViewClient with our
            // subclass that also clears the WebView cache on every page
            // load start. This catches any edge case where the onCreate
            // clear didn't fully take effect (e.g., the WebView wasn't
            // fully initialized, or the cache was re-populated during the
            // session).
            //
            // We extend BridgeWebViewClient to preserve ALL Capacitor
            // bridge behaviors:
            //   – shouldInterceptRequest() — local asset serving
            //   – shouldOverrideUrlLoading() — URL scheme handling
            //   – onPageFinished() — bridge JS injection
            //   – onReceivedError() — error recovery
            //   – onRenderProcessGone() — crash handling
            //   – onPageCommitVisible() — render notifications
            // ────────────────────────────────────────────────────────
            bridge.getWebView().setWebViewClient(
                new ClearCacheWebViewClient(bridge)
            );
        }

        // ── Back button handling ─────────────────────────────────────
        // Uses the modern OnBackPressedDispatcher to handle both hardware
        // back and gesture navigation on API 33+.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().evaluateJavascript(
                        "(function(){if(typeof window.__androidBackCallback==='function'){window.__androidBackCallback();}})()",
                        null
                    );
                } else {
                    // WebView not ready — finish the activity directly.
                    // Using setEnabled(false) + onBackPressed() would rely on the
                    // deprecated Activity.onBackPressed(), which is ignored on API 33+.
                    finish();
                }
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();

        // ── THIRD LINE OF DEFENSE: Clear cache on resume ────────────────
        // When the app is backgrounded and restored (e.g., user switches
        // to another app and comes back, or the system reclaims memory and
        // restores the activity), the WebView's disk cache may have been
        // repopulated during the session. This is especially relevant on
        // Android, where the WebView service is a separate process that may
        // continue caching even when the app is paused.
        //
        // This also covers the edge case where a system-triggered process
        // restart (e.g., due to memory pressure) causes the activity to be
        // recreated — onResume() runs AFTER onCreate() in that scenario,
        // providing an additional clearing opportunity.
        //
        // The null check is defensive: bridge and WebView should always be
        // available by onResume, but we guard against edge cases like
        // incomplete initialization during quick app switching.
        // ──────────────────────────────────────────────────────────────
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().clearCache(true);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // ClearCacheWebViewClient
    // ──────────────────────────────────────────────────────────────────────
    //
    // A custom WebViewClient that clears the WebView disk cache each time
    // a new page load begins. This acts as a second line of defense against
    // stale cached assets from a previous APK installation.
    //
    // By extending BridgeWebViewClient (instead of WebViewClient), we
    // inherit all of Capacitor's bridge infrastructure:
    //   - Asset loading via local server (shouldInterceptRequest)
    //   - Intent-based URL handling (shouldOverrideUrlLoading)
    //   - Bridge JS injection on page finish (onPageFinished)
    //   - Error page loading (onReceivedError, onReceivedHttpError)
    //   - Render process crash recovery (onRenderProcessGone)
    //   - WebView lifecycle notifications (onPageCommitVisible)
    //
    // The clear happens in onPageStarted BEFORE calling super, so the
    // cache is empty before Capacitor processes any bridge-related logic.
    // ──────────────────────────────────────────────────────────────────────
    private static class ClearCacheWebViewClient extends BridgeWebViewClient {

        ClearCacheWebViewClient(Bridge bridge) {
            super(bridge);
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            // Second line of defense: clear cache at the earliest moment
            // the WebView gives us — the start of every page load.
            // This catches edge cases where:
            //   - The onCreate clearCache(true) ran before the WebView's
            //     internal cache manager was fully initialized
            //   - A subsequent navigation (e.g., versioned reload with ?v=)
            //     somehow served from a stale cache entry
            //   - The WebView's disk cache was re-populated during the
            //     current app session after the initial clear
            view.clearCache(true);

            // Preserve all Capacitor bridge startup logic:
            //   - bridge.reset() — clears pending plugin calls
            //   - WebViewListener.onPageStarted() — plugin notifications
            super.onPageStarted(view, url, favicon);
        }
    }
}
