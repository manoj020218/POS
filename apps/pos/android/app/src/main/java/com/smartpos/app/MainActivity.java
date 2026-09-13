package com.smartpos.app;

import android.os.Bundle;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android 15 (targetSdk 35, see variables.gradle) makes edge-to-edge
        // display mandatory -- the app can no longer opt out, so the WebView
        // draws underneath the status bar and gesture/navigation bar unless
        // something explicitly insets it. Capacitor's bare BridgeActivity
        // doesn't do this on its own (nothing in @capacitor/android forwards
        // window insets to the WebView), so CSS env(safe-area-inset-*) alone
        // resolves to 0 even though content is genuinely obscured. Applying
        // the system bar insets directly as padding on the native WebView
        // avoids depending on that CSS variable ever being populated.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        android.webkit.WebView webView = getBridge().getWebView();
        ViewCompat.setOnApplyWindowInsetsListener(
            webView,
            (view, windowInsets) -> {
                Insets systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
                view.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
                return WindowInsetsCompat.CONSUMED;
            }
        );
        // The initial insets dispatch can happen before this listener attaches
        // (Capacitor's own Bridge setup runs its own layout pass first), which
        // would otherwise leave the WebView unpadded until some later system
        // event happens to trigger a re-dispatch. Force one now.
        ViewCompat.requestApplyInsets(webView);
    }
}
