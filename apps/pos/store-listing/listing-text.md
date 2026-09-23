# Google Play Store listing — Smart POS

Draft text + image assets for the first Play Console submission. Images are in `./images/`.
Nothing here has been submitted yet — copy/paste into Play Console's Store Listing page.

## App details

- **App name**: Smart POS KIOSK by jenix
- **Package name**: `in.iotsoft.smartpos`
- **Category**: Business
- **Tags** (if asked): Point of Sale, Billing, Inventory, Retail
- **Contact email**: jenixindia@gmail.com (same address already used on the marketing site's legal page)
- **Website**: https://smartpos.iotsoft.in
- **Privacy Policy URL**: https://smartpos.iotsoft.in/#legal (Privacy tab is the default active tab)

## Short description (max 80 characters)

```
Free billing & inventory POS for shops, stalls, dhabas and restaurants
```
(70 characters)

## Full description (max 4000 characters)

```
Smart POS is free billing and inventory software for kirana stores, general
retail shops, food stalls, dhabas, vegetable vendors, and restaurants.

Run it as a staff-operated billing counter, a customer-facing Smart
Self-Service Kiosk with token printing and UPI QR payment, or both at once
on different terminals in the same shop.

WORKS FULLY OFFLINE
Keep billing during internet outages. Sales, stock, and customer changes
sync automatically the moment the connection comes back — nothing is lost.

FAST, TOUCH-FRIENDLY BILLING
Search by name, SKU, or barcode. Tap a product to add it to the cart,
apply quick or custom discounts, and check out with Cash, Card, UPI, or
other payment methods — with an on-screen numeric keypad built for
counter speed.

THERMAL RECEIPT PRINTING
Print receipts directly from the till on USB or Bluetooth thermal
printers. GST businesses can turn on tax-inclusive pricing with an
itemised CGST/SGST split on every printed receipt.

INVENTORY THAT TRACKS ITSELF
Stock levels update automatically with every sale. Set opening stock and
low-stock alerts per product, or mark items that don't need stock
tracking at all (like made-to-order food).

SELF-SERVICE KIOSK MODE
Let customers browse the catalog, place their own order, and pay by UPI
QR code — Smart POS prints a token number for order pickup and keeps a
live order queue for the counter staff.

BUILT FOR HOW INDIAN SHOPS ACTUALLY RUN
- GST on/off toggle with preset or custom tax rates
- Multiple terminals and branches under one business account
- Staff logins with cashier/owner permission levels
- CSV import and export for your product catalog
- Customer records for repeat billing and order history

NO MONTHLY FEE
Smart POS is free to use. Create your shop account in the app and start
billing in minutes.

Need help or have a question? Email jenixindia@gmail.com.
```

## Content rating questionnaire (Play Console → App content)

Answer as: general business/utility app, no user-generated public content,
no ads, no gambling.

| Question | Answer |
|---|---|
| Violence | None |
| Sexuality | None |
| Language | None |
| Controlled substances | None |
| Gambling | None (app has no betting/wagering features) |
| User-generated content shared with other users | No (each shop's data is private to that shop — see Data safety) |
| Users can communicate with each other | No |
| Shares location | No |
| Digital purchases | No (the app itself is free; it does not sell anything through Play billing) |

Expected result: **Everyone** rating in most regions (IARC/ESRB/PEGI/etc. all map to the lowest tier when every category above is "None"/"No").

## Data safety section (Play Console → App content → Data safety)

Based on the actual data flows in the code: sign-up/login collects business
+ contact details; the POS itself stores each shop's own catalog, sales,
and customer records; payment gateway API credentials (Razorpay-style Key
ID/Secret) are stored **encrypted, entered by the shop owner**, only if
they choose to enable online payment collection — this is the business's
own gateway credential, not a shopper's card number (Smart POS never
collects or stores customer card/bank details; UPI/card payments are
completed on the customer's own payment app).

**Does your app collect or share any of the required user data types?** Yes

| Data type | Collected? | Shared with 3rd parties? | Purpose |
|---|---|---|---|
| Name (owner/contact name) | Yes | No | Account creation, app functionality |
| Email address | Yes | No | Account creation, login |
| Phone number | Yes | No | Account creation, support |
| Physical address (shop address) | Yes | No | Account creation |
| Customer names (entered by the shop into their own catalog) | Yes | No | App functionality (the shop's own customer records) |
| Other financial info (payment gateway API credentials, shop-owner-entered) | Yes | No | App functionality (enables UPI/card collection); encrypted at rest |
| App activity / diagnostics (crash logs, if any crash reporting is added later) | Only if applicable — currently none wired up | No | — |

**Is all of this data encrypted in transit?** Yes (HTTPS/TLS to the API)

**Can users request data deletion?** Yes — email jenixindia@gmail.com (already stated on
the privacy policy page) to request account/data deletion.

> Double-check this table against Play's exact current category list when filling the
> form — Play periodically renames/regroups these categories, and the questionnaire UI
> is the source of truth over this draft.

## Image assets (in `./images/`)

| File | Use | Dimensions |
|---|---|---|
| `icon-512.png` | Hi-res app icon | 512×512, 32-bit PNG with alpha |
| `feature-graphic-1024x500.png` | Feature graphic | 1024×500, no alpha |
| `screenshot-1-login.png` | Screenshot — sign-in / branding | 1600×1000 |
| `screenshot-2-catalog.png` | Screenshot — product catalog / empty cart | 1600×1000 |
| `screenshot-3-cart.png` | Screenshot — cart with items, tax, totals | 1600×1000 |
| `screenshot-4-payment.png` | Screenshot — cash payment keypad | 1600×1000 |

All four screenshots were captured against the app's local in-memory demo
data (`owner@example.com` seed account), **not production** — no real shop
data is in any image. Upload all four to both the "Phone" and "7-inch/10-inch
tablet" screenshot slots — the app is tablet-first (landscape kiosk layout)
but Play requires at least 2 phone screenshots regardless, and these meet
the size/aspect requirements for both.

Play still requires **at least 2 screenshots** — all 4 here comfortably clears
that. Consider adding a 5th/6th later (e.g. Settings/GST screen, Self-Service
Kiosk mode) once you have more time — not blocking for first submission.

## Still needed before you can actually submit (not done in this pass)

1. **Google Play Developer account** — one-time $25 fee + Google identity
   verification (can take several days). Start this first if it isn't done
   already, since it's the longest pole.
2. **Signed AAB**, not the APK built so far — `./gradlew.bat bundleRelease`
   in `apps/pos/android`, using the existing release keystore
   (`D:\IOT Device\Smart POS\keystores\smart-pos-release.jks`, alias
   `smartpos`). Untested — try it before uploading.
3. Actually filling in the Play Console Store Listing / Content rating /
   Data safety pages with the text above, and uploading the images — this
   pass only prepared the content, it wasn't submitted anywhere.
