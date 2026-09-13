package com.smartpos.app;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
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
        // resolves to 0 even though content is genuinely obscured.
        //
        // Listening directly on the WebView didn't reliably receive the
        // insets dispatch (it can sit several layers deep inside Capacitor's
        // own view hierarchy, and an ancestor can intercept/consume the
        // dispatch first). android.R.id.content is the direct child of the
        // window's DecorView and reliably receives the full window insets
        // in practice, so listen there and apply the resulting padding to
        // the WebView explicitly.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        View contentRoot = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(
            contentRoot,
            (view, windowInsets) -> {
                Insets systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
                WebView webView = getBridge().getWebView();
                webView.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
                return windowInsets;
            }
        );
        ViewCompat.requestApplyInsets(contentRoot);
    }
}
