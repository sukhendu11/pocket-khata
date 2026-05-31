package com.pocketkhata.app;

import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Register a callback via the modern OnBackPressedDispatcher.
        // This works on ALL API levels (handles both hardware button AND
        // gesture navigation on API 33+), unlike the deprecated onBackPressed()
        // which is completely ignored on Android 13+.
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
}
