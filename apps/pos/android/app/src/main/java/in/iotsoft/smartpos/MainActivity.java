package in.iotsoft.smartpos;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.appcompat.app.AlertDialog;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MainActivity extends BridgeActivity {
    // Tailwind v4's generated CSS uses @layer, @property and color-mix(),
    // which need Chromium 111+ to parse. Below that, WebView silently drops
    // the whole stylesheet and the app renders as unstyled raw HTML with no
    // indication anything is wrong, so startup is gated on this instead of
    // letting it happen silently (see 2026-09-21 tablet field report).
    private static final int MIN_WEBVIEW_MAJOR_VERSION = 111;
    private static final Pattern CHROME_VERSION_PATTERN = Pattern.compile("Chrome/(\\d+)\\.");

    private AlertDialog updateDialog;

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
                // The keyboard is its own inset type (ime), separate from
                // systemBars. adjustResize alone doesn't help here because
                // setDecorFitsSystemWindows(false) already opted the app out
                // of the OS's automatic resize -- without folding ime.bottom
                // into the WebView's own margin, the keyboard just overlaps
                // the page and the focused field never scrolls into view.
                Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
                WebView webView = getBridge().getWebView();
                ViewGroup.MarginLayoutParams params =
                    (ViewGroup.MarginLayoutParams) webView.getLayoutParams();
                params.leftMargin = systemBars.left;
                params.topMargin = systemBars.top;
                params.rightMargin = systemBars.right;
                params.bottomMargin = Math.max(systemBars.bottom, ime.bottom);
                webView.setLayoutParams(params);
                return windowInsets;
            }
        );
        ViewCompat.requestApplyInsets(contentRoot);

        if (!isWebViewVersionSupported()) {
            showWebViewUpdateRequiredDialog();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (updateDialog != null && updateDialog.isShowing() && isWebViewVersionSupported()) {
            updateDialog.dismiss();
            recreate();
        }
    }

    private boolean isWebViewVersionSupported() {
        String userAgent;
        try {
            userAgent = WebSettings.getDefaultUserAgent(this);
        } catch (Exception e) {
            // Can't determine version -- fail open rather than block startup.
            return true;
        }
        Matcher matcher = CHROME_VERSION_PATTERN.matcher(userAgent);
        if (!matcher.find()) {
            return true;
        }
        try {
            return Integer.parseInt(matcher.group(1)) >= MIN_WEBVIEW_MAJOR_VERSION;
        } catch (NumberFormatException e) {
            return true;
        }
    }

    private void showWebViewUpdateRequiredDialog() {
        String packageName = "com.google.android.webview";
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            PackageInfo current = WebView.getCurrentWebViewPackage();
            if (current != null) {
                packageName = current.packageName;
            }
        }
        final String webViewPackageName = packageName;

        updateDialog = new AlertDialog.Builder(this)
            .setTitle("Update Required")
            .setMessage(
                "This device's system WebView is out of date and Smart POS can't display correctly until it's updated.\n\n"
                    + "Tap Update, install the update from Play Store, then return here."
            )
            .setCancelable(false)
            .setPositiveButton("Update Now", null)
            .show();

        updateDialog
            .getButton(AlertDialog.BUTTON_POSITIVE)
            .setOnClickListener(v -> {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + webViewPackageName)));
                } catch (ActivityNotFoundException e) {
                    startActivity(
                        new Intent(
                            Intent.ACTION_VIEW,
                            Uri.parse("https://play.google.com/store/apps/details?id=" + webViewPackageName)
                        )
                    );
                }
            });
    }
}
