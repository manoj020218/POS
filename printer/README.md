# Printer Native Plugin — Brief for the Android/Kotlin Developer

This folder is a work order, not code. It's the brief for the external developer who is building
the native Android printer connectivity that `apps/pos` needs but this team's toolchain can't build
(no Android Studio/Kotlin setup in this environment).

Send this whole file to the developer, or paste its contents into whatever channel you use to brief
them.

---

## 1. Context

Smart POS is an offline-first, multi-tenant POS system. `apps/pos` is a kiosk checkout UI (React +
Vite) that ships primarily as an **installed Android app on tablets**, wrapped with
[Capacitor](https://capacitorjs.com/). It needs to print ESC/POS thermal receipts to a printer
connected over:

- **Bluetooth** (paired printer)
- **USB** (wired, OTG)
- **WiFi / LAN** (printer on the same network, raw TCP socket — typically port `9100`)

We need **one Capacitor plugin package** that gives our JavaScript/TypeScript code a single,
consistent way to talk to a printer over any of those three transports, instead of three separate
packages.

## 2. What's already built (not your job)

All of the *printer logic* already exists in this repo, in `packages/printer/` — a pure TypeScript
package with:

- ESC/POS byte encoding (receipts, kitchen orders, barcodes, QR codes, test pages)
- A transport-agnostic `PrinterService` abstraction

That code already expects to be handed an injected transport object shaped like:

```ts
interface Transport {
  write(input: { bytes: Uint8Array /* ...other fields */ }): Promise<void>;
}
```

**You are not building any of that.** Your job is purely the native connectivity layer underneath
it — get a byte buffer from our JS code onto the wire (Bluetooth / USB / WiFi) and back.

## 3. What we need from you

A single Capacitor plugin (Android platform only — no iOS needed) that exposes the JS API below.
Suggested package name: **`@smart-pos/printer-bridge`** (deliberately distinct from the existing
`@smart-pos/printer` package in this repo, which is the pure logic layer above). Use a different name
if you prefer — the important part is the shape of the API, not the exact package name.

### 3.1 Required JS/TS API surface

```ts
export type PrinterBridgeMode = 'BLUETOOTH' | 'USB' | 'WIFI';

export interface PrinterBridgeTarget {
  mode: PrinterBridgeMode;
  /**
   * BLUETOOTH: paired device MAC address (e.g. "AA:BB:CC:DD:EE:FF").
   * USB: device identifier as returned by listDevices().
   * WIFI: host name or IP address.
   */
  address: string;
  /** WIFI only. Defaults to 9100 (standard raw ESC/POS port) if omitted. */
  port?: number;
}

export interface PrinterDeviceSummary {
  mode: PrinterBridgeMode;
  address: string;
  name?: string;
}

export interface PrinterBridgePlugin {
  /** Check whether the runtime permissions this mode needs are currently granted. */
  checkPermissions(input: { mode: PrinterBridgeMode }): Promise<{ granted: boolean; missing: string[] }>;

  /** Prompt the Android permission dialog(s) for this mode. */
  requestPermissions(input: { mode: PrinterBridgeMode }): Promise<{ granted: boolean; missing: string[] }>;

  /**
   * List discoverable/paired/reachable devices for a mode, so we can show a picker in Settings.
   * BLUETOOTH: paired devices (no need to implement live BLE/SPP discovery scanning unless trivial).
   * USB: currently attached USB devices.
   * WIFI: can return an empty list — WiFi printers are usually entered as a manual IP/host instead.
   */
  listDevices(input: { mode: PrinterBridgeMode }): Promise<{ devices: PrinterDeviceSummary[] }>;

  /**
   * Send a raw byte buffer to the printer and resolve once the write completes (or reject on
   * failure/timeout). This is the one method that matters most — get this right.
   */
  write(input: {
    target: PrinterBridgeTarget;
    bytesBase64: string;
    timeoutMs?: number; // default suggestion: 5000
  }): Promise<void>;
}
```

Register it the standard Capacitor way (`registerPlugin<PrinterBridgePlugin>('PrinterBridge')`) so we
can `import { PrinterBridge } from '@smart-pos/printer-bridge'` and call
`PrinterBridge.write({ target, bytesBase64 })` from `apps/pos`.

### 3.2 Byte payload

The Capacitor JS↔Native bridge can't carry raw binary directly — send/receive the ESC/POS byte
buffer as a **base64 string** (`bytesBase64`), not a `Uint8Array`/byte array. Decode it back to raw
bytes on the native side before writing to the socket/port/characteristic.

### 3.3 Error contract

Reject `write()` (and the other methods, where relevant) with an object shaped like:

```ts
{ code: string; message: string }
```

using one of these stable codes, so our TS layer can show the cashier a sensible message instead of
a raw stack trace:

| Code | Meaning |
| --- | --- |
| `PERMISSION_DENIED` | Required Android permission not granted |
| `DEVICE_NOT_FOUND` | Target address/device isn't paired/attached/reachable |
| `CONNECTION_FAILED` | Could not open the Bluetooth/USB/socket connection |
| `WRITE_TIMEOUT` | Connected, but the write didn't complete within `timeoutMs` |
| `WRITE_FAILED` | Connection opened but the write itself failed |
| `UNSUPPORTED_MODE` | Mode not implemented on this device/Android version |

### 3.4 Android permissions

Handle whatever runtime permission prompts each mode needs on modern Android (12+ granular Bluetooth
permissions — `BLUETOOTH_CONNECT`/`BLUETOOTH_SCAN` — plus USB host permission intent, and standard
network access for WiFi). `checkPermissions`/`requestPermissions` above exist so our UI can ask
before printing rather than surprise the cashier with a system dialog mid-checkout.

## 4. Open question for you to confirm

Most ESC/POS thermal receipt printers use **classic Bluetooth SPP (RFCOMM)**, not Bluetooth Low
Energy (BLE) GATT — these use very different Android APIs. Please confirm which your target
printers use (classic SPP is the safe default assumption for thermal receipt printers) and build
against that. If you're not sure, classic Bluetooth SPP is the one to implement first.

## 5. Non-goals (explicitly not needed from you)

- Receipt/kitchen-order/barcode layout or formatting
- ESC/POS command encoding
- Any business logic (sale totals, invoice numbers, etc.)
- iOS support

All of that already exists in `packages/printer/` or is handled elsewhere in the app.

## 6. Delivery

Whatever's easiest for you to hand over:

- A publishable npm package (scoped or not, your call) we can `pnpm add`, or
- A git repo we can point `pnpm add` at directly, or
- A folder we can install as a local `file:` dependency

Once it's installed, wiring it in is on us: we'll implement thin `write()`-only transport adapters
in `packages/printer` (`createUsbPrinterService`, `createBluetoothPrinterService`, and a new
`createNetworkPrinterService` for WiFi) that call your plugin's `write()`.

## 7. Acceptance test

We'll consider this done once, from a real Android tablet build of `apps/pos`, we can:

1. Pick a printer (Bluetooth, USB, or WiFi) in Settings
2. Print a test page and see it come out on a real 58mm or 80mm ESC/POS thermal printer
3. See a real cashier-facing error message (not a crash) if the printer is off/out of range/busy
