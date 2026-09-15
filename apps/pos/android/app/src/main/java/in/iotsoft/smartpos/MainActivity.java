package in.iotsoft.smartpos;

import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BluetoothStatusPlugin.class);
        super.onCreate(savedInstanceState);

        // Android 15 (targetSdk 35, see variables.gradle) makes edge-to-edge
        // display mandatory -- the app can no longer opt out, so the WebView
        // draws underneath the status bar and gesture/navigation bar unless
        // something explicitly insets it. Capacitor's bare BridgeActivity
        // doesn't do this on its own (nothing in @capacitor/android forwards
        // window insets to the WebView), so CSS env(safe-area-inset-*) alone
        // resolves to 0 even though content is genuinely obscured.
        //
        // Two prior attempts didn't work: listening directly on the WebView
        // never reliably received the insets dispatch (it sits several
        // layers deep inside Capacitor's own view hierarchy). Listening on
        // android.R.id.content (the DecorView's direct child, which reliably
        // gets the dispatch) and applying the result as WebView *padding*
        // did receive the insets, but Android's WebView has a long-standing
        // quirk where setPadding() only clips what's drawn -- it doesn't
        // actually shrink the viewport size the page itself sees, so
        // height:100% content still computes against the full unpadded
        // height and the bottom ends up needing a scroll to reach.
        // Resizing the WebView's actual layout bounds via margin (forcing a
        // real re-measure/re-layout at the smaller size) makes the page's
        // own layout engine see the correct, smaller viewport instead.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        View contentRoot = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(
            contentRoot,
            (view, windowInsets) -> {
                Insets systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
                WebView webView = getBridge().getWebView();
                ViewGroup.MarginLayoutParams params =
                    (ViewGroup.MarginLayoutParams) webView.getLayoutParams();
                params.leftMargin = systemBars.left;
                params.topMargin = systemBars.top;
                params.rightMargin = systemBars.right;
                params.bottomMargin = systemBars.bottom;
                webView.setLayoutParams(params);
                return windowInsets;
            }
        );
        ViewCompat.requestApplyInsets(contentRoot);
    }
}
