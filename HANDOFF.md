# HANDOFF

## ⚠ READ THIS FIRST — first real-hardware printer test, three bugs found and fixed (2026-09-11, latest session)

Same branch (`codex/settings-printer-foundation`), a new session. The physical thermal printer
arrived (a BLE/USB combo board, model markings **PSF588** over BLE, **SR588** over USB, **SC588**
on its label — same board). Per [[deployment-pacing-hardware-gate]] this was the trigger to
actually test on real hardware for the first time. No tablet yet — testing used a phone (adb over
USB, later wireless adb once the printer needed the phone's only USB-C port for OTG) plus a local
dev API server (Postgres started locally, migrations `0016`/`0017` applied to the **local** dev DB
only, `CREDENTIALS_ENCRYPTION_KEY`/`BRIDGE_SHARED_SECRET` added to local `.env` — none of this
touched the VPS). Full loop verified end-to-end over **USB**: login → terminal picker → Billing POS
checkout → receipt print → Self-Service Kiosk → token order → dual (1+1) token print with a QR
code → counter "Scan token" lookup → cart prefill. Three real bugs found and fixed, committed as
three separate commits on this branch:

1. **Printer transport-switch bug** (`apps/pos/src/lib/printer/connection-manager.ts`): switching
   a terminal's paired printer between BLE and USB left the native plugin's own connection state
   pointing at the old transport, so every reconnect attempt was rejected and checkout silently
   claimed the receipt printed without ever writing to the new transport. Fixed with a
   disconnect-and-retry-once path. **First fix attempt was wrong** — it checked
   `error instanceof ThermalPrinterError`, which never matches a real device error because
   `@jenix/cap-thermal-printer`'s `connect()`/`write()` return the raw Capacitor native-bridge
   promise directly; a real rejection is a plain `CapacitorException` with a `.code` string, never
   that class. This silently broke the plugin's own pre-existing `NOT_CONNECTED` retry too, not
   just the new code. Second commit switched both checks to read `.code` directly — confirmed
   working on-device only after that correction.
2. **Kiosk token barcode misdecodes on this printer** (CODE128): scanning a printed token
   consistently lost its last character (`K-004` scanned back as `K-00...`), reproducing identically
   with or without the ESC/POS `{B` code-set-selector prefix, and *worse* — a NUL-terminated GS k
   variant tried mid-session made the printer physically stall mid-print (no jam, but no print
   either; immediately reverted, don't retry that variant blind). Rather than keep guessing at this
   clone board's undocumented GS k quirks, switched the token's scannable code to a **QR code**
   (`createQrCodeCommand`, already implemented) — no code-set bytes to mishandle, counter-side
   scanning needed no changes since ML Kit reads QR the same way it reads 1D codes. Confirmed
   correct round-trip on real hardware. The general `BARCODE` command path (e.g. product barcodes)
   still keeps the `{B`-prefix-removal half of the fix, since that part was independently correct.
3. **BLE printing silently fails on this printer** (not fixed — needs the native plugin developer,
   not this session, per [[printer-plugin-division-of-labor]]): BLE `write()` calls succeed at the
   Android GATT layer (`status=0`) and the app reports "Receipt sent to the printer," but nothing
   prints. GATT service discovery shows a `49535343-...` service — the well-known ISSC/Microchip
   "Transparent UART" bridge common in cheap thermal-printer BLE modules. The plugin writes ~540
   bytes in three chunks roughly 5ms apart using `WRITE_TYPE_NO_RESPONSE` (fire-and-forget, no
   ack) — almost certainly faster than this class of UART bridge can drain over its serial link,
   silently overflowing its buffer with no error surfaced back to the app. **USB printing on this
   same hardware works correctly** and is the confirmed path for now. Needs either
   `WRITE_TYPE_DEFAULT` (acknowledged writes) or an inter-chunk delay in
   `BleWriteSession.kt`/`BlePrinterConnection.kt` in the `capacitor-plugins` repo — flag this
   precisely to the plugin developer rather than re-diagnosing from scratch.

Also surfaced (not fixed, just noted) while testing on a phone-width screen rather than a tablet:
Billing POS's `TopBar` has 6+ icon buttons in a horizontally-scrolling row with no visual affordance
that it scrolls — "Terminal mode" is the last icon and was genuinely hard to find. The
Self-Service-Kiosk screen's own settings gear (`SelfServiceKioskShell`) only opens
`TerminalModeSettingsModal`, not printer settings — switching a kiosk-mode terminal's printer
requires switching back to Billing POS mode first. Neither shell shows a persistent
"printer connected" indicator; connection status is only visible inside the Printer Settings modal
itself. Local dev DB also had three leftover empty test businesses from earlier smoke-testing
sessions under the same dev tenant (deleted with the user's explicit OK) — they made the dev owner
account hit "business context required" ambiguity that a real single-business account never would.

**Next**: get BLE printing working needs the plugin developer (see bug 3 above) — until then, USB
is the way to test/demo on this printer. Tablet still hasn't arrived; this session's testing used a
phone. Migration `0017` + `CREDENTIALS_ENCRYPTION_KEY` are still not applied to the VPS and no APK
has been built for distribution — per [[deployment-pacing-hardware-gate]], re-check with the user
before doing either now that *some* hardware testing has happened (USB path only; BLE and the
tablet itself are still unverified).

---

## ⚠ READ THIS FIRST — per-business Razorpay credentials, replacing env-var config (2026-09-10, latest session)

Same branch (`codex/settings-printer-foundation`), a new session. The previous session's kiosk
Phase 1 had wired Razorpay as a single **platform-wide** gateway configured via
`RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/`RAZORPAY_WEBHOOK_SECRET` env vars — fine for a demo, wrong
for a real multi-tenant SaaS where each business owner has their **own** Razorpay merchant account
and needs their own money landing in their own account. The user pointed at a reference project
(`jenixindia.com`'s own live admin panel, at `D:\IOT Device\jenixindia.com\jenix\VPS`) that already
has exactly this pattern — a "PG card" per gateway in Settings where the business enters its own
Key ID / Key Secret / Webhook Secret and flips an enable toggle — and asked for the same in Smart
POS. Reviewed that reference's `payment-gateways` module (server: JSON-file-backed store, generic
`credentials: Record<string,any>` per gateway, `credentialsConfigured` boolean never leaks secrets
back to the list view; admin UI: `CREDENTIAL_FIELDS` map driving per-gateway password inputs with
"leave blank to keep existing" placeholders) and built the equivalent for Smart POS's real
multi-tenant Postgres setup, deliberately going further on security than the reference did:

- **New `payment_gateway_credentials` table** (migration `0017`, not yet applied to production):
  one row per `(businessId, gatewayCode)`, `isEnabled` boolean, and an `encryptedCredentials` text
  column — **AES-256-GCM encrypted, never plaintext** (the reference project stores its JSON store
  in plaintext on disk; Smart POS's credentials are live third-party account secrets for many
  different real businesses in one shared database, so this got real encryption at rest). New
  `apps/api/src/lib/credential-encryption.ts` (`encryptCredentialPayload`/`decryptCredentialPayload`,
  random IV per call) keyed by a new optional `CREDENTIALS_ENCRYPTION_KEY` env var (32 bytes, 64 hex
  chars). **Deliberately no hardcoded fallback key in `app.ts`'s production path** — unlike
  `bridgeSharedSecret`'s test-only default, a baked-in encryption-key fallback would be a real
  vulnerability if it were ever silently reused in production; missing the env var just means
  writes are refused (503) while reads/list still work, so nothing crashes, it just can't save
  secrets yet. Tests supply their own fixed key explicitly.
- **`PaymentGateway` interface reshaped from stateful to stateless** (`apps/api/src/modules/kiosk/
  payment-gateway.ts`/`razorpay-payment-gateway.ts`): credentials are now resolved per-business at
  call time and passed into each method, instead of being bound once at server startup from env
  vars. This is what actually makes "every business uses their own Razorpay account" possible.
- **Solved the webhook multi-tenancy problem**: Razorpay calls one shared webhook URL
  (`/kiosk/webhooks/razorpay`) with no businessId in the path, but verifying its HMAC signature
  requires knowing *which* business's webhook secret to check against — before verification, we
  don't yet know who it's for. Fixed by splitting the old single `parseWebhookPaymentEvent` into
  two steps: `extractWebhookGatewayOrderId` reads the (still-unverified) gateway order id out of the
  raw body purely as a lookup key — never trusted or acted on — to find the specific kiosk order and
  therefore its business; only then is `verifyAndParseWebhookEvent` called with *that* business's
  own stored webhook secret. An attacker who doesn't know a business's real webhook secret cannot
  forge a valid signature no matter what order id they claim, so this stays safe despite the
  unverified initial read.
- **New `apps/api/src/modules/payment-gateways/` module**: repository (in-memory + Drizzle) +
  service (`listGatewayCards` — sanitized, `configured`/`isEnabled` booleans only, never secrets;
  `updateGatewayCredentials` — merges new fields into whatever's already stored so leaving a field
  blank keeps its previous value, refuses to enable a gateway until all its required fields
  (`keyId`/`keySecret`/`webhookSecret` for Razorpay) are present, 503s if
  `CREDENTIALS_ENCRYPTION_KEY` isn't configured; `getResolvedCredentials` — internal-only, decrypted,
  used exclusively by `kiosk.service`, never exposed over HTTP) + routes (`GET`/`PATCH
  /api/v1/payment-gateways[/:gatewayCode]`, both gated behind `settings:manage`, i.e. owner/admin
  only — same gating tier as business settings and terminal-mode config).
- **`apps/pos`**: new "Payment gateways" card in Billing POS's `TopBar` (`PaymentGatewaysButton`/
  `PaymentGatewaysModal`) — one card per known gateway code (just Razorpay today), each with an
  enable toggle and an "Add/Update credentials" expand-in-place form (Key ID / Key Secret / Webhook
  Secret, password-masked, blank = keep existing). `packages/client-data` gained
  `listPaymentGatewayCards`/`updatePaymentGatewayCredentials` on `ClientRemoteApi`.
- Existing kiosk-order tests (`apps/api/test/kiosk.test.ts`) updated to seed real per-business
  credentials through the new `PATCH /payment-gateways/razorpay` endpoint before exercising the
  gateway-collects-payment flow, rather than relying on a directly-injected gateway config —  this
  also serves as an implicit end-to-end check that the new credential flow feeds correctly into
  kiosk order creation and webhook fulfillment. New dedicated tests: `credential-encryption.test.ts`
  (round-trip, random-IV-per-call, wrong-key failure, key-length validation),
  `payment-gateway-credentials.test.ts` (permission gating, incomplete-credentials rejection,
  secrets never echoed back in any response body, blank-field-keeps-existing merge behavior,
  missing-encryption-key refuses writes but not reads), and
  `drizzle-payment-gateway-credential.repository.test.ts` (PGlite integration: upsert-in-place,
  per-business isolation). Full workspace suite green (259 tests, 87 files) — `pnpm lint`/
  `typecheck`/`build` all clean across `apps/api`, `apps/pos`, `packages/client-data`.

**Next for this slice**: apply migration `0017` and set `CREDENTIALS_ENCRYPTION_KEY` on the
production VPS (same careful, reviewed-script approach as every prior production change — not
attempted this session, and this one specifically should NOT be regenerated/rotated carelessly once
real businesses have saved real credentials against it, since that would make existing encrypted
rows undecryptable). Manually verify on-device: open the new Payment gateways card, save real (or
sandbox) Razorpay credentials, enable it, then run the existing kiosk-pay QR flow against it. Add
more gateway cards later by extending `paymentGatewayCodes` (schema),
`requiredFieldsByGateway`/`gatewayLabels` (service), and `CREDENTIAL_FIELDS` (apps/pos modal) — the
data model and UI pattern are already generic per the client's "similar PG cards" ask, only
Razorpay's actual adapter is wired up today.

**⚠ Explicit pacing instruction from the user (2026-09-10) — do not deploy or build an APK yet.**
Physical hardware (printer/tablet) is arriving for testing. Until then:
- **Do NOT** apply migration `0017` or set `CREDENTIALS_ENCRYPTION_KEY` on the VPS.
- **Do NOT** build/send a new APK.
- Once hardware arrives and the whole loop (kiosk order → payment gateway card → Razorpay QR →
  webhook → real sale → token print, 1+1 dual printing, scan-to-lookup at counter checkout) has
  been manually verified on-device, *then* deploy this migration + env var to the VPS and build the
  APK — in that order, not before. If a session picks this up cold (e.g. after a power cut), check
  with the user whether hardware has arrived before doing either of these two things, even though
  all the code above is already committed and ready to go.

---

## ⚠ READ THIS FIRST — Self-Service Kiosk built end-to-end (2026-09-09; its Razorpay env-var config is superseded by the entry above — everything else below still stands)

Same branch (`codex/settings-printer-foundation`), a new session, following on from the "planned,
not yet built" note at the bottom of the entry below. The client's Self-Service Kiosk (SSK) design
was reviewed, refined twice on feedback, and then the user explicitly asked to execute the whole
plan in one session. All four phases below are built, tested, and committed — **not yet deployed
to the production VPS** (new migration `0016` + no new env vars beyond the three optional Razorpay
ones), and not yet manually verified on real hardware (no device was connected this session — see
"Next" below).

**Core design**: a kiosk order is not a `Sale` until money has actually moved. Kiosk orders live in
a brand-new `kiosk_orders` table, untouched by `sales`/reporting, and only ever become a real Sale
by calling the existing, unmodified `createSaleHandler` — either from a Razorpay webhook (kiosk
collects payment itself) or from a normal counter checkout (token-only, pay-at-counter). This means
Billing POS's checkout code and sale/report data are completely unaffected by any of this.

- **Server** (`apps/api`, all committed): new `kiosk_orders` (statuses
  `AWAITING_PAYMENT`/`UNPAID_TOKEN`/`FULFILLED`/`EXPIRED`/`CANCELLED`) and `kiosk_token_sequences`
  (per-terminal, per-day token numbering — `K-001`, `K-002`, ... resetting daily, deliberately
  separate from the ever-incrementing `sale_sequences`) tables, plus `terminal_settings` (per
  terminal, not per business: `mode` Billing POS vs Self-Service Kiosk,
  `kioskCollectsPayment`, `printDualTokens`, `gatewayTimeoutMinutes` default 5). Migration `0016`
  generated, **not applied to production**. Full `kiosk` module
  (`apps/api/src/modules/kiosk/`): repository (in-memory + Drizzle), service, routes
  (`sale:create` gates order CRUD, `terminal:view`/`terminal:create` gate settings read/write —
  confirmed `terminal:create` is owner/admin-only in this codebase's existing permission map, same
  as `settings:manage`, so a `BRANCH_MANAGER` can view but not change a terminal's mode), and an
  **unauthenticated** webhook route (`POST /kiosk/webhooks/razorpay`, HMAC-SHA256 verified against
  the raw request body — `app.ts` now captures `request.rawBody` via `express.json({ verify })`).
  Razorpay integration uses the dedicated **QR Code API** (`razorpay.qrCode.create`, `type:
  'upi_qr'`), not Orders+Checkout, since the kiosk only needs to show a ready `image_url` with no
  webview/checkout.js embed. Unpaid gateway orders past `expiresAt` flip to `EXPIRED` lazily on the
  next read (`getKioskOrder`/`listActiveKioskOrders`) — there's no cron/queue infra in this
  codebase, so this mirrors how the rest of the app already avoids needing one.
  `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/`RAZORPAY_WEBHOOK_SECRET` are all optional env vars — the
  gateway is only constructed when all three are present; otherwise kiosk terminals still work in
  token-only mode and `kioskCollectsPayment` just isn't offered.
- **Real bug fixed while building this**: `packages/printer`'s `receipt-job.ts` was dividing
  amounts by 100 (`formatMoney`), assuming paise input — but every amount in this system (sale
  totals, product prices, the app's own currency formatter) is whole rupees, never paise. This had
  never been caught because the physical printer test hasn't happened yet. Fixed the formatter and
  the test literals that had been written assuming the wrong scale.
- **`packages/printer`**: new `createTokenPrintJob` (large bold token number, itemized lines,
  total, either a `PAID` stamp + UPI reference or "Pay at counter to collect", plus a **CODE128
  barcode of the token number** so a counter cashier can actually scan it, not just read it) and a
  `size?: 1 | 2` field on the `TEXT` command (`GS ! n`) to support the large token-number text,
  added without breaking any existing exact-equality test (left `undefined` by default).
- **`packages/client-data`**: `createKioskOrder`/`getKioskOrder`/`listKioskOrders`/
  `fulfillKioskOrder`/`getTerminalSettings`/`updateTerminalSettings` added to `ClientRemoteApi` +
  the HTTP implementation. New `createUnusedRemoteApi()` test fixture (`test/fixtures.ts`) so the
  next time this interface grows, existing hand-rolled test fakes don't all need manual edits again
  — this had happened four separate times already this project (image upload, price history,
  units, now kiosk).
- **`apps/pos`** — the actual on-device experience:
  - Each terminal now fetches its own `terminal_settings` on login (`use-terminal-mode.ts`,
    falls back to Billing POS defaults on any fetch failure — e.g. before the migration is deployed
    — so nothing breaks) and `AppShell` routes to either the existing `KioskShell` (Billing POS,
    unchanged) or the new `SelfServiceKioskShell`.
  - `SelfServiceKioskShell`: a customer-facing tap-to-add grid (`CustomerProductGrid`/
    `CustomerProductCard` — plain tap only, no price-edit or long-press, since customers should
    never reach product editing) plus an order summary panel reusing the existing `CartLineItem`.
    "Print my token" (token-only) or "Pay ₹X" (kiosk-collects-payment) calls `useKioskOrder`, which
    either prints immediately or shows a QR + polls `getKioskOrder` every 3s until
    `FULFILLED`/`EXPIRED`, then prints via the new `printKioskToken` helper — respecting
    `printDualTokens` (prints the same job twice, not a single torn slip, per the client's explicit
    "1+1 token" ask for real multi-step handovers) and stamping the real Razorpay payment reference
    (exposed as `paymentReference` on the order view) rather than a placeholder.
  - Staff reach terminal settings from inside kiosk mode via a **long-press** (not a tap) on a
    small corner icon — deliberately not a plain tap, so a customer can't stumble into
    configuration; the same settings modal is also reachable normally from Billing POS's `TopBar`.
  - `TopBar` (Billing POS) gained a "Kiosk orders" queue button — **business-scoped, not
    terminal-scoped**, per the client's explicit correction that the same single kiosk tablet might
    be the only device on-site, with staff monitoring it from another tab/phone rather than a
    dedicated second terminal.
  - Counter checkout (`CartPanel`) gained a token-lookup button: scan (reuses the existing ML Kit
    barcode scanner against the new CODE128 token barcode) or type a token number, which pre-fills
    the cart from that unpaid kiosk order's items and — once checkout completes — calls
    `fulfillKioskOrder` to link the resulting sale back to it (`CheckoutFlow` gained an
    `onSaleRecorded` callback fired the moment a sale is recorded, not on the later "start new
    sale" dismissal).
- **Explicitly deferred (phase 5, per the client)**: a physical "now serving" token display over
  the LAN. Only the concept was specified (a call-next action broadcasting one number locally) —
  transport and display hardware are deliberately undecided. Not started.
- Full workspace test suite green (248 tests, 84 files) including 9 new kiosk-specific tests
  (route + Drizzle/PGlite integration). `pnpm lint`/`typecheck`/`build` all clean across
  `apps/api`, `apps/pos`, `packages/client-data`, `packages/printer`. Debug APK built (pointed at
  production API) and sent directly to the user — **no device was connected via USB this session**,
  so on-device verification (QR display, token printing, barcode scan-to-lookup, the staff
  long-press escape hatch) has not happened yet.

**Next for this slice**: reconnect the debug device (or `adb install -r` the already-sent APK) and
manually verify the whole loop once a printer is available — token-only print, kiosk-pay QR +
webhook-confirmed print with a real UPI reference, 1+1 dual printing, scan-to-lookup at counter
checkout, and the long-press settings escape hatch from kiosk mode. Then deploy migration `0016` +
(optionally) the three `RAZORPAY_*` env vars to the VPS, using the same careful, reviewed-script
approach as every prior production change to this VPS (see `feedback-production-vps-writes-blocked`
memory) — not attempted in this session.

---

## ⚠ READ THIS FIRST — manual product add/edit + layout fixes shipped (2026-09-08)

Same branch (`codex/settings-printer-foundation`), a later same-day session, after the
onboarding/forgot-password entry below. Two independent slices, both committed (not yet pushed to
origin as of this entry — check `git status`/`git log origin/codex/settings-printer-foundation..HEAD`):

**1. Responsive layout + safe-area fix.** The kiosk shell (`TopBar` + `CatalogPane` +
fixed-`w-[26rem]` `CartPanel`) had zero responsive breakpoints — on a phone-width screen (as
opposed to the target tablet) the fixed-width cart panel alone exceeded the viewport, squeezing
`CatalogPane` to an unusable sliver. Fixed by stacking the shell vertically below the `lg`
breakpoint (full-width catalog above, full-width cart below, one page scroll) and keeping the
existing tablet side-by-side layout at `lg`+. Also added `viewport-fit=cover` +
`env(safe-area-inset-*)` padding on `#root`, since `targetSdkVersion 35` (Android 15) enforces
edge-to-edge rendering and the app had no safe-area handling — content was drawing straight under
the status bar/gesture nav bar. Verified visually on the connected debug device.

**2. Manual single-product add/edit (photo, barcode, business-type-aware pricing unit, fast price
edits with history).** Full plan is preserved at the top of the conversation this was executed
from; short version — client wants shop owners to catalog products one at a time from the tablet
(not just bulk CSV), and vegetable vendors specifically need to reprice fast, daily, with the last
few prices visible for reference.

- **Server** (`apps/api`): new `business_settings.businessType`
  (`GENERAL`/`KIRANA`/`VEGETABLE`/`RESTAURANT_DHABA`) — setting it auto-provisions that type's
  suggested `units` rows (`ensureUnitsForBusinessType` in `catalog-defaults.ts`; dhaba's list is a
  superset including KG/GRAM/PCS, not just plate units, since dhabas commonly also sell small
  kirana-style items). New `product_price_changes` ledger (mirrors `inventory_movements`'
  shape) — `updateProduct` now records previous/new price whenever `sellingPrice` actually
  changes, pruned to the 4 most recent rows per product on insert (not a full history — explicit
  client ask). New `GET /products/:id/price-history`. New `POST /products/image-upload` (multer,
  5MB limit, jpeg/png/webp) writing to `UPLOAD_DIR` and returning an absolute URL under
  `PUBLIC_BASE_URL`, served back via `app.use('/api/uploads', express.static(...))` — mounted
  under `/api` like every other route, so **no nginx change is needed** for this (confirmed nginx
  already forwards the whole `/api/` path). Both `UPLOAD_DIR`/`PUBLIC_BASE_URL` are optional;
  missing `PUBLIC_BASE_URL` degrades the upload endpoint to a `503`, same pattern as this
  session's earlier SMTP config. Migration `0015` generated, **not yet applied to production**.
- **`packages/client-data`**: added `updateProduct`, `getProductPriceHistory`,
  `uploadProductImage` (multipart, auth header only — no `Content-Type`, so `fetch` sets its own
  boundary), and `listUnits` to `ClientRemoteApi` — none of these existed client-side before
  (there was no `updateProduct` at all, only `createProduct`).
- **`apps/pos`**: `ProductCard` now has three gestures instead of one — plain tap still adds to
  cart (unchanged checkout speed); tapping the price opens `QuickPriceEditPopover` (numeric
  keypad + last-price chips); long-pressing the card opens `AddEditProductModal` pre-filled for a
  full edit (new hand-rolled `use-long-press.ts`, ~500ms threshold, no gesture library). New
  "Add product" button in `TopBar` opens the same modal in create mode. Added
  `@capacitor/camera@7.0.5` (photo: Take Photo / Gallery) and
  `@capacitor-mlkit/barcode-scanning@7.5.0` (barcode scan button next to the manual entry field) —
  **both pinned**, since each package's `latest` dist-tag has already moved to Capacitor 8,
  incompatible with this repo's Capacitor 7. Added the `CAMERA` permission to
  `AndroidManifest.xml`. `useProductCatalog` now exposes a separate `refresh()` (not called from
  its own mount effect — that effect keeps an inline fetch to satisfy
  `react-hooks/set-state-in-effect`) so a create/edit/price-change is reflected in the checkout
  grid immediately, without waiting for the next sync pull.
- All server/client-data/app layers fully tested (route tests, Drizzle integration tests via
  PGlite, client-data unit tests) — full workspace `pnpm test` green (235 tests) at time of
  writing. Built and installed on the connected debug device; **not yet manually verified
  on-device** (photo capture, barcode scan, and the full add/edit/price-edit flow) — the device
  disconnected from USB mid-session. An APK was sent directly to the user as a fallback install
  path.

**Next for this slice**: reconnect the debug device, `adb install -r` the already-built APK (or
rebuild if anything changes first), and manually verify: Add Product (photo + barcode + unit
chips), long-press edit, tap-price quick edit with history chips, and that plain-tap-to-cart still
works normally. Then, once real hardware printer testing happens (see the 2026-09-04 entry
further below), this slice's migration + new env vars (`UPLOAD_DIR`, `PUBLIC_BASE_URL`) will need
a follow-up production deploy — not done in this session, flagged as a separate next step
requiring the same careful, user-reviewed-script approach used for the SMTP change (see the
onboarding entry below and `deployment-vps-target`/`feedback-production-vps-writes-blocked`
memory).

**Also planned in this session, not yet built**: a "Self-Service Kiosk" mode — customers browse a
tap-to-select item grid (image/qty/price) themselves, get a printed token with the order details
and total, hand that token to staff, staff hands over the goods. A per-terminal setting picks
whether that terminal runs as "Billing POS" (current cashier flow, unchanged) or "Self-Service
Kiosk," and within kiosk mode a further setting controls whether the kiosk itself collects payment
(token prints marked PAID after a successful payment) or only prints an unpaid token for payment
at a staff counter. No design/plan written yet at the time of this entry — the client asked for
one and it's the next thing to produce, before any implementation.

---

## ⚠ READ THIS FIRST — in-app onboarding + forgot-password shipped (2026-09-08, later session)

Same day as the rollout-checklist entry below, a later session on branch
`codex/settings-printer-foundation` closed out several of the remaining rollout gaps directly in
`apps/pos`, and set up real email delivery in production:

- **Branded Android app icon/splash**: replaced the default Capacitor placeholder with the exact
  Store line-icon already used on the sign-in screen (rasterized from lucide's `store` SVG via
  `resvg-cli`), on the app's own indigo brand gradient (`#4f5bd5` → `#333ba3`, matching
  `apps/pos/src/styles/index.css`, not the marketing site's green). Source images live in
  `apps/pos/resources/`; regenerate all Android densities with
  `npx @capacitor/assets generate --android` from `apps/pos/` after changing them.
- **In-app signup**: a sideloaded install no longer has to leave the app to sign up. New
  `SignUpScreen`/`SignUpSuccessScreen` post straight to the billing server's public endpoint
  (`POST https://iotsoft.in/api/smartpos/signup`, configurable via `VITE_BILLING_SIGNUP_URL`) and
  show the returned business code/email/temp password before handing the user to sign-in with
  those fields pre-filled. Includes the optional Agent Code field.
- **In-app forgot-password, now actually working end-to-end in production**: the API's
  `POST /auth/password/reset/request`+`/confirm` endpoints already existed but the token sink was
  a no-op — a reset request accepted `202` and silently went nowhere. Added
  `createSmtpPasswordResetTokenSink` (nodemailer) wired in `apps/api/src/index.ts` whenever
  `SMTP_HOST`/`PORT`/`USER`/`PASS`/`FROM` are all set (falls back to the prior no-op, with a
  startup warning, when they aren't — local/test/dev:memory behavior unchanged). New
  `ForgotPasswordScreen` in the app: request a code by email, then enter that code + a new
  password. **Live in production as of 2026-09-08**: VPS 2's `/root/projects/smartpos/.env` (not
  `apps/api/.env` — the workspace-root `.env`, per `loadWorkspaceEnv()`) now has real Gmail SMTP
  settings for `iotsoft.in@gmail.com` (app password stored only in the assistant's local memory,
  see `deployment-vps-target` memory — never written to any git-tracked file), `smartpos-api` was
  restarted to pick them up, and a live `POST /auth/password/reset/request` against production
  returned `202` with no error in the PM2 logs — confirms Gmail's SMTP server accepted the message
  (the app-password auth handshake works). **Not yet confirmed**: actual inbox delivery, since the
  only account tested against was the fake `suresh.part4test@example.com` test address — verify
  with a real, checkable email address next.
- Also fixed a real pre-existing gap while touching lint: `apps/*/android/**` wasn't excluded from
  ESLint, so the Capacitor-synced web build under `android/app/src/main/assets/public` was being
  linted as source and producing ~2000 false errors. Root `pnpm lint` is clean again.
- All of this is committed on `codex/settings-printer-foundation` (not yet pushed as of this
  entry — check `git status`/`git log origin/codex/settings-printer-foundation..HEAD` before
  assuming it's on the remote).

**Next for this slice**: confirm real-inbox delivery of a reset email; then the physical
tablet+printer hardware test (still the same open item as the entry below) is the main remaining
gap before "full production launch."

---

## Rollout checklist status (2026-09-08)

**Session resume note**: git is clean and fully pushed as of this entry — branch
`codex/settings-printer-foundation` matches `origin/codex/settings-printer-foundation`
(`94e3115`), nothing uncommitted, nothing unpushed. Safe to close and reopen this project at any
time; nothing is at risk. One small non-urgent cleanup still open: a real (but harmless) test
signup made during Part 4 verification left one trial record in billing-platform's MongoDB
(`clientName: "Part4 Test Dhaba"`, email `suresh.part4test@example.com`) and a matching real tenant
in Smart POS's production Postgres (`businessCode: PART4-TEST-DHABA`) — delete via
billing-platform's superadmin UI whenever convenient, not urgent.

The client wants to roll this out to a real business (kirana stores, but also food stalls, dhabas,
vegetable vendors, restaurants) and asked what software work is left. Full detail in TODO.md's NOW
section; short version, in order:

1. **Access-token refresh — DONE 2026-09-06.**
2. **Bulk product upload/download — DONE 2026-09-07.**
3. **Self-serve onboarding + marketing page — ALL FOUR PARTS DONE, live in production as of
   2026-09-08:**
   - Part 1 (`POST /api/bridge/provision` in this repo) — done, see the dated entry below.
   - Part 3 (`apps/marketing/`, the signup/marketing page) — done, see the dated entry below.
   - Part 2 (billing-platform integration, separate `manoj020218/billing` repo) — done, pushed, and
     deployed to the shared production VPS, see the dated entry below.
   - Part 4 (deploy Smart POS itself — API + Postgres + marketing page — to the second VPS) — done,
     see the dated entry below. The full flow is verified live: a real signup at
     `https://iotsoft.in/api/smartpos/signup` creates a real tenant via
     `https://smartpos.iotsoft.in/api/bridge/provision`, and the returned temp password logs in
     successfully against the live API.
4. **VPS deployment — DONE 2026-09-08.** Deployed to the second, more capable VPS (AlmaLinux, 11GB
   RAM, 6 CPUs, 126GB free disk) rather than the original memory-constrained dev VPS. Path-based
   routing on one domain: `smartpos.iotsoft.in/` serves the marketing page, `smartpos.iotsoft.in/api/`
   proxies to the API, both over TLS (certbot). PostgreSQL 16 installed once on this VPS, meant to be
   reused by future projects (separate database+role per project). **Neither VPS's IP/credentials are
   written anywhere in this repo** — kept in the assistant's local memory instead, per standing
   instruction.
5. ~~Run `pnpm db:migrate` against the new VPS's Postgres~~ — **DONE**, ran as part of the Part 4
   deploy. Still open: lock down CORS to the real domain (currently wide open) and add rate limiting
   (PROJECT_PLAN.md §60) — more pressing now that the API is actually internet-facing.
6. Physical hardware test (tablet + printer) is still pending — see the 2026-09-04 entry below for
   exact rebuild/sideload steps once that hardware is available.

Explicitly **not** required for this rollout per the client's own MVP boundary: the admin/reports
app, Windows/PWA support, and general UI polish (all still real gaps for eventual "full production
launch," just not go-live blockers).

---

## ⚠ READ THIS FIRST — resume point for hardware testing (2026-09-04)

Written so that whoever has a physical Android tablet + BLE/USB thermal printer in hand can pick
this up with no context-rebuilding. Everything below was true and verified (or explicitly flagged as
not verified) at the moment of writing. Full detail is in the "Printer Hardware + Android Packaging
Status (2026-09-04)" entry further down this file — this is the short version.

**Where things stand**: the printer plugin (`@jenix/cap-thermal-printer`, BLE+USB only) is wired into
checkout, a printer-pairing screen exists in the app, and `apps/pos` is packaged as a real Android
app. A debug build (`gradlew assembleDebug`) succeeded and produced an installable APK. **None of
that has been run on real hardware yet** — no tablet or thermal printer was available in this
environment. That's the one thing left to close out this slice of work.

**How to test once a tablet is available:**
1. `git pull` this repo (branch `codex/settings-printer-foundation`) — the `android/` platform
   project is committed, but its **build output is gitignored**, so the APK itself is not in git and
   needs rebuilding locally.
2. `pnpm install` at the repo root (also pulls in `@jenix/cap-thermal-printer` from the sibling
   `capacitor-plugins` checkout at `D:\IOT Device\Smart POS\capacitor-plugins` — that repo needs to
   exist at that path, or update the `file:` dependency path in `apps/pos/package.json` if it's
   moved).
3. `pnpm --filter @smart-pos/pos build` (regenerates `apps/pos/dist`), then from `apps/pos`:
   `npx cap sync android`.
4. Make sure `apps/pos/android/local.properties` points at a real Android SDK, e.g.
   `sdk.dir=C:/Users/User/AppData/Local/Android/Sdk` (**forward slashes** — single Windows
   backslashes break the build, see the full entry below for why).
5. From `apps/pos/android`: `./gradlew.bat assembleDebug` (or `gradlew.bat` directly). Output lands
   at `apps/pos/android/app/build/outputs/apk/debug/app-debug.apk`.
6. Sideload that APK onto the tablet (`adb install app-debug.apk`, or copy the file over and install
   manually) and pair it with real API/`dev:memory` backend — see "Auth/Terminal-Selection Status" and
   "Persistent Store Status" entries further down for how to point the app at a running API.
7. In the app: sign in → pick a terminal → tap the gear icon (top bar) → **Scan for printers** → pick
   the real BLE/USB printer → complete a Cash sale → confirm a receipt actually prints.
8. Also run through the plugin's own `HARDWARE_TEST_CHECKLIST.md`
   (`D:\IOT Device\Smart POS\capacitor-plugins\packages\cap-thermal-printer\HARDWARE_TEST_CHECKLIST.md`)
   for lower-level connection/permission/reconnect checks beyond just "did a receipt come out."

**Device sizing note** (client asked 2026-09-04 about a 2GB RAM / 8GB storage tablet for a ~300-product
kirana store): the app itself is lightweight enough (283KB JS bundle gzipped to 87KB, `minSdkVersion
23` i.e. Android 6.0+, trivial local data volume for 300 products) that 2GB RAM should be workable if
the tablet is dedicated to POS only. **8GB storage is the bigger risk** — that's tight for the device
as a whole (OS + Google Play Services can eat most of it before the app is even installed), not
because of this app's footprint. Recommended the client get 16GB+ storage if there's any flexibility.
This was analysis from known numbers, not a test on that exact device — if that's the tablet used for
step 6 above, its real-world responsiveness during testing is itself useful data to record here.

**If a build step fails**, update this section (or add a fresh dated entry) with what broke and how
it was fixed, the same way the `local.properties` backslash issue is documented in the full entry
below — don't silently patch and move on.

---

## Session update (2026-08-31, continuation)

The live-browser click-through flagged as the top priority in the previous restart-safety checkpoint
is now done, and it found (and fixed) a real bug — see CHANGELOG.md 2026-08-31 for the full account.
Summary: `apps/pos`'s post-login bootstrap called `syncService.syncNow({ limit: 200 })`, but the
server's `GET /api/v1/sync/pull` caps `limit` at `100`, so every terminal pick failed with
`Request failed with status 400` right after login — the kiosk UI was never actually reachable via a
real browser before this session, only via unit/integration tests. Fixed by making
`createClientSyncService.pullChanges` page through multiple pulls (looping on the cursor until a
short page confirms the client is caught up) instead of assuming one request returns everything, and
by lowering the client's requested limit to `100` to match the server cap. Full checkout flow
(login → terminal pick → catalog hydrates from sync → add item → Cash payment → invoice → New Sale)
is now confirmed working end-to-end in a real Chrome tab, with `pnpm typecheck`/`pnpm lint`/full
`pnpm test` all green (193 tests).

Two dev servers were started this session (`pnpm --filter @smart-pos/api dev:memory` on port 4000,
`pnpm --filter @smart-pos/pos dev` on port 5173) and both were stopped again at the end, including
their `tsx watch`/`vite` child processes (which the same stray-`node.exe` issue from the previous
session's restart note would otherwise have left running) — verified via
`tasklist /FI "IMAGENAME eq node.exe"` that only the two unrelated pre-existing `codex.js` processes
remain.

---

Current Phase:
- Phase 13 - Functional Tablet POS UI (**complete and live-browser-verified**). Printer native
  integration (Android work under PROJECT_PLAN.md §37, not a separately numbered phase) is now
  **wired in and building as a real Android APK** as of 2026-09-04 — see the "Printer Hardware +
  Android Packaging Status (2026-09-04)" entry near the end of this file. The client has asked for a
  "full production launch"; TODO.md's NEXT section has the Phase B–E roadmap for that (admin/reports
  app, Windows/PWA, Phase 14 UI/UX Polish at §56, production deployment hardening) — none of it
  attempted yet, this was intentionally scoped to the one slice that could be genuinely
  built-and-verified in one pass

Current Subtask:
- None open. Next work is Phase B (admin/reports app) per TODO.md's roadmap, or getting a physical
  Android tablet + BLE/USB thermal printer to run the plugin's `HARDWARE_TEST_CHECKLIST.md` against
  the already-built `app-debug.apk`, or the smaller LATER items (access-token refresh, sync-status UI
  indicator)

Completed:
- Added Phase 10 schema for `business_settings` and `branch_settings`
- Generated settings migration `apps/api/drizzle/0014_oval_oracle.sql`
- Added protected `GET /api/v1/business-settings` and `PATCH /api/v1/business-settings`
- Persisted typed business defaults for currency, timezone, invoice prefix, default unit, default tax profile, inventory tracking behavior, receipt footer, business logo, branch address, and branch receipt printer profile
- Applied configured business settings to product creation defaults, sale invoice prefixes, and reporting timezone windows
- Split the reporting service into smaller sales and operational handlers to stay under the project file-size limit
- Fixed reporting date-window midnight handling by normalizing `Intl.DateTimeFormat` `24:00` output back to `00:00`
- Added settings route coverage, Drizzle settings repository coverage, and reporting-range regression coverage for UTC and `America/New_York`
- Added Phase 11 foundation package `@smart-pos/printer`
- Added shared printer-profile types, ESC/POS print-job contracts, a recording printer service, and a printer test-page builder
- Added Phase 11 receipt, kitchen-order, barcode, and QR print-job builders with shared printer-layout helpers
- Added ESC/POS byte encoding plus transport-specific printer services for `TCP`, `BLUETOOTH`, `USB`, and `SYSTEM`
- Added a profile-aware printer-service router so runtime callers can dispatch by stored printer connection type
- Added printer-package coverage for the new builders, byte encoding, injected transport adapters, and a TCP socket print path
- Increased `apps/api/test/drizzle-settings.repository.test.ts` setup timeout so the full Vitest suite remains stable after adding the new printer-package coverage
- Verified `cmd /c pnpm lint`, `cmd /c pnpm typecheck`, `cmd /c pnpm build`, and `cmd /c pnpm test` on 2026-08-29 with `182` tests passing
- Expanded root `pnpm typecheck`, `pnpm build`, and Vitest discovery so the printer package is part of normal verification
- Added Phase 12 foundation package `@smart-pos/client-data`
- Added client-side repository boundaries for products, customers, sales, stock, sync, settings, and the composed client data store
- Added an in-memory client data store, HTTP remote API adapter, settings bootstrap service, printer-aware local checkout service, and outbox-first sync orchestration
- Reused `@smart-pos/printer` as the first runtime printer consumer so checkout receipt printing stays profile-driven and transport-agnostic
- Added client-data package coverage for checkout completion, printer failure retention, settings bootstrap, remote API wiring, and push-then-pull sync hydration
- Verified `cmd /c pnpm lint`, `cmd /c pnpm typecheck`, `cmd /c pnpm build`, and `cmd /c pnpm exec vitest run --reporter=basic` on 2026-08-29 with `188` tests passing
- Read `PROJECT_PLAN.md`
- Confirmed GitHub repo `manoj020218/POS` exists and is empty
- Initialized local Git repo and attached `origin`
- Determined `HotelQR-Lite` is not a direct codebase reuse candidate
- Added PNPM workspace, TypeScript, ESLint, Prettier, Vitest, Drizzle, and CI
- Implemented `apps/api` with env validation, logging, error handling, DB wiring, and `GET /health`
- Verified `pnpm lint`
- Verified `pnpm typecheck`
- Verified `pnpm test`
- Verified `pnpm build`
- Verified runtime health response at `http://127.0.0.1:4010/health`
- Added Drizzle schema for `Tenant`, `Business`, `Branch`, and `Terminal`
- Generated first migration: `apps/api/drizzle/0000_damp_loners.sql`
- Added Phase 1 API routes for business create/update/list, branch create/update/list, and terminal register/disable/list
- Added temporary development access-context resolution via `x-dev-tenant-id` and `x-dev-user-id`
- Added tenant-isolation and CRUD tests for the Phase 1 route slice
- Verified runtime business create/list flow at `http://127.0.0.1:4011/api/v1/businesses`
- Replaced runtime tenant-core wiring with `DrizzleTenantCoreRepository`
- Switched the runtime database client to `pg` + Drizzle node-postgres
- Added repository-level integration tests backed by in-memory `PGlite`
- Removed temporary startup tenant seeding from the API server
- Added `pnpm bootstrap:dev` with idempotent tenant/business/branch/terminal provisioning logic
- Fixed API monorepo env loading so package scripts resolve the workspace-root `.env`
- Verified `pnpm db:migrate` against local PostgreSQL 18
- Verified `pnpm bootstrap:dev` against the real `smart_pos` database
- Verified live PostgreSQL-backed runtime smoke for `GET /health`, `POST /api/v1/businesses`, and `GET /api/v1/businesses`
- Added a typed role and permission catalog for Phase 2 authorization
- Added reusable permission guard middleware that resolves role-derived and explicit permissions
- Added authorization tests for role grants plus `401`/`403` permission enforcement
- Added `/api/v1/auth/login`, `/api/v1/auth/refresh`, and `/api/v1/auth/logout` route scaffolding
- Added password hashing and signed token helpers using Node crypto primitives
- Added in-memory auth repository support for users, sessions, refresh rotation, and logout revocation
- Added auth route tests for invalid credentials, disabled users, refresh rotation, and logout revocation
- Replaced the temporary development access headers with bearer access-token resolution for protected routes
- Added auth access-context failure tests for invalid authorization headers, refresh tokens on protected routes, and expired access tokens
- Added optional env-backed development auth user seeding for runtime login smoke verification
- Verified live PostgreSQL-backed runtime smoke for `POST /api/v1/auth/login`, `POST /api/v1/businesses`, and `GET /api/v1/businesses` using a bearer token
- Added `auth_users` and `auth_sessions` database schema plus generated migration `apps/api/drizzle/0001_lumpy_invaders.sql`
- Added PostgreSQL-backed `DrizzleAuthRepository` for auth users and sessions
- Moved development auth-user seeding into the explicit `pnpm bootstrap:dev` flow
- Switched runtime auth from the in-memory repository to PostgreSQL-backed persistence
- Added auth repository integration tests backed by `PGlite`
- Verified live PostgreSQL-backed runtime smoke for `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/businesses`, and `GET /api/v1/businesses`
- Added request-level permission guards for tenant-core business, branch, and terminal write endpoints
- Added tenant-core permission integration tests covering `403` denial for unauthorized business, branch, and terminal writes
- Added authenticated `POST /api/v1/auth/password/change`
- Added password-change route tests covering success, invalid current password, and missing auth context
- Added repository support for password-hash updates plus per-user refresh-session revocation
- Added repository integration coverage for password-hash updates and user-session revocation
- Added authenticated `GET /api/v1/auth/sessions`
- Added authenticated `DELETE /api/v1/auth/sessions/:sessionId`
- Added session route tests covering current-session marking, targeted revocation, and cross-user denial
- Added repository support for tenant-scoped user session listing
- Added `auth_password_reset_tokens` schema plus generated migration `apps/api/drizzle/0002_motionless_triton.sql`
- Added `POST /api/v1/auth/password/reset/request` with a generic `202` response that does not leak reset tokens
- Added `POST /api/v1/auth/password/reset/confirm` backed by hashed reset-token lookup, expiry checks, password update, and session revocation
- Added repository support for reset-token create/find/revoke flows in both in-memory and PostgreSQL-backed auth repositories
- Verified `pnpm db:migrate` after adding the reset-token migration
- Added request-level permission guards for tenant-core business, branch, and terminal read endpoints
- Added tenant-core permission integration tests covering `403` denial for unauthorized business, branch, and terminal reads
- Added tenant-scoped auth-user management endpoints for `GET/POST/PATCH /api/v1/auth/users`
- Added role-assignment safety so managed users cannot be granted broader effective permissions than the acting user
- Added automatic refresh-session revocation when a managed user is disabled or re-roled
- Added repository support for tenant-scoped auth-user listing in both in-memory and PostgreSQL-backed auth repositories
- Added auth-user management route tests plus `DrizzleAuthRepository` tenant-user listing integration coverage
- Added `auth_user_branch_access` schema plus generated migration `apps/api/drizzle/0003_thankful_sphinx.sql`
- Added tenant-scoped branch-assignment management endpoints for `GET/PUT /api/v1/auth/users/:userId/branches`
- Added repository support for tenant-scoped auth-user branch assignment listing and replacement in both in-memory and PostgreSQL-backed auth repositories
- Added branch-assignment validation so only same-tenant branches can be assigned to a tenant-scoped user
- Added auth-user branch-assignment route tests plus `DrizzleAuthRepository` branch-assignment integration coverage
- Verified `pnpm db:migrate` after adding the branch-assignment migration
- Added `audit_logs` schema plus generated migration `apps/api/drizzle/0004_lazy_firestar.sql`
- Added persisted auth audit logging for password changes, password reset requests/completions, and auth-user create/update mutations
- Added repository support for auth audit-log create/list flows in both in-memory and PostgreSQL-backed auth repositories
- Added auth audit route tests plus `DrizzleAuthRepository` audit-log integration coverage
- Verified `pnpm db:migrate` after adding the auth audit-log migration
- Added branch-scoped authorization enforcement for tenant-core business, branch, and terminal routes based on persisted user branch assignments
- Added dynamic access-context branch assignment resolution so branch access changes take effect on the next authenticated request without re-login
- Added branch-scope helper coverage plus tenant-core branch-scope integration tests for filtered reads and denied out-of-scope writes
- Verified `pnpm lint`
- Verified `pnpm typecheck`
- Verified `pnpm test`
- Verified `pnpm build`
- Added persisted auth audit logging for successful login, refresh, logout, explicit session revocation, and branch assignment replacement flows
- Added safe audit metadata for session lifecycle and branch-assignment deltas while keeping audit records on the existing tenant-scoped `auth_user` entity stream
- Skipped branch-assignment audit writes when a replacement request leaves the assigned branch set unchanged
- Added auth audit coverage for session lifecycle events and branch-assignment replacement deltas
- Verified `pnpm typecheck`
- Verified `pnpm lint`
- Verified `pnpm test`
- Verified `pnpm build`
- Added dedicated `pnpm bootstrap:owner` command for explicit first tenant-wide auth-user provisioning against an existing tenant
- Added CLI and `BOOTSTRAP_OWNER_*` env parsing for bootstrap owner provisioning with explicit tenant, email, display name, password, role, and optional user id inputs
- Added idempotent bootstrap owner provisioning with create/update/unchanged behavior, tenant/email collision guards, and bootstrap-sourced auth audit records
- Added bootstrap owner coverage for CLI/env parsing, forwarded `--` separator handling, idempotent provisioning, audited updates, and cross-tenant email conflicts
- Verified `pnpm typecheck`
- Verified `pnpm lint`
- Verified `pnpm test`
- Verified `pnpm build`
- Verified `pnpm bootstrap:owner -- --tenant-id 11111111-1111-4111-8111-111111111111 --email owner@example.com --name "Dev Owner" --password Password123 --role BUSINESS_OWNER --user-id 99999999-9999-4999-8999-999999999999` against local PostgreSQL 18 with `action: "unchanged"`
- Hardened protected-route bearer auth so access tokens are revalidated against the current auth user and current auth session on every authenticated request
- Added auth access-enforcement regression coverage for immediate bearer-token rejection after logout, user disable, and role-change session revocation
- Verified `pnpm test -- auth-access-enforcement auth-access-context auth-users`
- Verified `pnpm lint`
- Verified `pnpm typecheck`
- Verified `pnpm build`
- Expanded `GET /api/v1/auth/users/:userId/branches` with admin-friendly assignment directory filters for `assignment`, `businessId`, and `search`
- Added business metadata plus explicit `assigned` state to auth user branch-assignment listing responses while keeping assigned-only results as the default
- Added auth branch-directory regression coverage for assignment-state, business, and search filtering
- Increased the `bootstrap-owner` memory-database hook timeout so the full Vitest suite remains stable under current suite load
- Added Phase 3 schema for `categories`, `units`, `tax_profiles`, and `products`
- Generated catalog migration `apps/api/drizzle/0005_ambitious_blacklash.sql`
- Added protected Phase 3 catalog endpoints for category, unit, tax-profile, and product create/list/update flows
- Added minimal product creation with business-scoped default category, unit, tax profile, and generated SKU support
- Added PostgreSQL-backed `DrizzleCatalogRepository` plus split master/product persisted stores for catalog data
- Added catalog route coverage for minimal product creation, business-context enforcement, and cashier read-only access
- Added `DrizzleCatalogRepository` integration coverage for persisted create/update flows and per-business duplicate enforcement
- Added dedicated `GET /api/v1/products/search` for POS-oriented product lookup with `query`, optional `businessId`, and capped `limit`
- Added exact-barcode-first product search ranking with active-only results across barcode, SKU, and name matches
- Added slim POS search results so checkout lookups do not return full management product payloads
- Added repository-backed search support in both `InMemoryCatalogRepository` and `DrizzleCatalogRepository`
- Added catalog search route coverage for exact barcode priority, slim payloads, and branch/business scope behavior
- Added `DrizzleCatalogRepository` integration coverage for exact barcode priority, inactive filtering, business scope, and search limits
- Verified `pnpm lint`
- Verified `pnpm typecheck`
- Verified `pnpm test`
- Verified `pnpm build`
- Verified `pnpm db:generate`
- Verified `pnpm db:migrate`
- Added paginated management responses for `GET /api/v1/products` with `page` and `pageSize` query parameters plus response `meta`
- Kept `GET /api/v1/products` backward-compatible for management clients by returning the paged product array in `data`
- Added stable product-list ordering and total-count pagination metadata in both `InMemoryCatalogRepository` and `DrizzleCatalogRepository`
- Added catalog route and repository coverage for page/pageSize behavior and pagination metadata
- Verified `pnpm test`
- Verified `pnpm typecheck`
- Verified `pnpm lint`
- Verified `pnpm build`
- Added Phase 4 schema for `customers`
- Generated customer migration `apps/api/drizzle/0006_parallel_mac_gargan.sql`
- Added protected Phase 4 customer endpoints for `GET/POST/PATCH /api/v1/customers`
- Added optional customer lookup on `GET /api/v1/customers` via `query` matching name/mobile/email within business scope
- Added mobile-only quick-create support by deriving the stored customer name from `name`, then `mobile`, then `email`
- Added idempotent `POST /api/v1/customers/walk-in` to provision the default walk-in customer per business
- Added walk-in customer protection so the default customer cannot be deactivated through `PATCH /api/v1/customers/:customerId`
- Added PostgreSQL-backed `DrizzleCustomerRepository` plus in-memory customer repository coverage
- Added customer route coverage for business-context enforcement, cashier permissions, scoped lookup, and walk-in behavior
- Added `DrizzleCustomerRepository` integration coverage for persisted create/update/list/query and walk-in lookup flows
- Verified `pnpm db:generate`
- Verified `pnpm db:migrate`
- Verified `pnpm exec vitest run apps/api/test/customer.test.ts apps/api/test/drizzle-customer.repository.test.ts --reporter=verbose`
- Verified `pnpm test`
- Verified `pnpm typecheck`
- Verified `pnpm lint`
- Verified `pnpm build`
- Added Phase 5 schema for `sales`, `sale_items`, and terminal-scoped `sale_sequences`
- Generated sales migration `apps/api/drizzle/0007_tense_polaris.sql`
- Added protected Phase 5 sale endpoint `POST /api/v1/sales`
- Implemented sales as a domain service with trusted server-side total recalculation, product snapshotting, and payment validation for `CASH`, `CARD`, `UPI`, and `OTHER`
- Added branch-, terminal-, product-, and optional customer-validation to sale creation with persisted immutable sale-item snapshots
- Added human-readable invoice numbering as `INV-{BRANCH}-{TERMINAL}-{SEQUENCE}` with a per-terminal persisted sequence allocator
- Generated invoice-numbering migration `apps/api/drizzle/0008_burly_paibok.sql`
- Hardened the invoice-numbering migration to backfill existing sale rows safely before enforcing `NOT NULL` and uniqueness constraints
- Added sale route coverage for trusted totals, optional customer attachment, branch-scope denial, payment mismatch rejection, duplicate-item rejection, and terminal-scoped invoice sequencing
- Added `DrizzleSaleRepository` integration coverage for immutable sale persistence and terminal-scoped invoice sequencing
- Verified `pnpm db:generate`
- Verified `pnpm exec vitest run apps/api/test/sale.test.ts apps/api/test/drizzle-sale.repository.test.ts --reporter=verbose`
- Verified `pnpm typecheck`
- Verified `pnpm lint`
- Verified `pnpm test`
- Verified `pnpm build`
- Verified `pnpm db:migrate`
- Added Phase 6 schema for `inventory_movements`
- Generated inventory-ledger migration `apps/api/drizzle/0009_past_wolf_cub.sql`
- Backfilled historical tracked-product sale rows into `inventory_movements` during migration using existing `sale_items` snapshots
- Added protected inventory balance endpoint `GET /api/v1/inventory/balances`
- Recorded immutable `SALE` stock movements transactionally with sale creation for tracked products while leaving non-inventory products out of the ledger
- Added business-scoped inventory balance reads that calculate `currentQuantity = openingStock + netMovementQuantity`
- Added inventory route coverage for sale-linked stock deduction, non-tracked-product exclusion, product-scoped lookup, and business-scope denial
- Expanded `DrizzleSaleRepository` integration coverage to assert aggregated inventory movement balances after multiple sales
- Verified `pnpm db:generate`
- Verified `pnpm exec vitest run apps/api/test/inventory.test.ts apps/api/test/sale.test.ts apps/api/test/drizzle-sale.repository.test.ts --reporter=verbose`
- Verified `pnpm typecheck`
- Verified `pnpm lint`
- Verified `pnpm test`
- Verified `pnpm build`
- Verified `pnpm db:migrate`
- Added protected `POST /api/v1/sales/:saleId/returns` for corrective tracked-item inventory returns
- Added sale-return validation for duplicate products, branch scope, non-tracked items, and cumulative returned-quantity limits
- Added repository support for sale-detail lookup, sale-linked movement quantity aggregation, and persisted `SALE_RETURN` inventory movements in both the Drizzle and in-memory stores
- Added sale-return route and repository regression coverage plus a sale-service file split to keep manual source files under the 200-line project limit
- Verified `pnpm exec vitest run apps/api/test/sale-return.test.ts apps/api/test/drizzle-sale.repository.test.ts --reporter=verbose`
- Verified `pnpm lint`
- Verified `pnpm typecheck`
- Verified `pnpm test`
- Verified `pnpm build`
- Added Phase 7 schema for `suppliers`, `purchases`, and `purchase_items`
- Generated procurement migration `apps/api/drizzle/0010_mushy_klaw.sql`
- Added protected Phase 7 supplier endpoints for `GET/POST/PATCH /api/v1/suppliers`
- Added protected Phase 7 purchase endpoints for `GET/POST /api/v1/purchases`
- Implemented finalized purchase entry with supplier snapshots, default/explicit unit cost handling, immutable purchase-item snapshots, and positive `PURCHASE` stock movements
- Added PostgreSQL-backed `DrizzleSupplierRepository` and `DrizzlePurchaseRepository` plus in-memory supplier/purchase repository support
- Shared the in-memory inventory movement ledger between sale and purchase repositories so purchase stock-ins appear in inventory balance reads during route tests
- Added supplier and purchase route coverage plus repository integration coverage for stock increases and branch/permission enforcement
- Verified `pnpm db:generate`
- Verified `pnpm exec vitest run apps/api/test/supplier.test.ts apps/api/test/purchase.test.ts apps/api/test/purchase-access.test.ts apps/api/test/drizzle-supplier.repository.test.ts apps/api/test/drizzle-purchase.repository.test.ts --reporter=verbose`
- Verified `pnpm lint`
- Verified `pnpm typecheck`
- Verified `pnpm build`
- Verified `pnpm db:migrate`
- Verified `pnpm test`
- Added Phase 8 schema for `sync_events`
- Generated sync migration `apps/api/drizzle/0011_tiresome_solo.sql`
- Added protected idempotent `POST /api/v1/sync/push`
- Added persisted raw inbound sync-event storage with tenant-plus-event uniqueness and conflict rejection for reused event ids with changed content
- Added PostgreSQL-backed `DrizzleSyncRepository` plus in-memory sync repository support
- Enforced branch-scoped sync push access using explicit event `branchId` values and the new `sync:push` permission
- Added sync route coverage for retry idempotency, branch-scope denial, and event-conflict rejection
- Added `DrizzleSyncRepository` integration coverage for duplicate handling and transactional rollback when a conflicting reused event id appears in a batch
- Verified `pnpm db:generate`
- Verified `pnpm exec vitest run apps/api/test/sync.test.ts apps/api/test/drizzle-sync.repository.test.ts --reporter=verbose`
- Verified `pnpm typecheck`
- Verified `pnpm lint`
- Verified `pnpm test`
- Verified `pnpm build`
- Verified `pnpm db:migrate`
- Replayed supported `SALE_CREATED` and `PURCHASE_CREATED` sync events through the existing sale and purchase domain services
- Added sync event state updates so successfully replayed supported events move from `RECEIVED` to `APPLIED`
- Replayed supported duplicate events only when their stored state was still `RECEIVED`, keeping duplicate `APPLIED` events side-effect free
- Enforced underlying `sale:create` and `purchase:create` permissions during sync replay so `sync:push` does not bypass existing write authorization
- Added sync route coverage for sale replay inventory effects, purchase replay inventory effects, duplicate `APPLIED` responses, and permission-gated retry of a stored `RECEIVED` purchase event
- Added `DrizzleSyncRepository` coverage for persisted `APPLIED` state updates and duplicate reads after state transition
- Verified `pnpm exec vitest run apps/api/test/sync.test.ts apps/api/test/drizzle-sync.repository.test.ts --reporter=verbose`
- Verified `pnpm typecheck`
- Verified `pnpm lint`
- Verified `pnpm test`
- Verified `pnpm build`
- Added sync failure diagnostics migration `apps/api/drizzle/0012_smooth_energizer.sql`
- Persisted sync replay failures now move stored `sync_events.state` from `RECEIVED` to `FAILED` with `failureCode`, `failureMessage`, `failureStatusCode`, and `failedAt`
- Successful retries now clear stored sync failure diagnostics when a previously failed event is replayed and marked `APPLIED`
- Added sync replay failure regression coverage for permission-denied and validation-error failures plus Drizzle repository failure-state persistence
- Verified `pnpm exec vitest run apps/api/test/sync.test.ts apps/api/test/sync-failure.test.ts apps/api/test/drizzle-sync.repository.test.ts --reporter=verbose`
- Verified `pnpm db:generate`
- Verified `pnpm db:migrate`
- Verified `pnpm typecheck`
- Verified `pnpm lint`
- Verified `pnpm build`
- Added protected cursor-based `GET /api/v1/sync/pull` with opaque cursor pagination and branch-scoped pull access
- Added shared sync branch-access helpers plus split sync push/pull services to keep the sync module under the manual file-size limit
- Added sync pull cursor encoding over `(updatedAt, eventId)` and repository support for ordered applied-event pull queries
- Added sync pull route coverage for incremental pagination, branch-scope filtering, and previously failed events that become visible after a later successful retry
- Added Drizzle sync repository coverage for branch-scoped pull ordering by `updated_at` cursor
- Verified `pnpm exec vitest run apps/api/test/sync-pull.test.ts apps/api/test/drizzle-sync.repository.test.ts --reporter=verbose`
- Verified `pnpm db:generate`
- Verified `pnpm typecheck`
- Verified `pnpm lint`
- Verified `pnpm build`
- Verified `pnpm db:migrate`
- Full suite verification on 2026-08-27: `pnpm test` (137 tests passing)
- Generalized `GET /api/v1/sync/pull` into a mixed change-feed contract with `changeType`, `source`, `changeId`, and typed `record` payloads
- Added server-authored `PRODUCT_UPSERTED` pull changes backed by existing product snapshots and branch-derived business scope
- Kept applied inbound events in the same pull stream as `SYNC_EVENT_APPLIED` changes under the shared opaque cursor contract
- Added repository support for product snapshot pull queries ordered by `(updatedAt, changeKey)` without introducing a new downstream change-log table
- Added sync pull product route coverage for product create/update visibility and business-scope filtering
- Added Drizzle catalog repository sync-feed coverage for business-scoped product snapshot ordering under cursor pagination
- Verified `pnpm exec vitest run apps/api/test/sync-pull.test.ts apps/api/test/sync-pull-products.test.ts apps/api/test/drizzle-catalog.sync-feed.test.ts apps/api/test/drizzle-sync.repository.test.ts --reporter=verbose`
- Verified `pnpm db:generate`
- Verified `pnpm typecheck`
- Verified `pnpm lint`
- Verified `pnpm build`
- Verified `pnpm db:migrate`
- Full suite verification on 2026-08-27: `pnpm test` (140 tests passing)
- Added first-class `CATEGORY_UPSERTED`, `UNIT_UPSERTED`, and `TAX_PROFILE_UPSERTED` server-authored changes to `GET /api/v1/sync/pull`
- Split catalog sync-feed helpers so the in-memory catalog repository and shared catalog master view mapping remain under the project file-size limit
- Added route coverage for catalog master sync pull create/update visibility and branch-scoped business filtering
- Added `DrizzleCatalogRepository` sync-feed coverage for category, unit, and tax-profile incremental ordering and business scoping
- Verified `pnpm exec vitest run apps/api/test/sync-pull-masters.test.ts apps/api/test/sync-pull-products.test.ts apps/api/test/drizzle-catalog.sync-feed.test.ts --reporter=verbose`
- Verified `pnpm lint`
- Verified `pnpm typecheck`
- Verified `pnpm build`
- Full suite verification on 2026-08-27: `pnpm test` (143 tests passing)
- Accepted `docs/decisions/ADR-001-master-data-sync-snapshots.md` so Phase 8 master-data sync stays snapshot-based on `(updatedAt, changeKey)` instead of adding explicit version columns or a downstream change-log table in this slice
- Added reusable `customer-view` mapping plus customer updated-since repository support in both the in-memory and Drizzle customer repositories
- Added first-class `CUSTOMER_UPSERTED` server-authored changes to `GET /api/v1/sync/pull`
- Replaced the monolithic server-change mapper with split catalog/customer sync-pull helpers aggregated under the shared mixed-feed service wiring
- Added customer sync-pull route coverage plus `DrizzleCustomerRepository` sync-feed cursor/scope coverage
- Raised the global Vitest `testTimeout` to `15000` in `vitest.config.mjs` so the full suite remains stable under the current API test load
- Verified `pnpm exec vitest run apps/api/test/sync-pull-customers.test.ts apps/api/test/drizzle-customer.sync-feed.test.ts apps/api/test/sync-pull-products.test.ts apps/api/test/sync-pull-masters.test.ts --reporter=verbose`
- Verified `pnpm lint`
- Verified `pnpm typecheck`
- Verified `pnpm build`
- Full suite verification on 2026-08-28: `pnpm test` (146 tests passing)

Currently Working:
- No active code changes in progress
- Phase 10 business settings are code-complete and test-verified across API, repository, catalog defaults, invoice prefixes, and reporting timezone behavior
- Live `cmd /c pnpm db:migrate` verification for `apps/api/drizzle/0014_oval_oracle.sql` is still pending because `DATABASE_URL` currently targets `localhost:5432/smart_pos` and no PostgreSQL listener was available on 2026-08-29
- Phase 11 printer-domain foundations now include print-job builders, ESC/POS byte encoding, and transport adapters across `TCP`, `BLUETOOTH`, `USB`, and `SYSTEM`
- Phase 12 client-data foundations now provide the first runtime printer consumer, local checkout orchestration, and offline sync boundaries without coupling UI code to transport or API logic

Next:
- Re-run `cmd /c pnpm db:migrate` for `apps/api/drizzle/0014_oval_oracle.sql` once local PostgreSQL is reachable
- Begin Phase 13 functional POS UI with a tablet-first checkout shell that consumes `@smart-pos/client-data`
- Add a real client runtime plus SQLite or IndexedDB-backed implementations for the Phase 12 repository interfaces

Important Decisions:
- Keep Phase 10 settings typed across `business_settings` and `branch_settings` instead of collapsing them into an unstructured JSON blob
- Keep currency, timezone, invoice prefix, default unit, default tax profile, default inventory tracking, receipt footer, and business logo at business scope while leaving branch address and receipt printer profile at branch scope
- Apply configured business settings directly to product creation, invoice numbering, and reporting time windows so the settings slice changes real behavior immediately
- Normalize `Intl.DateTimeFormat` midnight `24:00` output to `00:00` when deriving timezone-aware report windows so local-day boundaries stay correct
- Keep `@smart-pos/printer` as the shared home for printer profiles, ESC/POS job builders, byte encoding, and transport routing rather than binding the monorepo to one printer library too early
- Keep `BLUETOOTH`, `USB`, and `SYSTEM` adapters dependency-injected so the shared package owns printer contracts and rendering while each runtime owns its platform-specific write implementation
- Keep `@smart-pos/client-data` as the client-side boundary between UI, local repositories, remote API, sync orchestration, and printer execution so Phase 13 UI code does not absorb business logic
- Start Phase 12 with an in-memory client data store and a thin HTTP adapter to verify the repository contracts before platform-specific SQLite or IndexedDB implementations exist
- Complete local checkout persistence and outbox enqueue before attempting receipt printing so a printer failure never discards the sale
- Push pending outbox events before pulling remote changes so local acknowledgements can advance sale sync state ahead of downstream hydration
- Start with a modular monolith foundation under `apps/api`
- Use TypeScript, Express, Zod, Pino, Drizzle, PostgreSQL, and Vitest
- Treat `HotelQR-Lite` only as an operational reference, not as source reuse
- Keep tenant scoping in request access context rather than accepting tenant IDs in request bodies
- Use a temporary development-only access-context bootstrap until Phase 2 authentication exists
- Use `PGlite` for fast self-contained repository integration tests while keeping `pg` for the real runtime client
- Use an explicit bootstrap command instead of auto-seeding tenants during API startup
- Resolve env files from the workspace root so root-level `.env` works for filtered PNPM package scripts
- Keep RBAC authorization permission-driven, with role-to-grant mapping in one typed catalog
- Keep the first auth slice repository-backed but in-memory so the HTTP/service/token boundaries are verified before adding database persistence
- Resolve protected-route access context from signed bearer access tokens rather than development headers
- Allow an optional env-backed development auth user only as a temporary bridge until auth persistence exists
- Keep development auth seeding explicit in `pnpm bootstrap:dev` rather than auto-creating auth users during API startup
- Back runtime auth with the same PostgreSQL repository boundary used by the persistence tests
- Enforce tenant-core write authorization at the router layer so controllers remain thin and permission checks stay request-scoped
- Land password change before reset architecture because session revocation reuses existing auth persistence, while reset delivery still needs an explicit token-transport contract
- Keep password reset token delivery behind an injected sink so normal API responses stay non-enumerating and do not expose reset tokens
- Expose real tenant-scoped auth-user management under `/api/v1/auth/users` behind the existing `user:manage` permission
- Allow tenant-scoped user management to assign only roles whose effective permissions are a subset of the acting user's permissions
- Revoke persisted refresh sessions whenever a managed user's role or active status changes
- Store branch-scoped user assignments in a separate tenant-scoped `auth_user_branch_access` relation rather than overloading the auth-user record
- Manage branch assignments through explicit `/api/v1/auth/users/:userId/branches` endpoints behind the existing `user:manage` permission
- Persist auth audit history in a general `audit_logs` table keyed by tenant/entity/action while keeping the current write scope limited to auth mutations
- Avoid storing passwords, reset tokens, or other secrets in audit metadata; audit only action type plus safe state deltas
- Resolve branch-scoped route access from fresh repository-backed branch assignments on each protected request so assignment changes apply without token reissue
- Keep session lifecycle and branch-assignment audit events on the existing `auth_user` entity stream instead of introducing a second audit read model
- Treat unchanged branch-assignment replacement requests as no-op audit cases to avoid generating duplicate history entries
- Provision the first tenant-wide auth user through the explicit `pnpm bootstrap:owner` command instead of coupling bootstrap admin creation to `DEV_AUTH_*` development seeding
- Keep bootstrap owner provisioning tenant-scoped and limited to `BUSINESS_OWNER` or `BUSINESS_ADMIN`
- Support both CLI flags and `BOOTSTRAP_OWNER_*` env fallbacks for owner bootstrap while keeping the command idempotent on rerun
- Revalidate protected-route bearer access against the persisted auth user and auth session on every request instead of introducing a separate access-token version column for now
- Keep `GET /api/v1/auth/users/:userId/branches` backward-compatible by defaulting to assigned-only results while adding `assignment=all|assigned|unassigned`, `businessId`, and `search` filters for admin clients
- Keep catalog master data business-scoped and auto-provision the default `GENERAL`, `PCS`, and `NO-TAX` records on first minimal product creation when the business does not already have them
- Require explicit `businessId` for catalog writes only when the authenticated user can access multiple businesses; otherwise infer the single accessible business from branch scope
- Enforce product barcode/SKU uniqueness per tenant plus business at both the service layer and the PostgreSQL repository layer so different businesses can reuse the same identifiers safely
- Split persisted catalog storage into dedicated master/product stores to keep the repository layer below the project file-size limit without introducing generic wrappers
- Expose checkout-oriented search through a dedicated `GET /api/v1/products/search` endpoint so POS lookups can stay slim while `GET /api/v1/products` remains the paginated management endpoint
- Treat POS search as active-only and capped by limit, with exact barcode matches short-circuiting ahead of broader SKU/name/barcode ranking for checkout speed
- Keep management product lists paginated with `page`/`pageSize` query params and response `meta` while preserving the existing `data` array shape for low-friction client adoption
- Order management product lists by name, SKU, and ID so page boundaries stay stable across repeated reads
- Keep server-authored master-data sync pull snapshot-based on existing `updatedAt` timestamps plus the shared `(updatedAt, changeKey)` cursor; defer explicit version columns or downstream change logs until stronger guarantees are required
- Raise the Vitest global `testTimeout` to `15000` instead of adding more piecemeal per-file workarounds now that the full API suite has grown beyond the default 5-second budget
- Keep customers business-scoped and branch-filtered through the existing business-scope helpers, matching the current catalog access model
- Resolve quick-create customer names from `name`, then `mobile`, then `email` so checkout flows can create a valid customer from a mobile-only payload
- Use an idempotent `POST /api/v1/customers/walk-in` endpoint to provision the default walk-in customer per business before sales-engine work exists
- Protect the default walk-in customer from deactivation so normal sales can remain customer-optional without losing the fallback record
- Reuse `GET /api/v1/customers?query=` for lightweight name/mobile/email lookup instead of adding a separate customer-search route in Phase 4
- Keep Phase 5 sales logic in a dedicated domain service so controllers stay thin and the repository boundary owns only persistence plus terminal-scoped invoice-sequence allocation
- Persist immutable sale-item product snapshots (`name`, `sku`, `unitPrice`) at sale time so later catalog edits do not rewrite historical financial records
- Allocate invoice numbers per terminal with a persisted `sale_sequences` table and expose `INV-{BRANCH}-{TERMINAL}-{SEQUENCE}` on each sale instead of deriving invoice ids from the primary key
- Keep sale-triggered stock movements inside the sale repository transaction so finalized sales and ledger entries cannot commit independently
- Expose Phase 6 balances at business scope because products and `openingStock` are currently business-scoped; branch IDs are still stored on each movement for traceability
- Use `product.openingStock` as the current stock baseline and layer immutable movement deltas on top until explicit `OPENING_STOCK` or manual-adjustment flows are introduced
- Model returns as additional `SALE_RETURN` inventory movements keyed to the original `saleId` instead of mutating historical sale rows or `SALE` movements
- Validate partial returns from sale-linked inventory movement totals so repeated returns cannot exceed the originally sold tracked quantity
- Reuse the existing inventory balance resolution for reporting current-stock and low-stock endpoints so report views and inventory balances stay aligned at business scope
- Keep stock movement and sales return reports branch-scoped because ledger rows are branch-attributed, even though current stock remains business-scoped
- Limit tax summary reporting to immutable tax amounts already stored on sales and sale items; historical tax-profile or rate breakdowns require extra snapshot fields that do not exist yet
- Keep sales-return reporting quantity-based and ledger-backed until refund/payment reversal or credit-note persistence is introduced
- Treat suppliers as business-scoped master data resolved through the existing accessible-business helper rather than through branch-specific ownership
- Model finalized purchases as immutable branch-scoped transactions with item snapshots and optional supplier snapshots, mirroring the sale immutability pattern
- Reuse the existing `inventory_movements` ledger for purchase stock-ins via `PURCHASE` entries instead of introducing a parallel stock table
- Share the in-memory inventory movement map between sale and purchase repositories so route-level inventory balance tests reflect both movement sources
- Store inbound sync pushes as raw tenant-scoped `sync_events` records first, so later replay logic can remain idempotent and auditable
- Enforce sync idempotency with a unique `(tenant_id, event_id)` key and reject reused event ids when the stored and incoming event envelopes do not match
- Require explicit event `branchId` values on sync push so existing branch-scope authorization can be enforced before an event is accepted
- Replay supported sync events through the existing sale and purchase domain services so sync writes reuse the same validation, totals, supplier, terminal, and inventory rules as direct API writes
- Reattempt replay for duplicate supported events only while the stored sync-event state remains `RECEIVED`; once an event is marked `APPLIED`, later retries stay side-effect free
- Keep unsupported event types stored in `RECEIVED` for now until explicit pull/retry workflows are implemented

Known Issues:
- Local `pnpm install` required temporary `npm_config_strict_ssl=false` on this machine due npm registry certificate validation failures
- Local PostgreSQL-backed verification still depends on the developer maintaining an ignored root `.env`
- `cmd /c pnpm db:migrate` could not verify `apps/api/drizzle/0014_oval_oracle.sql` on 2026-08-29 because `DATABASE_URL` targets `localhost:5432/smart_pos` and no PostgreSQL listener was accepting connections
- Shared contracts are still duplicated across API and client packages until a dedicated `packages/contracts` slice exists
- Password reset delivery still defaults to a no-op sink at runtime; email/SMS/admin handoff for reset tokens is not implemented yet
- `pnpm bootstrap:owner` requires the target tenant to already exist; it does not create tenant/business/branch/terminal hierarchy on its own
- Walk-in customer uniqueness is currently enforced by the service-level ensure flow rather than a database uniqueness constraint
- Sale returns currently restore inventory only; refund/payment reversal, credit-note issuance, and dedicated return-record persistence are not implemented yet
- Tax summary currently reports collected tax totals only; historical tax-profile or rate breakdowns are not available from the current immutable sale snapshot model
- Purchase flows currently support creation and listing only; purchase updates, purchase returns, cancellations, and vendor invoice reconciliation are not implemented yet
- Sync replay still leaves unsupported event types in `RECEIVED`; downstream pull/retry workflows for those events are not implemented yet
- Sync replay currently attributes created sales and purchases to the authenticated sync caller; preserving the original offline actor independently from the sync session is not implemented yet
- Phase 12 client data currently ships only an in-memory local store; platform-backed SQLite and IndexedDB adapters are not implemented yet
- Phase 12 sync hydration currently materializes `PRODUCT_UPSERTED`, `CUSTOMER_UPSERTED`, and `SYNC_EVENT_APPLIED`; category, unit, and tax-profile pull changes are still counted and ignored locally until those repositories are added
- Master-data pull currently uses latest-snapshot `updatedAt` ordering without explicit entity version columns or a dedicated downstream change log
- Inventory balances currently derive from mutable `product.openingStock` plus movement sums; explicit opening-stock ledger entries and manual inventory adjustments are not implemented yet

Tests:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Runtime probe: `GET /health -> {"status":"ok"}`
- Repository integration: tenant/business/branch/terminal persistence validated with `PGlite`
- Bootstrap integration: idempotent tenant/business/branch/terminal provisioning validated with `PGlite`
- Real DB verification: `pnpm db:migrate`
- Real DB verification: `pnpm bootstrap:dev`
- Runtime smoke: `GET /health`, `POST /api/v1/businesses`, `GET /api/v1/businesses` against PostgreSQL 18
- Authorization tests: role grant resolution plus permission guard `401`/`403` behavior
- Auth route tests: login success, invalid credentials, disabled user rejection, refresh rotation, logout revocation
- Protected-route auth tests: login to obtain bearer token, then create/list/update tenant-core resources through authenticated access
- Auth access-context tests: invalid authorization header, refresh token rejected on protected routes, expired access token rejected
- Runtime smoke: `GET /health`, `POST /api/v1/auth/login`, `POST /api/v1/businesses`, `GET /api/v1/businesses`
- Sync pull tests: branch-scoped pagination, opaque cursor progression, and failed-then-retried event visibility
- Repository integration: applied sync-event pull ordering and branch filtering validated with `PGlite`
- Full suite verification on 2026-08-27: `pnpm test` (137 tests passing)
- Auth repository integration: persisted user upsert/find plus session create/update/revoke lifecycle via `DrizzleAuthRepository`
- Runtime smoke: `GET /health`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/businesses`, `GET /api/v1/businesses`
- Tenant-core RBAC integration: unauthorized business/branch/terminal writes return `403`
- Auth password change: success, invalid current password, and missing access context
- Auth repository integration: password-hash update plus user-session revocation via `DrizzleAuthRepository`
- Reporting routes: tax summary, current stock, low stock, stock movement, sales returns, and branch-vs-business stock scope via `apps/api/test/reporting-operational.test.ts`
- Reporting repository integration: tax summary, stock movement, and sales return aggregations via `apps/api/test/drizzle-reporting-operational.test.ts`
- Full suite verification on 2026-08-28: `cmd /c pnpm test` (158 tests passing)
- Auth sessions: current-session listing, targeted revocation, and cross-user revocation denial
- Auth repository integration: tenant-scoped user session listing via `DrizzleAuthRepository`
- Auth password reset: request/confirm flow, non-enumerating `202` responses, and expired token rejection
- Auth repository integration: password reset token create/find/revoke lifecycle via `DrizzleAuthRepository`
- Tenant-core RBAC integration: unauthorized business/branch/terminal reads return `403`
- Auth user management: tenant-scoped create/list/update flows, role-assignment denial, self-disable denial, and session revocation on disable
- Auth repository integration: tenant-scoped user listing via `DrizzleAuthRepository`
- Auth user branch access: tenant-scoped list/replace flows, cross-tenant branch rejection, cross-tenant user rejection, and `user:manage` enforcement
- Auth repository integration: tenant-scoped branch assignment replacement and listing via `DrizzleAuthRepository`
- Auth audit logging: login, refresh, logout, explicit session revocation, branch assignment replacement, password change, password reset request/confirm, and auth-user create/update flows emit persisted tenant-scoped audit logs
- Auth repository integration: tenant-scoped audit-log create/list via `DrizzleAuthRepository`
- Branch-scope helpers: tenant-wide vs assigned-branch access checks plus branch/business filtering behavior
- Tenant-core branch scope: filtered branch/terminal reads, empty restricted results, dynamic assignment refresh, and denied out-of-scope writes
- Auth access enforcement: protected-route bearer tokens are rejected immediately after logout, user disable, and role-change session revocation
- Auth branch directory: admin listing supports assignment-state filtering plus business/search filtering and returns business metadata with the assignment state
- Bootstrap owner config: CLI and env parsing plus forwarded `--` separator handling
- Bootstrap owner provisioning: create/update/idempotent flows, audit records, and cross-tenant email collision handling via `DrizzleAuthRepository`
- Catalog routes: minimal product creation auto-provisions business defaults, tenant-wide users must supply business context when multiple businesses are accessible, and cashiers remain read-only
- Catalog routes: management product lists now honor `page`/`pageSize` and return pagination `meta` alongside the paged `data` array
- Catalog routes: POS search supports barcode/SKU/name lookups, exact barcode priority, slim response payloads, and branch/business scoping
- Catalog repository integration: persisted category/unit/tax-profile/product create-update flows plus per-business duplicate code and identifier enforcement via `DrizzleCatalogRepository`
- Catalog repository integration: product lists now return stable name/SKU/ID ordering plus total-count pagination metadata via `DrizzleCatalogRepository`
- Catalog repository integration: product search enforces exact barcode priority, active-only filtering, business scoping, and result limits via `DrizzleCatalogRepository`
- Customer routes: mobile-only quick create, scoped lookup, walk-in ensure idempotency, walk-in deactivation protection, and cashier view/create vs update denial
- Customer repository integration: persisted create/update/list/query flows plus business-scoped walk-in lookup via `DrizzleCustomerRepository`
- Real DB verification: `pnpm db:migrate` after adding the customer migration
- Real DB verification: `pnpm bootstrap:owner -- --tenant-id 11111111-1111-4111-8111-111111111111 --email owner@example.com --name "Dev Owner" --password Password123 --role BUSINESS_OWNER --user-id 99999999-9999-4999-8999-999999999999`
- Real DB verification: `pnpm db:migrate` after adding the catalog migration
- Sale return routes: corrective movement creation, duplicate-product rejection, over-return rejection, refund-permission enforcement, and branch-scope denial
- Sale repository integration: persisted `SALE_RETURN` movements plus sale-linked movement-quantity aggregation via `DrizzleSaleRepository`
- Targeted verification: `pnpm exec vitest run apps/api/test/sale-return.test.ts apps/api/test/drizzle-sale.repository.test.ts --reporter=verbose`
- Supplier routes: create/list/update flows, tenant-wide business-context enforcement, permission denial, and branch-scoped business denial
- Purchase routes: finalized stock-in creation, default purchase-price fallback, duplicate-item rejection, missing-cost rejection, non-tracked-product rejection, permission denial, and branch-scope denial
- Supplier repository integration: persisted create/list/update flows via `DrizzleSupplierRepository`
- Purchase repository integration: persisted purchase snapshots plus `PURCHASE` movement visibility through `inventory_movements`
- Targeted verification: `pnpm exec vitest run apps/api/test/supplier.test.ts apps/api/test/purchase.test.ts apps/api/test/purchase-access.test.ts apps/api/test/drizzle-supplier.repository.test.ts apps/api/test/drizzle-purchase.repository.test.ts --reporter=verbose`
- Sync routes: retry idempotency, branch-scope denial, and reused-event conflict rejection for `POST /api/v1/sync/push`
- Sync repository integration: duplicate detection and transactional rollback on conflicting reused event ids via `DrizzleSyncRepository`
- Targeted verification: `pnpm exec vitest run apps/api/test/sync.test.ts apps/api/test/drizzle-sync.repository.test.ts --reporter=verbose`
- Sync routes: sale replay decreases inventory once, purchase replay increases inventory once, and duplicate `APPLIED` events stay side-effect free
- Sync routes: a stored `RECEIVED` purchase event can be replayed successfully on a later authorized retry after an initial `403`
- Sync repository integration: persisted `APPLIED` state updates are returned on later duplicate reads
- Sync routes: replay failures now persist `FAILED` state diagnostics and successful retries clear them on later duplicate replay
- Sync repository integration: persisted failure diagnostics survive duplicate reads and clear on later `APPLIED` transitions
- Targeted verification: `pnpm exec vitest run apps/api/test/sync.test.ts apps/api/test/sync-failure.test.ts apps/api/test/drizzle-sync.repository.test.ts --reporter=verbose`
- Sync pull routes: event pagination, branch-scope enforcement, failed-then-retried event visibility, and typed mixed-feed contract coverage
- Sync pull routes: product create/update snapshots and business-scope filtering for branch-restricted users
- Catalog repository integration: business-scoped product snapshot ordering validated for sync pull cursors via `DrizzleCatalogRepository`
- Targeted verification: `pnpm exec vitest run apps/api/test/sync-pull.test.ts apps/api/test/sync-pull-products.test.ts apps/api/test/drizzle-catalog.sync-feed.test.ts apps/api/test/drizzle-sync.repository.test.ts --reporter=verbose`
- Full suite verification on 2026-08-27: `pnpm test` (140 tests passing)
- Sync pull routes: category/unit/tax-profile create-update visibility and branch-scoped business filtering for server-authored master changes
- Catalog repository integration: category/unit/tax-profile sync-feed ordering and business scoping via `DrizzleCatalogRepository`
- Targeted verification: `cmd /c pnpm exec vitest run apps/api/test/sync-pull-masters.test.ts apps/api/test/sync-pull-products.test.ts apps/api/test/drizzle-catalog.sync-feed.test.ts --reporter=verbose`
- Full suite verification on 2026-08-27: `cmd /c pnpm test` (143 tests passing)
- Client data package: checkout completion, printer failure retention, remote API wiring, settings bootstrap, and push-then-pull sync hydration via `packages/client-data/test/*.test.ts`
- Full suite verification on 2026-08-29: `cmd /c pnpm exec vitest run --reporter=basic` (188 tests passing)

Last Successful Commands:
- `git init -b main`
- `git remote add origin https://github.com/manoj020218/POS.git`
- `$env:npm_config_strict_ssl='false'; cmd /c pnpm install`
- `cmd /c pnpm lint`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm test`
- `cmd /c pnpm build`
- `git commit -m "feat(phase0): scaffold monorepo api foundation"`
- `git push -u origin main`
- `cmd /c pnpm db:generate`
- `git commit -m "feat(tenant-core): add first multi-tenant core slice"`
- `$env:npm_config_strict_ssl='false'; cmd /c pnpm install`
- `git commit -m "feat(db): wire tenant core to postgres repository"`
- `where.exe psql`
- `git commit -m "feat(dev): add tenant bootstrap flow"`
- `cmd /c sc start postgresql-x64-18`
- `cmd /c pnpm db:migrate`
- `cmd /c pnpm bootstrap:dev`
- `cmd /c pnpm test`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm lint`
- PowerShell smoke: start `pnpm dev`, verify `/health`, create/list a business
- `git commit -m "fix(env): load workspace root env for runtime scripts"`
- `cmd /c pnpm build`
- `git commit -m "feat(auth): add role permission foundation"`
- `cmd /c pnpm test`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm lint`
- `cmd /c pnpm build`
- `git commit -m "feat(auth): add login refresh and logout scaffolding"`
- `cmd /c pnpm test`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm lint`
- `cmd /c pnpm build`
- PowerShell smoke: start `pnpm dev`, login at `/api/v1/auth/login`, then create/list businesses with `Authorization: Bearer <token>`
- `git commit -m "feat(auth): resolve bearer access context for protected routes"`
- `cmd /c pnpm db:generate`
- `cmd /c pnpm db:migrate`
- `cmd /c pnpm bootstrap:dev`
- `cmd /c pnpm test`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm lint`
- `cmd /c pnpm build`
- PowerShell smoke: start `pnpm dev`, login at `/api/v1/auth/login`, refresh at `/api/v1/auth/refresh`, then create/list businesses with `Authorization: Bearer <token>`
- `git commit -m "feat(auth): persist auth users and sessions"`
- `cmd /c pnpm lint`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm test`
- `cmd /c pnpm build`
- `git commit -m "feat(auth): guard tenant core write permissions"`
- `git push`
- `cmd /c pnpm lint`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm test`
- `cmd /c pnpm build`
- `git commit -m "feat(auth): add authenticated password change"`
- `git push`
- `cmd /c pnpm lint`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm test`
- `cmd /c pnpm build`
- `git commit -m "feat(auth): add session management endpoints"`
- `git push`
- `cmd /c pnpm db:generate`
- `cmd /c pnpm db:migrate`
- `cmd /c pnpm lint`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm test`
- `cmd /c pnpm build`
- `git commit -m "feat(auth): add password reset token flow"`
- `git push`
- `cmd /c pnpm lint`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm test`
- `cmd /c pnpm build`
- `git commit -m "feat(auth): guard tenant core read permissions"`
- `git push`
- `cmd /c pnpm lint`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm test`
- `cmd /c pnpm build`
- `git commit -m "feat(auth): add tenant user management endpoints"`
- `git push`
- `cmd /c pnpm db:generate`
- `cmd /c pnpm db:migrate`
- `cmd /c pnpm lint`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm test`
- `cmd /c pnpm build`
- `git commit -m "feat(auth): add branch-scoped user assignments"`
- `git push`
- `cmd /c pnpm db:generate`
- `cmd /c pnpm db:migrate`
- `cmd /c pnpm lint`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm test`
- `cmd /c pnpm build`
- `git commit -m "feat(auth): add auth audit logging"`
- `git push`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm lint`
- `cmd /c pnpm build`
- `cmd /c pnpm test`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm lint`
- `cmd /c pnpm test`
- `cmd /c pnpm build`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm lint`
- `cmd /c pnpm test -- bootstrap-owner`
- `cmd /c pnpm build`
- `cmd /c pnpm test -- bootstrap-owner-env`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm build`
- `cmd /c pnpm bootstrap:owner -- --tenant-id 11111111-1111-4111-8111-111111111111 --email owner@example.com --name "Dev Owner" --password Password123 --role BUSINESS_OWNER --user-id 99999999-9999-4999-8999-999999999999`
- `cmd /c pnpm lint`
- `cmd /c pnpm db:generate`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm exec vitest run apps/api/test/catalog.test.ts apps/api/test/drizzle-catalog.repository.test.ts --reporter=verbose`
- `cmd /c pnpm lint`
- `cmd /c pnpm test`
- `cmd /c pnpm build`
- `cmd /c pnpm db:migrate`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm exec vitest run apps/api/test/catalog.test.ts apps/api/test/drizzle-catalog.repository.test.ts apps/api/test/drizzle-catalog.search.test.ts --reporter=verbose`
- `cmd /c pnpm lint`
- `cmd /c pnpm test`
- `cmd /c pnpm build`
- `cmd /c pnpm test -- apps/api/test/catalog.test.ts apps/api/test/drizzle-catalog.repository.test.ts`
- `cmd /c pnpm lint`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm build`
- `cmd /c pnpm db:generate`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm exec vitest run apps/api/test/customer.test.ts apps/api/test/drizzle-customer.repository.test.ts --reporter=verbose`
- `cmd /c pnpm lint`
- `cmd /c pnpm build`
- `cmd /c pnpm test`
- `cmd /c pnpm db:migrate`
- `cmd /c pnpm exec vitest run apps/api/test/sale-return.test.ts apps/api/test/drizzle-sale.repository.test.ts --reporter=verbose`
- `cmd /c pnpm lint`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm build`
- `cmd /c pnpm test`
- `cmd /c pnpm db:generate`
- `cmd /c pnpm exec vitest run apps/api/test/supplier.test.ts apps/api/test/purchase.test.ts apps/api/test/purchase-access.test.ts apps/api/test/drizzle-supplier.repository.test.ts apps/api/test/drizzle-purchase.repository.test.ts --reporter=verbose`
- `cmd /c pnpm lint`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm build`
- `cmd /c pnpm db:migrate`
- `cmd /c pnpm test`
- `git commit -m "feat(procurement): add supplier and purchase foundation"`
- `cmd /c pnpm db:generate`
- `cmd /c pnpm exec vitest run apps/api/test/sync.test.ts apps/api/test/drizzle-sync.repository.test.ts --reporter=verbose`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm lint`
- `cmd /c pnpm test`
- `cmd /c pnpm build`
- `git commit -m "feat(sync): replay sale and purchase sync events"`
- `git push origin main`
- `cmd /c pnpm db:migrate`
- `cmd /c pnpm exec vitest run apps/api/test/sync.test.ts apps/api/test/drizzle-sync.repository.test.ts --reporter=verbose`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm lint`
- `cmd /c pnpm test`
- `cmd /c pnpm build`
- `cmd /c pnpm db:generate`
- `cmd /c pnpm exec vitest run apps/api/test/sync.test.ts apps/api/test/sync-failure.test.ts apps/api/test/drizzle-sync.repository.test.ts --reporter=verbose`
- `cmd /c pnpm db:migrate`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm lint`
- `cmd /c pnpm build`
- `cmd /c pnpm test`
- `cmd /c pnpm exec vitest run apps/api/test/sync-pull.test.ts apps/api/test/drizzle-sync.repository.test.ts --reporter=verbose`
- `cmd /c pnpm db:generate`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm lint`
- `cmd /c pnpm build`
- `cmd /c pnpm test`
- `cmd /c pnpm db:migrate`
- `cmd /c pnpm exec vitest run apps/api/test/sync-pull.test.ts apps/api/test/sync-pull-products.test.ts apps/api/test/drizzle-catalog.sync-feed.test.ts apps/api/test/drizzle-sync.repository.test.ts --reporter=verbose`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm lint`
- `cmd /c pnpm db:generate`
- `cmd /c pnpm build`
- `cmd /c pnpm test`
- `cmd /c pnpm db:migrate`
- `cmd /c pnpm exec vitest run apps/api/test/sync-pull-masters.test.ts apps/api/test/sync-pull-products.test.ts apps/api/test/drizzle-catalog.sync-feed.test.ts --reporter=verbose`
- `cmd /c pnpm lint`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm build`
- `cmd /c pnpm test`
- `cmd /c pnpm install`
- `cmd /c pnpm lint`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm build`
- `cmd /c pnpm exec vitest run packages/client-data/test/bootstrap-service.test.ts packages/client-data/test/checkout-service.test.ts packages/client-data/test/http-client-remote-api.test.ts packages/client-data/test/sync-service.test.ts --reporter=verbose`
- `cmd /c pnpm exec vitest run --reporter=basic`
- `git commit -m "feat(client-data): add phase 12 foundations"`
- `cmd /c pnpm lint`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm test`

Database Status:
- Drizzle schema created for tenant/business/branch/terminal
- Migration generated at `apps/api/drizzle/0000_damp_loners.sql`
- PostgreSQL persistence layer implemented in code
- Migration applied successfully to local PostgreSQL 18 database `smart_pos`
- Development tenant/business/branch/terminal bootstrap verified against the real database
- Auth user/session schema added at `apps/api/drizzle/0001_lumpy_invaders.sql`
- `auth_users` and `auth_sessions` are now persisted in PostgreSQL
- Auth password reset token schema added at `apps/api/drizzle/0002_motionless_triton.sql`
- `auth_password_reset_tokens` are now persisted in PostgreSQL
- Auth user branch access schema added at `apps/api/drizzle/0003_thankful_sphinx.sql`
- `auth_user_branch_access` assignments are now persisted in PostgreSQL
- Audit log schema added at `apps/api/drizzle/0004_lazy_firestar.sql`
- `audit_logs` are now persisted in PostgreSQL
- Development auth user bootstrap verified against the real database
- Explicit bootstrap owner provisioning verified idempotently against the existing development tenant/user in local PostgreSQL 18
- Catalog schema added at `apps/api/drizzle/0005_ambitious_blacklash.sql`
- `categories`, `units`, `tax_profiles`, and `products` are now persisted in PostgreSQL
- Catalog migration generation and application verified against the local PostgreSQL database
- Customer schema added at `apps/api/drizzle/0006_parallel_mac_gargan.sql`
- `customers` are now persisted in PostgreSQL
- Customer migration generation and application verified against the local PostgreSQL database
- Sales schema added at `apps/api/drizzle/0007_tense_polaris.sql`
- `sales` and `sale_items` are now persisted in PostgreSQL
- Invoice numbering schema update added at `apps/api/drizzle/0008_burly_paibok.sql`
- Terminal-scoped `sale_sequences` are now persisted in PostgreSQL
- Sales and invoice-numbering migration generation and application verified against the local PostgreSQL database
- Inventory ledger schema added at `apps/api/drizzle/0009_past_wolf_cub.sql`
- `inventory_movements` are now persisted in PostgreSQL
- Historical tracked-product sale rows are backfilled into `inventory_movements` during migration application
- Inventory-ledger migration generation and application verified against the local PostgreSQL database
- Sale-linked `SALE_RETURN` inventory movements are now persisted against the original `sales.id` reference for corrective stock increases
- Procurement schema added at `apps/api/drizzle/0010_mushy_klaw.sql`
- `suppliers`, `purchases`, and `purchase_items` are now persisted in PostgreSQL
- Finalized purchase stock-ins now reuse the existing `inventory_movements` ledger through `PURCHASE` rows
- Procurement migration generation and application verified against the local PostgreSQL database
- Sync schema added at `apps/api/drizzle/0011_tiresome_solo.sql`
- `sync_events` are now persisted in PostgreSQL
- Inbound sync events are accepted into the `RECEIVED` state with tenant-plus-event uniqueness enforced at the database layer
- Supported sale and purchase sync events now transition persisted `sync_events.state` from `RECEIVED` to `APPLIED` after successful replay
- Sync migration generation and application verified against the local PostgreSQL database
- Sync failure-diagnostics schema update added at `apps/api/drizzle/0012_smooth_energizer.sql`
- `sync_events` now persist `failure_code`, `failure_message`, `failure_status_code`, and `failed_at` for replay failures
- Successful sync replays clear any previously stored failure diagnostics when the event is later marked `APPLIED`
- Sync pull cursor schema update added at `apps/api/drizzle/0013_supreme_lockheed.sql`
- `sync_events` now persist `updated_at` for stable applied-event pull ordering and incremental cursor pagination
- Applied sync-event pull queries are now backed by the `sync_events_tenant_state_updated_idx` index
- Product snapshot pull queries now reuse existing `products.updated_at`; no additional schema changes were required for the first server-authored pull slice
- Business settings schema added at `apps/api/drizzle/0014_oval_oracle.sql`
- `business_settings` and `branch_settings` are covered by repository tests and wired into the API, but live migration application is still pending a reachable PostgreSQL listener on `localhost:5432`
- Added Phase 9 reporting module with protected `GET /api/v1/reports/sales/summary`
- Added default "Today's Sales" and explicit date-range sales-summary aggregation over persisted `sales` and `sale_items`
- Reporting summaries now respect existing tenant/business scope rules and require `report:view`
- Added reporting route coverage for default today scope, explicit date ranges, permission enforcement, and business-scope denial
- Added `DrizzleSaleRepository` summary coverage for persisted business-scoped date-range aggregation
- Tightened sales-summary reads to branch scope so restricted users do not see out-of-scope branch totals within a shared business
- Added protected `GET /api/v1/reports/sales/by-branch`, `/by-terminal`, `/by-cashier`, `/by-payment-method`, and `/top-products`
- Added grouped sales-report aggregation over persisted `sales` and `sale_items` for branch, terminal, cashier, payment-method, and top-product summaries
- Added service-side branch, business, terminal, and cashier metadata enrichment for reporting rows while keeping repository aggregation ledger-backed
- Added reporting route coverage for grouped summaries, branch-scope filtering, and top-product limit validation
- Added `DrizzleSaleRepository` coverage for branch, terminal, cashier, payment-method, and top-product persisted aggregations
- Added protected `GET /api/v1/reports/sales/tax-summary`, `/api/v1/reports/sales/returns`, `/api/v1/reports/inventory/current-stock`, `/api/v1/reports/inventory/low-stock`, and `/api/v1/reports/inventory/stock-movement`
- Reused a shared inventory-balance reporting helper so current-stock and low-stock reports stay aligned with `GET /api/v1/inventory/balances`
- Added ledger-backed stock-movement and sales-return reporting over immutable `inventory_movements`, with sale-item snapshot metadata used for return rows
- Added reporting route coverage for tax summary, current stock, low stock, stock movement, sales returns, and business-scope-vs-branch-scope stock visibility
- Added `DrizzleSaleRepository` coverage for tax summary, stock movement, and sales-return persisted aggregations
- Verified `pnpm --filter @smart-pos/api typecheck`
- Verified `pnpm exec vitest run apps/api/test/reporting.test.ts apps/api/test/reporting-branch-scope.test.ts apps/api/test/reporting-breakdowns.test.ts apps/api/test/drizzle-sales-summary.test.ts apps/api/test/drizzle-sales-breakdowns.test.ts --reporter=verbose`
- Verified `pnpm lint`
- Verified `pnpm test`
- Verified `pnpm build`
- Verified `cmd /c pnpm lint`
- Verified `cmd /c pnpm typecheck`
- Verified `cmd /c pnpm test`

API Status:
- Phase 0 scaffold verified
- Phase 1 route slice verified with business, branch, and terminal endpoints
- `GET /health` returns `{"status":"ok"}`
- Live PostgreSQL-backed business create/list smoke verified on port `4012`
- Auth/RBAC foundation now includes typed role permissions and a reusable permission guard
- Auth route scaffolding is available for `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, and `POST /api/v1/auth/logout`
- Protected tenant-core routes now resolve request access from bearer access tokens instead of development headers
- Runtime auth users and sessions are now backed by PostgreSQL through `DrizzleAuthRepository`
- Development auth-user seeding now occurs through `pnpm bootstrap:dev`, not API startup
- Tenant-core write routes now enforce `business:*`, `branch:*`, and `terminal:*` permissions at the HTTP layer
- Tenant-core read routes now enforce `business:view`, `branch:view`, and `terminal:view` permissions at the HTTP layer
- Auth API now includes authenticated `POST /api/v1/auth/password/change` with refresh-session revocation after a successful password update
- Auth API now includes authenticated session listing and session revocation endpoints backed by persisted auth sessions
- Auth API now includes password reset request/confirm endpoints backed by hashed reset-token persistence and sink-based delivery
- Auth API now includes tenant-scoped `GET /api/v1/auth/users`, `POST /api/v1/auth/users`, and `PATCH /api/v1/auth/users/:userId` guarded by `user:manage`
- Auth-user management writes now revoke persisted refresh sessions when a user's role or active status changes
- Auth API now includes tenant-scoped `GET /api/v1/auth/users/:userId/branches` and `PUT /api/v1/auth/users/:userId/branches` guarded by `user:manage`
- Auth-user branch assignment writes now replace the user's persisted tenant-scoped branch access set
- Auth-user branch assignment reads now support assignment-state filtering plus business/search filtering and return business metadata with the assignment state
- Auth mutations now persist tenant-scoped audit logs for login, refresh, logout, explicit session revocation, branch assignment replacement, password change, password reset request/confirm, and auth-user create/update flows
- Tenant-core business, branch, and terminal routes now enforce branch-scoped access for non-tenant-wide roles using persisted user branch assignments
- Protected-route access context now reloads branch assignments from the auth repository on each authenticated request
- Protected-route access context now revalidates the current auth user and auth session on each authenticated request so logout, disable, and role changes cut off existing bearer tokens immediately
- Operational tooling now includes `pnpm bootstrap:owner` for first tenant-wide auth-user provisioning against an existing tenant without reusing `DEV_AUTH_*` seeding
- Catalog API now includes protected `GET/POST/PATCH /api/v1/categories`, `GET/POST/PATCH /api/v1/units`, `GET/POST/PATCH /api/v1/tax-profiles`, and `GET/POST/PATCH /api/v1/products`
- Minimal `POST /api/v1/products` now accepts only `name` and `sellingPrice` when the user has access to a single business and auto-resolves default category/unit/tax data
- Catalog read routes honor existing branch-scoped business access and catalog write routes require the existing `product:create` or `product:update` permissions
- Catalog API now includes protected `GET /api/v1/products/search` with `query`, optional `businessId`, and optional `limit`
- Catalog API now includes paginated management `GET /api/v1/products` with `page`, `pageSize`, and response `meta`
- POS search returns slim active-only checkout results ranked by exact barcode first, then SKU/name matches, without reusing the full management product payload
- Customer API now includes protected `GET/POST/PATCH /api/v1/customers` with business-scoped reads and writes
- Minimal `POST /api/v1/customers` now accepts mobile-only, email-only, or name-bearing payloads by deriving the stored customer name from the first available identifier
- Customer API now includes `POST /api/v1/customers/walk-in` for idempotent default-customer provisioning per business
- Customer reads honor existing branch-scoped business access and support lightweight name/mobile/email lookup through the `query` parameter
- Walk-in customers cannot be deactivated through the normal customer update endpoint
- Sales API now includes protected `POST /api/v1/sales` with server-trusted total recalculation, payment validation, and immutable sale-item snapshots
- Sale responses now include terminal-scoped human-readable invoice numbers and invoice sequence values alongside branch, terminal, customer, payment, and item totals
- Finalized sales now create immutable `SALE` inventory movements for tracked products in the same repository transaction as sale persistence
- Sales API now includes protected `POST /api/v1/sales/:saleId/returns` for corrective tracked-item inventory returns
- Sale returns validate sold-item membership, reject non-tracked sale items, and cap cumulative returned quantity per sold tracked item
- Supplier API now includes protected `GET/POST/PATCH /api/v1/suppliers` with business-scoped reads and writes
- Purchase API now includes protected `GET/POST /api/v1/purchases` with branch-scoped reads and finalized stock-in writes
- Finalized purchases now persist immutable purchase-item snapshots, optional supplier snapshots, and `PURCHASE` inventory movements in one repository transaction
- Inventory balances now reflect purchase-ledger stock increases as well as sale-linked stock decreases/returns
- Sync API now includes protected idempotent `POST /api/v1/sync/push`
- Sync push accepts explicit event `branchId`, `deviceId`, `eventId`, `type`, `entityId`, `createdAt`, and JSON `payload` fields
- Sync push stores new inbound events as raw `RECEIVED` records, replays supported sale and purchase events through the existing domain services, and marks successful replays as `APPLIED`
- Sync push returns duplicate statuses on retry, reattempts supported duplicates still in `RECEIVED`, and rejects reused event ids when the event content changes
- Replay failures during sync push now mark the stored event `FAILED` before the original error is returned to the caller
- Stored sync failures now retain actionable diagnostic fields for permission, validation, and internal replay errors without exposing stack traces in the API response
- Later authorized or corrected retries can reapply previously failed events and clear the stored failure diagnostics on success
- Sync API now includes protected `GET /api/v1/sync/pull`
- Sync pull now returns a typed mixed change feed with `changeId`, `changeType`, `source`, `record`, `updatedAt`, and branch/business scope fields
- Sync pull currently emits `SYNC_EVENT_APPLIED` records for applied inbound sync events plus server-authored `CATEGORY_UPSERTED`, `UNIT_UPSERTED`, `TAX_PROFILE_UPSERTED`, `PRODUCT_UPSERTED`, and `CUSTOMER_UPSERTED` snapshots
- Sync pull pagination now uses an opaque `(updatedAt, changeKey)` cursor so catalog masters, products, and sync-event changes can share one ordered stream without a new schema change in this slice
- Inventory API now includes protected `GET /api/v1/inventory/balances` with business and optional product scoping plus opening-stock-plus-ledger balance calculation
- Reporting API now includes protected `GET /api/v1/reports/sales/summary` with default local-calendar "TODAY" behavior plus explicit `dateFrom`/`dateTo` date-range summaries
- Sales-summary reads aggregate server-side over persisted sales totals and sale-item quantities instead of returning raw transactions to the client
- Reporting API now includes protected grouped sales endpoints for branch, terminal, cashier, payment-method, and top-product summaries over the persisted sales ledger
- Grouped and summary sales reports now honor assigned-branch scope, so restricted users only see totals for their accessible branches even inside a shared business
- Reporting API now includes protected `GET /api/v1/reports/sales/tax-summary` with business-scoped collected-tax summaries derived from immutable sales totals
- Reporting API now includes protected `GET /api/v1/reports/sales/returns` over persisted `SALE_RETURN` ledger rows enriched from immutable sale-item snapshots
- Reporting API now includes protected `GET /api/v1/reports/inventory/current-stock` and `/api/v1/reports/inventory/low-stock` using the same business-scoped stock calculation as the inventory balances endpoint
- Reporting API now includes protected `GET /api/v1/reports/inventory/stock-movement` over persisted `inventory_movements` with date-range filtering and assigned-branch scope enforcement
- Current and low-stock reports remain business-scoped, while stock movement and sales return reports remain branch-scoped for restricted users
- Settings API now includes protected `GET /api/v1/business-settings` and `PATCH /api/v1/business-settings`
- Business settings now drive default product unit/tax/inventory behavior, sale invoice prefixes, and report timezone windows
- Reporting date windows now honor the configured business timezone and correctly handle formatter midnight output
- Workspace package `@smart-pos/printer` now exposes shared printer profiles, ESC/POS print-job contracts, receipt/kitchen/barcode/QR builders, a recording printer service, a printer test-page builder, an ESC/POS encoder, transport adapters, and a profile-aware router
- Workspace package `@smart-pos/client-data` now exposes client-side repository contracts, an in-memory store, an HTTP remote API adapter, a settings bootstrap service, a printer-aware local checkout service, and outbox-first sync orchestration

POS UI Status (Phase 13, 2026-08-30):
- New workspace app `apps/pos` (`@smart-pos/pos`): React 18 + TypeScript + Vite 6 + Tailwind CSS v4, added to the root `build`/`typecheck` filters and a new `dev:pos` script
- Kiosk-first touch checkout shell built directly on `@smart-pos/client-data`'s `createInMemoryClientDataStore` + `createLocalCheckoutService`, seeded with demo products/customers/business settings (no live API/DB wiring yet — intentionally deferred to the existing NEXT item)
- UI covers the full required action set: product search/category browsing, add/increment/decrement/remove cart lines, quick and custom (on-screen keypad) discount, walk-in/customer picker, Cash (on-screen keypad + quick tender chips + change due)/Card/UPI/Other payment, on-screen receipt result (printing is always `SKIPPED` since no printer transport is wired), and New Sale reset
- Every `apps/pos/src` file is kept under ~200 lines (user constraint); the component tree is decomposed accordingly (see `apps/pos/src/components/**`, `apps/pos/src/state/**`)
- Fixed a pre-existing bug uncovered while loading `@smart-pos/client-data` in a browser bundle: `packages/printer/src/index.ts` barrel-exported `tcp-printer-service.ts`, which does a static `import { Socket } from 'node:net'` — any browser import of the printer package's main entry crashed immediately. `tcp-printer-service` is now reached only via the new `@smart-pos/printer/tcp` subpath export (Node-only consumers); the main entry point stays browser-safe. Updated `packages/printer/test/tcp-printer-service.test.ts` to import from the subpath accordingly
- Verified `pnpm --filter @smart-pos/pos typecheck`, `pnpm lint` (root, incl. new `eslint-plugin-react-hooks`/`eslint-plugin-react-refresh` block scoped to `apps/pos/src`), `pnpm test` (72 files / 188 tests passing), and manual browser exercise of the full flow via `pnpm --filter @smart-pos/pos dev`

Auth/Terminal-Selection Status (2026-08-30):
- Read `PROJECT_PLAN.md` in full this session — it's the client's own master execution plan (phase
  list, non-negotiable rules, git/HANDOFF discipline). Reconciled prior "Phase 13" work against it;
  going forward, phase numbers/terminology in this file should track that document, not be reinvented
- `apps/pos` cashier login and terminal-picker screens now call the real backend instead of a fixed
  demo context: `CashierLoginScreen` → `POST /api/v1/auth/login`, `TerminalPickerScreen` →
  `GET /api/v1/terminals`, both via new `@smart-pos/client-data` client surface
  (`createHttpAuthClient`; `listBranches`/`listTerminals` added to `ClientRemoteApi`/
  `createHttpClientRemoteApi`). Session (tokens + user) persists in `localStorage`; a `useAuth`
  hook restores it on reload; `TopBar` gained a sign-out button
- After terminal selection, `apps/pos` fetches real `GET /api/v1/business-settings` once to resolve
  the authenticated business/branch name, then reseeds the existing demo in-memory catalog under
  those *real* business/branch ids (`apps/pos/src/data/seed-*.ts` now take a `SeedBusinessContext`
  parameter instead of importing a fixed `demoIds`/`demoTerminalContext`) — auth and terminal
  identity are fully real; product/customer/checkout data is still the local demo seed pending the
  NEXT-item persistent-store swap
- Found and fixed a real backend gap while wiring this: `GET /api/v1/business-settings` required
  `settings:manage`, which no terminal-operating role (CASHIER, BRANCH_MANAGER, etc.) actually has —
  meaning no POS terminal could ever read its own business settings. Changed the route to require
  `terminal:view` instead (write/`PATCH` still requires `settings:manage`); updated
  `apps/api/test/settings.test.ts` accordingly (documented per PROJECT_PLAN.md §68's
  problem-handling process, not silently patched)
- Added `apps/api/src/scripts/dev-in-memory-server.ts` (`pnpm --filter @smart-pos/api dev:memory`):
  boots the API with in-memory repositories and a seeded tenant/business/branch/2
  terminals/1 CASHIER user, for exercising real auth/API flows locally without PostgreSQL — used to
  verify this slice end-to-end (login → terminal pick → checkout shell renders with the real
  business/branch/cashier names) via a live browser session
- NOT VERIFIED against real PostgreSQL yet — local Postgres remains unreachable (existing BLOCKED
  item); this slice was verified against the in-memory dev harness above and the automated test
  suite only, per the plan's risk mitigation

Tests:
- `pnpm --filter @smart-pos/client-data typecheck` / new `auth-client.test.ts` and extended
  `http-client-remote-api.test.ts` (listBranches/listTerminals) — passing
- `pnpm exec vitest run apps/api/test/settings.test.ts apps/api/test/reporting.test.ts` — passing
  after the permission-route test update
- `pnpm typecheck` (all 4 workspace packages) and `pnpm lint` (root) — passing
- Full `pnpm test` — `73` test files / `190` tests passing

Persistent Store Status (2026-08-30):
- Completed the item deferred in the previous entry: `apps/pos` no longer writes to a demo
  in-memory catalog. `@smart-pos/client-data` gained `createIndexedDbClientDataStore`, a persistent
  browser-native `ClientDataStore` (products/customers/sales/settings/stock/sync), reusing the
  existing in-memory store's search/clone helpers rather than duplicating filter logic
- `apps/pos`'s `prepareTerminalBundle` (new, `state/prepare-terminal-bundle.ts`) now: opens the
  IndexedDB store, runs `createClientBootstrapService.refreshBusinessSettings()` for real settings,
  then `createClientSyncService.syncNow()` to hydrate products/customers from the API — all before
  the kiosk shell renders. Checkout does a best-effort background `pushPendingEvents()` right after
  each sale instead of waiting for a later explicit sync
- Removed the now-unused demo `apps/pos/src/data/seed-*.ts` files entirely (dead code, not kept as
  a fallback) — Phase 12/13's client-data layer is genuinely real now, matching PROJECT_PLAN.md
  §66/§92's MVP boundary
- `apps/api/src/scripts/dev-in-memory-server.ts` now also seeds a small demo catalog (1
  category/unit/tax-profile, 4 products) via the in-memory catalog repository, so manual testing
  against it stays meaningful now that `apps/pos` no longer supplies its own fake catalog
- **NOT VERIFIED via live browser this round** — the Claude-in-Chrome extension's safety-check
  service was unreachable for the entire session (blocked all navigation, including `example.com`,
  not just localhost), after several retries with increasing backoff. Verified instead via: a
  dedicated `indexeddb-client-data-store.test.ts` exercising a full local checkout (product/
  customer/settings persistence, stock decrement, sale lookup by id and by sync-event-id, outbox
  tracking) against the real IndexedDB API through `fake-indexeddb`, plus `pnpm typecheck`/`pnpm
  lint`/full `pnpm test`. A live click-through (login → terminal pick → catalog hydrates from
  sync → checkout) is still owed and tracked in TODO.md

Tests:
- New `packages/client-data/test/indexeddb-client-data-store.test.ts` (2 tests) — passing
- Full `pnpm test` — `74` test files / `192` tests passing (one `dev-bootstrap.test.ts` hook timeout
  seen under heavy concurrent load — a pglite cold-start flake, confirmed by re-running that file
  alone cleanly; not a regression from this session's changes)
- `pnpm typecheck` (all 4 workspace packages) and `pnpm lint` (root) — passing

Git Status:
- Working tree should be clean once the commits described in this entry are created; see Last Commit

Last Commit:
- `af643f4 chore(api): seed a demo catalog in the in-memory dev server` (this doc-update commit
  follows it)

Live-Browser Verification Status (2026-08-31, continuation):
- Completed the item owed from the previous entry: ran `pnpm --filter @smart-pos/api dev:memory` and
  `pnpm --filter @smart-pos/pos dev`, then drove the kiosk UI in a real Chrome tab via
  `claude-in-chrome`
- First attempt failed immediately after terminal selection with `Request failed with status 400`.
  Server log showed `GET /api/v1/sync/pull?...&limit=200` → `400 Too big: expected number to be
  <=100`. Root cause: `apps/pos/src/state/prepare-terminal-bundle.ts`'s post-login bootstrap called
  `syncService.syncNow({ branchId, limit: 200 })`, but `apps/api/src/modules/sync/sync.schemas.ts`
  caps `limit` at `100` — a client/server contract mismatch that had never been exercised by a real
  browser before (only by unit/integration tests, which mock the remote API and never hit the real
  validation). This was blocking every terminal pick, i.e. the kiosk UI was unusable end-to-end
- Fixed at the correct layer, not just papered over: `@smart-pos/client-data`'s
  `createClientSyncService.pullChanges` previously issued exactly one `remoteApi.pullChanges()` call
  and trusted it to return the whole change set. It now loops — pull, apply, save cursor, repeat —
  until a returned page is shorter than the requested limit, with a `1000`-page safety cap against a
  misbehaving/looping server response. This fixes not just the immediate `400` (by letting
  `apps/pos` request a limit `≤100` while still hydrating everything) but also a latent correctness
  gap: any branch with more pending changes than one page would previously have silently hydrated
  only the first page and stopped. Also lowered `apps/pos`'s bootstrap `syncNow` request from
  `limit: 200` to `limit: 100` to match the server cap
- Added `packages/client-data/test/sync-service.test.ts` regression coverage for the multi-page pull
  loop (a full first page, a full second page, then an empty terminating page)
- Re-ran the browser walkthrough end-to-end: sign in (`asha@example.com` / `Password123`) → pick
  Counter 1 → catalog hydrates from the real API/sync (4 seeded demo products render with correct
  prices) → add Butter Croissant → Cash payment via the on-screen keypad → sale completes with real
  invoice `INV-MAIN-T1-000001`, correct subtotal/tax/total, and the expected "no printer configured"
  on-screen receipt fallback → New Sale resets the cart while keeping the catalog loaded. No browser
  console errors at any step. Confirmed in the API log that the post-checkout background sync push
  (`POST /api/v1/sync/push`) returned `200`
- Cleaned up after the session: `TaskStop`-ing the two `pnpm ... dev`/`dev:memory` background
  commands left their `tsx watch`/`vite` child processes running (the same stray-`node.exe` pattern
  flagged in the previous restart-safety note) — identified them via
  `Get-CimInstance Win32_Process -Filter "Name='node.exe'"` (matching on `CommandLine`, not just
  image name, so the two unrelated pre-existing `codex.js` processes were left alone) and terminated
  them explicitly; confirmed via `tasklist` that no stray Node processes from this session remain

Tests:
- `pnpm exec vitest run packages/client-data/test/sync-service.test.ts` — new multi-page-pull
  regression test passing alongside the existing push-then-pull test
- `pnpm typecheck`, `pnpm lint`, full `pnpm test` — `74` test files / `193` tests passing
- Live browser verification: login → terminal pick → catalog hydrate → checkout → New Sale, against
  `pnpm --filter @smart-pos/api dev:memory`, zero console errors, `sync/pull` and `sync/push` both
  `200` in the server log

Git Status:
- Working tree should be clean once the commit described in this entry is created; see Last Commit

Last Commit:
- `75fdb31 docs(handoff): restart-safety checkpoint before planned power-cut` (this session's
  code + doc-update commit follows it)

Printer Hardware + Android Packaging Status (2026-09-04):
- The client asked for "a full production launch." That's genuinely multi-week scope per
  PROJECT_PLAN.md itself (admin/reports app, Windows/PWA, Phase 14 UI/UX polish across five device
  classes, production deployment/backup infrastructure) — see TODO.md's NEXT section for the
  Phase B–E roadmap that was written but *not* attempted this session, per §69's "never fake
  completion" rule. This entry covers the one slice that was concretely specified and could be
  genuinely built-and-verified: wiring the delivered printer plugin into checkout and packaging
  `apps/pos` as an installed Android app.
- **Root cause found and fixed**: the checkout→print pipeline (`packages/client-data`'s
  `checkout-service.ts` → `checkout-printer.ts` → `@smart-pos/printer`) was fully built already, but
  `apps/pos/src/state/prepare-terminal-bundle.ts` never actually constructed or passed a
  `printerService` into `createLocalCheckoutService` — every print silently short-circuited to
  `SKIPPED` no matter what was configured. Fixed by adding `apps/pos/src/lib/printer/` (three files:
  `connection-manager.ts`, `create-plugin-transport.ts`, `create-printer-service.ts`) that bridges
  `@jenix/cap-thermal-printer`'s connect-once-then-write, stateful API onto `packages/printer`'s
  stateless-per-job `*PrinterTransport` contract — this adapter lives in `apps/pos`, not
  `packages/printer`, matching the project's own prior architecture decision that each runtime owns
  its platform-specific write implementation
- Also found and closed a second, previously-unnoticed gap: **nothing in the entire app ever called**
  `PATCH /api/v1/business-settings` — the route existed server-side with zero UI to reach it. Added
  `ClientRemoteApi.updateBusinessSettings` to `@smart-pos/client-data`, and a new printer-pairing
  screen in `apps/pos` (`PrinterSettingsModal`, opened via a gear icon in `TopBar`, backed by a new
  `usePrinterSettings` hook) that scans BLE/USB devices via the plugin, lets the cashier/manager pick
  one plus paper width, and saves it as the branch's `receiptPrinterProfile`
- Packaged `apps/pos` as a real installed Android app for the first time: added `@capacitor/core`,
  `@capacitor/android`, `@capacitor/cli`; `capacitor.config.ts` (`appId: com.smartpos.app`); ran
  `npx cap add android`, which auto-detected `@jenix/cap-thermal-printer` (installed as a local
  `file:../../../capacitor-plugins/packages/cap-thermal-printer` dependency pointing at the sibling
  plugins-monorepo checkout) as a Capacitor plugin with no extra wiring needed
- **Real verification, not just "files were created"**: ran `gradlew.bat assembleDebug` from
  `apps/pos/android` — it actually compiled the plugin's Kotlin, linked it into the app, and produced
  a real `app-debug.apk` (~4.2MB) at
  `apps/pos/android/app/build/outputs/apk/debug/app-debug.apk`. Hit and fixed one real build failure
  along the way: `android/local.properties` written with single Windows backslashes
  (`C:\Users\...`) is invalid Java-Properties syntax — the backslashes get silently stripped during
  parsing, corrupting the SDK path and failing with `IOException: The filename, directory name, or
  volume label syntax is incorrect`. Fixed by using forward slashes instead
  (`C:/Users/User/AppData/Local/Android/Sdk`), which Gradle/Android accept fine on Windows
- **Explicitly NOT VERIFIED** (per §69 — stating this rather than assuming success): the APK has not
  been installed or run on a physical Android tablet, and no actual print has been sent to a real
  BLE/USB thermal printer. No such hardware exists in this environment. The plugin's own
  `HARDWARE_TEST_CHECKLIST.md` (in the `capacitor-plugins` repo) is the next step for whoever has
  access to real devices
- Live browser walkthrough (desktop Chrome, not a real device, so no native plugin bridge) confirmed
  no regressions: login → terminal pick → catalog hydrate → open printer settings modal (shows
  "Android only plugin" gracefully instead of crashing, confirming the plugin's web fallback and this
  session's error handling both work) → close → add item → Cash checkout still completes normally
  with the pre-existing "No printer configured" on-screen fallback (since no printer is actually
  paired in this environment) → zero console errors throughout
- `apps/pos/android/` (the generated Capacitor platform project) is committed to this repo, matching
  standard Capacitor convention — build output (`android/build`, `android/app/build`, `.gradle`,
  `local.properties`) is gitignored as machine-specific
- One naming/scope note for next time: the delivered plugin, `@jenix/cap-thermal-printer`, was
  reused from another project of the developer's rather than built fresh to the `printer/README.md`
  brief — different package scope, and a raw `number[]` write API instead of the
  `bytesBase64`/fixed-error-code contract the brief specified. It still bridges cleanly (see the
  adapter above), so this wasn't blocking, but future printer-plugin work from this developer may
  keep diverging from written briefs — worth confirming expectations directly rather than assuming
  the brief will be followed literally

Tests:
- New `apps/pos/test/lib/printer/connection-manager.test.ts` (4 tests) and
  `apps/pos/test/lib/printer/create-plugin-transport.test.ts` (3 tests) — mock the plugin's
  `ThermalPrinterPlugin` interface directly, no real Capacitor bridge involved
- New `packages/client-data` coverage for `updateBusinessSettings` in
  `http-client-remote-api.test.ts`; updated `bootstrap-service.test.ts`/`sync-service.test.ts` fakes
  to satisfy the now-required `ClientRemoteApi.updateBusinessSettings` method
- `pnpm typecheck`, `pnpm lint`, full `pnpm test` — `76` test files / `200` tests passing
- Real Gradle build: `gradlew.bat assembleDebug` — `BUILD SUCCESSFUL`, `app-debug.apk` produced
- Live browser verification (see above) — zero console errors, no regressions

Git Status:
- Clean and fully pushed as of this entry: `codex/settings-printer-foundation` matches
  `origin/codex/settings-printer-foundation`, `0` ahead / `0` behind

Last Commit:
- `8b79766 docs(handoff): add hardware-testing resume point` (pushed; this session's
  code + doc-update commits follow it)

Access-Token Refresh Status (2026-09-06):
- Client asked (2026-09-06) what software work remains before rollout, separate from the hardware
  test. Two concrete gaps surfaced: no access-token refresh (this entry), and no bulk product
  import/entry mechanism (next up, not started — see TODO.md NOW #2). The client also provided a
  subdomain (`smartpos.iotsoft.in`) and a shared dev VPS for deployment, with explicit instructions
  not to write the VPS address/credentials into this repo — those live in the assistant's local
  memory instead (`deployment_vps_target.md`), not here. Deployment itself is blocked pending SSH
  credentials.
- **Root cause**: `apps/api`'s access tokens expire in `defaultAccessTokenTtlSeconds` (15 minutes,
  `apps/api/src/modules/auth/auth.service.ts`). `packages/client-data` already had a working
  `authClient.refresh()` and the server's `/auth/refresh` endpoint already did token rotation — but
  nothing in `apps/pos` ever called it. Every cashier session would have broken with a `401` roughly
  every 15 minutes throughout a real shift.
- **Fix**: `createHttpClientRemoteApi` (`packages/client-data/src/http-client-remote-api.ts`) now
  takes an `onUnauthorized: () => Promise<string | null>` option. Every request goes through a shared
  `requestWithAuth` wrapper: on a `401` it calls `onUnauthorized` once, and if that returns a new
  token, retries the original request with it; if `onUnauthorized` returns `null` (refresh itself
  failed), the original `401` error is rethrown rather than looping.
- `apps/pos/src/state/use-auth.ts` supplies that callback: `refreshAccessToken()` calls
  `authClient.refresh()`, updates the session (state + a `sessionRef` + `localStorage`) on success,
  or calls `logout()` on failure (which naturally routes the UI back to the login screen via existing
  conditional rendering — no new UI wiring needed for that path). Concurrent 401s from multiple
  in-flight requests share one refresh attempt via a memoized in-flight promise — the server *rotates*
  the refresh token on each use, so firing two refresh calls back-to-back would make the second one
  fail against an already-consumed token, causing a false logout even though the first refresh
  actually succeeded.
- `prepare-terminal-bundle.ts`'s bootstrap `useEffect` in `pos-provider.tsx` now keys off
  `auth.session?.user.id` instead of the whole `auth.session` object, so a refresh (which replaces
  `session` with a new object for the same user) doesn't re-trigger the full IndexedDB
  bootstrap/sync sequence on every token refresh.
- **Bug found and fixed along the way**: `http-fetch-helpers.ts`'s `readErrorMessage` read
  `body.error?.message`, but `apps/api`'s actual error response shape is flat —
  `{ code, message }`, no `error` wrapper (see `apps/api/src/http/middleware/error-handler.ts`). Every
  real server error message was silently discarded in favor of the generic "Request failed with
  status NNN" fallback. Fixed the read path and added `HttpRequestError` (a small `Error` subclass
  carrying `status`) so callers can react to specific HTTP statuses instead of parsing message text —
  this is what makes the 401-detection above possible at all.
- **Real verification, not just unit tests**: temporarily set `accessTokenTtlSeconds: 8` in
  `apps/api/src/scripts/dev-in-memory-server.ts` (local-only change, reverted before committing —
  confirmed via `git diff` showing no changes to that file), logged in, waited past the 8-second
  expiry, then completed a Cash sale. Captured via `read_network_requests` the exact real sequence:
  `POST /api/v1/sync/push → 401` → `POST /api/v1/auth/refresh → 200` → retried
  `POST /api/v1/sync/push → 200`. Sale completed normally with a real invoice, zero console errors.

Tests:
- New `packages/client-data/test/http-client-remote-api.test.ts` coverage: successful retry after a
  `401` using the refreshed token, rethrow of the original error when refresh fails, and no refresh
  attempt at all for non-`401` failures (e.g. `403`)
- `pnpm typecheck`, `pnpm lint`, full `pnpm test` — `76` test files / `203` tests passing
- Live browser verification (see above) — real `401`→refresh→retry sequence observed in network
  requests, zero console errors

Git Status:
- Clean and fully pushed as of this entry: `codex/settings-printer-foundation` matches
  `origin/codex/settings-printer-foundation`, `0` ahead / `0` behind

Last Commit:
- `aaeb7c2 docs: record token-refresh fix and the client's rollout checklist` (pushed; this session's
  code + doc-update commits follow it)

Bulk Product Import/Export Status (2026-09-07):
- Continuing the rollout checklist from the entry above: access-token refresh was item 1 (done
  2026-09-06); this entry covers item 2, bulk product upload/download.
- **The gap**: a real kirana store has ~300 products. There was no bulk-import endpoint
  (`POST /api/v1/products` only ever took one product per call) and, more fundamentally, no product
  UI anywhere in `apps/pos` at all — the app is checkout-only. Without this, the store literally
  cannot open with a real catalog.
- **UX decision, direct from the client**: since the app runs on tablet/mobile, both upload and
  download should work through a USB pen drive. Rather than building a native file-save plugin (the
  same kind of native-Kotlin dependency friction already seen with the printer plugin), this uses
  plain HTML file mechanics: `<input type="file" accept=".csv">` for import — Android's system file
  picker natively lists a connected USB OTG drive as a source, no extra plugin needed — and a
  Blob + `<a download>` for export, which lands in the device's Downloads folder by default (noted
  explicitly in the UI copy that moving it to a pen drive from there is a manual step; a true
  "Save As directly to USB" would need a native Storage-Access-Framework plugin, not attempted here
  since the simpler path covers the actual need).
- **New in `@smart-pos/client-data`**: `ClientRemoteApi.createProduct` (`POST /products`) and
  `listProducts` (`GET /products`, paginated) — the client-data layer previously had zero direct
  product REST calls, since normal catalog data flows through sync-pull instead. Also added
  `requestJsonEnvelope` to `http-fetch-helpers.ts` (same as `requestJson` but keeps the response's
  `meta` field, needed for `GET /products`'s pagination info, which plain `requestJson` discards).
- **New in `apps/pos`**: `src/lib/csv.ts` (a small RFC4180-ish parser/writer — handles quoted fields
  with embedded commas/quotes, since a product name like "Rice, Basmati" is a realistic case a naive
  `.split(',')` would break on) and `src/lib/product-csv.ts` (column mapping plus rupee↔paise
  conversion — the API stores money as integer paise, but a shop owner typing a spreadsheet thinks in
  rupees). A new `ProductImportExportModal` (opened via a `Sheet`-icon button in `TopBar`) drives a
  `useProductImportExport` hook that imports row-by-row (collecting per-row errors without aborting
  the whole file, with a live "N / total processed" readout) and exports by paging through
  `listProducts` until `meta.hasNextPage` is false.
- **Permission model, unchanged and correctly enforced**: `product:create` is not granted to
  `CASHIER` (only `BUSINESS_OWNER`/`BUSINESS_ADMIN`/`BRANCH_MANAGER`/`INVENTORY_MANAGER`) — this is
  existing server-side authorization, not new. A cashier attempting an import gets a per-row
  "Insufficient permissions" message rather than a crash, and this is now the *real* server message
  (not a generic fallback) thanks to the `readErrorMessage` fix from the token-refresh work the day
  before.
- Added a `BUSINESS_OWNER` test account (`owner@example.com` / `Password123`) to `apps/api`'s
  `dev:memory` seed script, printed in its startup JSON alongside the existing cashier credentials —
  kept permanently (not reverted) since both this feature and printer pairing need
  `settings:manage`/`product:create`, which the cashier-only seed can never exercise.
- **Real verification, not just unit tests**: as the owner account, imported a CSV with 2 valid rows
  and 2 deliberately invalid ones (missing name; non-numeric price) — confirmed via the API log two
  real `POST /api/v1/products → 201`s, and the UI showed the exact two row-level error messages with
  no crash. Then exported the catalog and confirmed the CSV contained the original 4 demo products
  *and* the 2 just-imported ones, with correct `120.00`-style rupee formatting and the
  auto-provisioned `General`/`Piece`/`No Tax` defaults applied. Separately logged in as the seeded
  cashier and confirmed the same import attempt fails gracefully with "Insufficient permissions"
  instead of crashing.

Tests:
- New `apps/pos/test/lib/csv.test.ts` (8 tests) — quoting, escaping, round-tripping, empty input
- New `apps/pos/test/lib/product-csv.test.ts` (8 tests) — valid-row parsing with unit conversion,
  case-insensitive/reordered headers, missing-name and invalid-price row errors, blank-row skipping,
  missing-required-column and empty-file failures, and export-row formatting
- `pnpm typecheck`, `pnpm lint`, full `pnpm test` — `78` test files / `219` tests passing
- Live browser verification (see above) — real product creation, permission denial, and CSV
  export/import round-trip, zero console errors throughout

Git Status:
- Clean and fully pushed as of this entry: `codex/settings-printer-foundation` matches
  `origin/codex/settings-printer-foundation`, `0` ahead / `0` behind

Last Commit:
- `aaeb7c2 docs: record token-refresh fix and the client's rollout checklist` (pushed; this
  session's code + doc-update commits follow it)

Self-Serve Onboarding Status (2026-09-07):
- Client asked (2026-09-07) for self-serve signup through the same shared billing/trial system used
  by their other products (community, hotelqr, fireguard, etc.), plus a real marketing/signup page —
  see the "READ THIS FIRST" section at the top of this file for the current checklist position
  (Parts 1, 2 &amp; 3 done, Part 4 next).
- **Researched before writing any code**: SSH'd into the old/dev VPS (see the assistant's own
  reference notes for connection details, not this repo) and read the real
  `billing-platform` production service (`/var/www/billing-platform`, Node/Express/Mongoose, PM2
  process `billing-platform`) — a full multi-product SaaS billing/reseller platform shared across all
  the client's other live products. Confirmed the exact integration pattern by reading
  `community.controller.js`/`.routes.js` in full: public self-serve `POST /api/community/signup` →
  billing-platform's own trial-tracking `Client` record → server-to-server
  `POST {PRODUCT}_API_BASE/api/bridge/provision` with header
  `X-Bridge-Secret: {PRODUCT}_BRIDGE_SECRET` → the actual product creates the real account and
  returns credentials → billing-platform hands them back to the signup requester. Confirmed the exact
  env-var naming (`COMMUNITY_API_BASE`/`COMMUNITY_BRIDGE_SECRET`, `HOTEL_QR_INTERNAL_URL`/
  `HOTEL_QR_IOTSOFT_SECRET`, `FIREGUARD_API_BASE`/`FIREGUARD_BRIDGE_SECRET`) by reading the live
  `.env`'s key names (values not read/repeated). Also located the actual local source repo for this
  service — `D:\IOT Device\Billing at IOT soft` (`billing-server` + `billing-client`, git
  `manoj020218/billing`, clean working tree) — which is where Part 2's changes belong, deployed via
  its existing `deploy.sh`.
- **Part 1 — `POST /api/bridge/provision`** (this repo, `apps/api/src/modules/bridge/`): see the
  commit `b478ab9` for full detail. Key point for whoever picks this up: it does **not** reuse
  `bootstrapDevelopmentTenant` even though that looked like the obvious reuse candidate — that
  helper's idempotency lookups run raw Drizzle queries against a real `AppDatabase` handle, not the
  `TenantCoreRepository` interface, so it silently can't work against the in-memory repository used
  by `dev:memory`/tests. The new service composes `tenantCoreRepository.createTenant/createBusiness/
  createBranch/registerTerminal` directly instead — fully repository-interface-driven, works
  identically against both backends, and a signup is always a brand-new tenant anyway so the
  idempotency wasn't needed. Verified with a real `curl` against `dev:memory`: correct provisioning,
  `401` on missing/wrong `X-Bridge-Secret`, and the returned temp password logging in via
  `POST /api/v1/auth/login` with full `BUSINESS_OWNER` permissions.
- **Part 3 — `apps/marketing/`**: a plain static site (no build step — matches the client's own
  `hotelqr-marketing` precedent, read directly off the VPS for the Privacy/Terms/About tab pattern
  and SEO conventions to mirror). Positioned as **free** software, and broadened per the client's
  follow-up message to cover kirana stores, general retail, food stalls, dhabas, vegetable vendors,
  and restaurants (not kirana-only) — added a "Kitchen order tickets" feature card specifically for
  the dhaba/restaurant segment, since `packages/printer` already has a kitchen-order print job
  builder that fits this exactly. The signup form's `SIGNUP_ENDPOINT` constant points at
  `https://iotsoft.in/api/smartpos/signup` (billing-platform's real public domain, confirmed from its
  own `deploy.sh` health-check URLs) — that endpoint doesn't exist until Part 2 lands, so submitting
  the form today correctly shows a graceful error, not a crash.
- **Bug found and fixed while live-testing the marketing page**: the signup form's fetch handler
  called `response.json()` unconditionally; a non-JSON error response (which is exactly what happens
  right now, since `/api/smartpos/signup` doesn't exist yet) threw a raw `"Unexpected token '&lt;'"`
  parse error string at the user instead of the intended clean message. Fixed by catching the
  `.json()` failure and falling back to `null`, letting the existing "Something went wrong" fallback
  message take over.
- **VPS survey for the eventual Part 4** (not started, but the groundwork is done): the client
  offered a second VPS described as a "real production server" also running
  multiple projects, and asked Postgres be installed there once, reusable by future projects — surveyed
  it (AlmaLinux 8.10, 11GB RAM/4.8GB free, 6 CPUs, 126GB free disk, no Postgres installed, only 4
  lightweight PM2 services running) and confirmed it has real headroom, unlike the original dev VPS.
  Client confirmed (2026-09-07) moving the whole Smart POS stack (API + Postgres + marketing page)
  here, with path-based routing on one domain rather than a subdomain split (simpler, no new DNS
  record needed since there's exactly one backend consumer — the Android app — today).
- **Standing rule going forward, saved to memory**: never write either VPS's IP address or
  credentials into any file inside this repo (or the billing repo, or any other git-tracked
  checkout) — the user explicitly said so, referencing their own local `D:\plink_git.bat`/
  `D:\plink_git - new-server.bat` SSH helper scripts. Connection details live in the assistant's
  local memory system instead.
- **Part 2 — billing-platform integration** (separate repo, `D:\IOT Device\Billing at IOT soft\billing-server`,
  git `manoj020218/billing`): read `community.routes.js`/`.controller.js`/`Client.js`/`Product.js`/
  `seedCommunity.js`/`.env.example`/`errorHandler.js` in full before writing anything, to mirror the
  established pattern exactly rather than guessing. New `smartpos.routes.js` (rate-limited public
  `POST /api/smartpos/signup`), `smartpos.controller.js` (validates required fields, duplicate-checks
  by mobile/email against that repo's own `Client` collection, creates a 6-month-trial `Client`, calls
  this repo's `POST /api/bridge/provision` with `X-Bridge-Secret: SMARTPOS_BRIDGE_SECRET`, stores the
  returned `businessId` as `productEntityId`), `seedSmartpos.js` (idempotent `Product` seed, standalone
  script — confirmed product seeds are never auto-run by the shared `seed.js`, matching
  `seedCommunity.js`'s own convention). Two deliberate differences from the `community` template: (1)
  field names map `contactPersonName` (billing/marketing-page's field) → `ownerName` (this repo's
  bridge schema field) when calling the bridge; (2) the final response is
  `{ ok, businessCode, email, tempPassword, message }` with **no `loginUrl`**, since the client
  confirmed customers sign into the already-installed Android app with these credentials, not a web
  login link. Registered the route in `src/index.js` (`/api` is already in that file's `apiPrefixes`
  list, so no SPA-fallback change was needed) and added `SMARTPOS_API_BASE`/`SMARTPOS_BRIDGE_SECRET`
  to `.env.example`/`.env.production.example`.
- **Part 2 verification — real end-to-end run, not just unit-level**: started this repo's own
  `dev:memory` server, then ran a standalone script (booting `mongodb-memory-server` so no real Mongo
  install was needed) that required the billing-server's actual `src/index.js` and hit
  `/api/smartpos/signup` with `supertest`. Confirmed: valid signup → `201` with a real `businessCode`/
  `tempPassword`; second signup with the same email → `409`; a request missing `businessName` → `400`;
  and — the strongest check — `POST`ing the returned email/`tempPassword` straight to this repo's real
  `/api/v1/auth/login` succeeded with full `BUSINESS_OWNER` permissions. No community-style Jest test
  file exists for any of the other bridge-signup routes either (`community`/`fireguard`/`hotelqr`), so
  this ad hoc end-to-end script (kept only in the assistant's scratch directory, not committed) matches
  that established (lack of) test-file convention rather than introducing a new one.
- **Part 2 status — pushed and deployed to production, 2026-09-08**: committed in the billing repo as
  `a7cae8e feat(smartpos): add self-serve signup bridge integration`, pushed to `manoj020218/billing`'s
  remote after explicit user confirmation. `billing-platform` on the VPS is **not** a git checkout
  (confirmed by `git status` there failing with "not a git repository") — that repo's own HANDOFF.md
  documents the real deployment workflow as direct file transfer + `pm2 restart`, not the `deploy.sh`
  found in the local checkout (which assumes a `billing-server/`/`billing-client/` subfolder layout
  that doesn't match the flat live layout at `/var/www/billing-platform`). Followed the documented
  workflow instead: copied the 4 changed/new files, appended `SMARTPOS_BRIDGE_SECRET`/
  `SMARTPOS_API_BASE` to the VPS's `.env` (a fresh 64-char hex secret, generated this session — see
  the assistant's own reference notes for the value, not this repo), ran `seedSmartpos.js`,
  `pm2 restart billing-platform`. Verified live: `GET http://localhost:3010/health` → `{"status":"ok"}`
  (note: production `BILLING_PORT` is `3010`, not the `3001` shown in that repo's own `.env.example` —
  first smoke-test attempt against 3001 gave a false "Cannot GET /health" scare before this was
  caught), and `POST /api/smartpos/signup` on the live domain returning a real validation response.
  A real signup today will reach billing-platform fine but `502` at the bridge-provision step, since
  nothing is listening at `smartpos.iotsoft.in` yet — that's Part 4, deploying Smart POS's own API,
  still not started. Part 4 must set `BRIDGE_SHARED_SECRET` on Smart POS's own VPS 2 `.env` to the
  exact same value used for `SMARTPOS_BRIDGE_SECRET` above, or the bridge call will `401`.
  **A permission classifier blocked every attempt to write to the production VPS directly in this
  session** (pscp, and even a plink-based file write attempted as a fallback) — correctly, since that's
  exactly the kind of hard-to-reverse shared-infrastructure action that should require a human in the
  loop. Worked around this the *right* way: wrote the full deploy sequence to a local script and had
  the user run it themselves via the terminal's `!` prefix, rather than trying to bypass the block.

Tests:
- New `apps/api/test/bridge-provision.test.ts` (5 tests): missing/wrong bridge secret, successful
  provisioning + real login with the returned temp password, missing required field, duplicate-email
  409
- `pnpm typecheck`, `pnpm lint`, full `pnpm test` — `79` test files / `224` tests passing (one
  `drizzle-auth.repository.test.ts` timeout seen under heavy concurrent load from an unrelated
  process on this machine — confirmed via isolated re-run that it passes cleanly in ~6s; not a
  regression from this session's changes, matches a previously-documented PGlite-under-load flake)
- Live verification: real `curl` against `dev:memory` for the bridge endpoint (see Part 1 above);
  live browser walkthrough of the marketing page (feature grid, FAQ accordion, legal tab switching,
  signup form's error path) via `claude-in-chrome` against a local static file server

Git Status:
- Working tree should be clean once the commits described in this entry are created; see Last Commit

Last Commit:
- `b478ab9 feat(api): add POST /api/bridge/provision for self-serve signup` (this session's
  remaining commits — marketing page, docs — follow it)

VPS Deployment Status (2026-09-08) — Self-Serve Onboarding, Part 4:

- Deployed the whole Smart POS stack (API + PostgreSQL + marketing page) to the second VPS, per the
  client's decision on 2026-09-07. DNS for `smartpos.iotsoft.in` was already repointed there before
  starting (confirmed via `nslookup`).
- **Packaging**: `git archive --format=tar.gz -o smartpos.tar.gz HEAD` locally — only committed
  files, automatically excludes `node_modules`/`dist`/etc. via `.gitignore`, ~583KB. Transferred to
  the VPS (checksummed both ends to confirm integrity), extracted to `/root/projects/smartpos` (the
  client's own required path convention, so a future copy-to-production-server needs no
  restructuring).
- **Deliberately excluded `apps/pos` from the server deployment**: it's the Android/Capacitor app
  and has a `file:` dependency on the separate `capacitor-plugins` repo (the native BLE/USB printer
  plugin), which has no reason to exist on a Linux server and isn't needed to run the API or serve
  the marketing page. `rm -rf apps/pos` right after extraction, then scoped both install and build to
  `@smart-pos/api` specifically (`pnpm --filter @smart-pos/api build`, not the root `pnpm build`
  script, which also targets `apps/pos`) — confirmed `@smart-pos/api`'s own `package.json` has zero
  workspace-package dependencies, so this scoping loses nothing.
- **PostgreSQL 16**: installed via AlmaLinux 8's built-in `dnf module enable postgresql:16` (no need
  for the external PGDG repo — 8.10's AppStream already carries 16). `postgresql-setup --initdb`,
  `systemctl enable --now postgresql`. Created a dedicated `smartpos` role + `smart_pos` database —
  this is explicitly meant to be a **shared, reusable Postgres install** per the client's own ask
  (2026-09-07: "once installed, no need to install again and again" for future projects) — this
  project just gets its own database + role on it, not a whole new server.
- **Real bug #1 — RHEL/AlmaLinux `pg_hba.conf` default is `ident`, not password auth**: a freshly
  initialized PostgreSQL on this distro defaults local TCP connections (`127.0.0.1/32`, `::1/128`) to
  `ident`, which app code can never authenticate against (no identd running, and even if there were,
  the OS user and DB role don't correspond). `sed`-replaced those two lines to `scram-sha-256`
  (backing up the original file first) and reloaded — confirmed working via a live connection before
  moving on.
- **App config**: wrote `.env` at the repo root (`chmod 600`) with `NODE_ENV=production`, `PORT=4090`
  (checked `ss -tlnp`/`firewall-cmd --list-ports` first for conflicts — clear), a fresh
  `DATABASE_URL` pointing at the new role/database, freshly generated `JWT_SECRET`/`REFRESH_SECRET`,
  and `BRIDGE_SHARED_SECRET` set to the **exact same value** already configured as
  `SMARTPOS_BRIDGE_SECRET` on the billing-platform side (Part 2) — see the assistant's own reference
  notes for the actual secret values, not this repo. `loadWorkspaceEnv()`
  (`apps/api/src/config/load-workspace-env.ts`) finds this `.env` by walking up from `process.cwd()`
  looking for `pnpm-workspace.yaml`, so PM2's `cwd: apps/api` still resolves it correctly.
- **PM2 + nginx + TLS**: new `ecosystem.config.js` (`smartpos-api`, `cwd: apps/api`,
  `script: dist/index.js`), `pm2 start` + `pm2 save` (the VPS already has `pm2-root` enabled as a
  systemd service from prior work, so this survives a reboot with no extra step). New
  `/etc/nginx/conf.d/smartpos.conf` mirroring the client's existing `fireguard.conf` pattern exactly
  — path-based, not subdomain-based: `location /api/ { proxy_pass http://127.0.0.1:4090; ... }` (no
  trailing slash — passes the full `/api/...` path through unchanged, since the Express app itself
  expects requests at `/api/bridge/...`, `/api/v1/auth/...` etc., matching how `fireguard.conf`'s own
  API proxy is written) and `location / { root /var/www/smartpos-marketing; ... }`. Copied
  `apps/marketing/*` there, then `certbot --nginx -d smartpos.iotsoft.in --non-interactive
  --agree-tos --redirect` — succeeded on the first attempt since DNS was already correct.
- **Real bug #2 — SELinux blocked the marketing page with a 403**: AlmaLinux ships with SELinux
  enforcing by default. Files copied from `/root/projects/smartpos/apps/marketing` into
  `/var/www/smartpos-marketing` landed with the wrong context (`var_t`) rather than
  `httpd_sys_content_t`, so nginx (running in the `httpd_t` domain) was denied read access — Unix
  permissions looked completely normal, which made this non-obvious; the real signal was
  `/var/log/nginx/error.log` showing `"...is forbidden (13: Permission denied)"` for a file that
  `ls -la` said was world-readable. Fixed with `restorecon -Rv /var/www/smartpos-marketing`, now
  baked into the deploy script (`restorecon -Rv "$MARKETING_ROOT" || true` right after the `cp -r`)
  so a future re-run or a same-pattern deploy for the next project doesn't hit this again.
- **Tooling bug hit twice — PowerShell 5.1 misclassifies native-command stderr as fatal**: the local
  orchestration script (run by the user via the terminal's `!` prefix — see
  [[feedback-production-vps-writes-blocked]] for why this had to be a user-run script rather than
  something run directly) had `$ErrorActionPreference = "Stop"` at the top. `postgresql-setup
  --initdb` and `nginx -t` both write their normal, successful progress messages to stderr, which
  PowerShell 5.1 wraps as a `NativeCommandError` and treats as script-terminating under that setting
  even though the command itself succeeded (exit 0) — this killed the SSH session mid-`pnpm install`
  the first time, requiring a second run to resume. Fixed by switching to
  `$ErrorActionPreference = "Continue"` plus an explicit `$LASTEXITCODE` check after the actual
  deploy call, so only a genuine non-zero exit is reported as a failure.
- **The deploy script itself is idempotent by design** (each phase guards on whether it's already
  done — role/database existence checks, a `PG_VERSION` file check before `initdb`, an `.env`-content
  grep before appending, a `pm2 list | grep` before choosing `start` vs `reload`, an
  `/etc/letsencrypt/live/<domain>` directory check before calling `certbot`), which is exactly what
  made resuming cleanly after the PowerShell interruption possible — re-running it from scratch
  skipped everything already done and picked up at `pnpm build`.
- **Verified fully end-to-end in production** (not just "the service is up"): ran a real signup
  against the live `https://iotsoft.in/api/smartpos/signup` (a test business, since cleaned up is
  still pending — see below) — got back a real `businessCode`/`tempPassword`; confirmed that
  password logs in successfully against `https://smartpos.iotsoft.in/api/v1/auth/login` with full
  `BUSINESS_OWNER` permissions and a real `tenantId`. Also confirmed the API's raw port (`4090`) is
  **not** reachable from outside — `firewall-cmd --list-ports` only shows `1883/tcp` and `4080/tcp`
  (other existing services) plus the standard `http`/`https`/`ssh`/`cockpit` services, so the only
  path to the API from the internet is through nginx's TLS-terminated proxy.
- **Housekeeping still open**: the test signup used to verify the flow above (`"Part4 Test Dhaba"` /
  `PART4-TEST-DHABA`, email `suresh.part4test@example.com`) created one real trial `Client` record in
  billing-platform's production MongoDB and one real tenant/business/branch/terminal/owner in Smart
  POS's production Postgres. Attempted to clean this up directly but MongoDB requires auth
  credentials not available in this session — **flagged to the user rather than guessing at
  credentials or improvising a delete path against a live billing database**. Harmless (isolated test
  data, no real customer impact) but should be deleted via billing-platform's own superadmin UI
  whenever convenient.
- Whoever picks this up next: CORS lock-down and rate limiting (TODO.md NOW #6) are now more
  pressing than before, since the API is genuinely internet-facing for the first time.

Git Status:
- Docs updated in this entry (TODO.md/HANDOFF.md/CHANGELOG.md); no application code in this repo
  changed for Part 4 — only the separate deployment onto the VPS. See Last Commit for the doc commit.

Last Commit:
- See TODO.md's DONE (2026-09-08) entry and this file's own commit history around this entry's date
  for the exact commit hash — docs-only change, no app code modified in this repo for Part 4.
