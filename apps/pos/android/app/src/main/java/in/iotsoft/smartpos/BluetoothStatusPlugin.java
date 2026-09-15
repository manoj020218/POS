package in.iotsoft.smartpos;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.content.Context;
import android.content.Intent;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Whether the device's Bluetooth radio itself is on -- distinct from whether
// a printer is paired/reachable, which the printer plugin already reports.
// The topbar printer icon needs this to tell "no printer paired" apart from
// "Bluetooth is off" so it can prompt the cashier to turn it on.
@CapacitorPlugin(name = "BluetoothStatus")
public class BluetoothStatusPlugin extends Plugin {
    @PluginMethod
    public void isEnabled(PluginCall call) {
        JSObject result = new JSObject();
        try {
            BluetoothManager manager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
            BluetoothAdapter adapter = manager != null ? manager.getAdapter() : null;
            result.put("supported", adapter != null);
            result.put("enabled", adapter == null || adapter.isEnabled());
        } catch (SecurityException error) {
            // Runtime permission not granted yet -- fail open rather than
            // showing a false "Bluetooth is off" warning.
            result.put("supported", true);
            result.put("enabled", true);
        }
        call.resolve(result);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }
}
