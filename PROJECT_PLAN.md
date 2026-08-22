# Multi-Tenant Offline-First POS

## Codex Master Execution Plan

## 1. Project Objective

Build a professional, multi-tenant, offline-first POS platform that can eventually support:

* Android tablets
* Android phones
* Windows PCs
* PWA/browser access
* Bluetooth thermal printers
* Wi-Fi/LAN thermal printers
* USB thermal printers where supported
* Multiple businesses
* Multiple branches per business
* Multiple POS terminals per branch
* Central cloud reporting
* Offline billing
* Automatic cloud synchronization

The system must be designed as a SaaS product capable of supporting a large number of customers.

The initial development priority is:

**Backend → Database → Business Logic → Sync Engine → Tests → Client Data Layer → Printer Layer → Functional Frontend → UI/UX**

UI/UX design must be done near the end.

Do not spend development time polishing screens before the backend, local data model, sync engine, and business rules are stable.

---

# 2. Non-Negotiable Development Rules

These rules apply throughout the entire project.

### File Size

No manually maintained source file may exceed:

**200 lines**

Preferred maximum:

**150–180 lines**

If a file approaches 180 lines, split it before adding more functionality.

This applies to:

* controllers
* services
* repositories
* routes
* components
* hooks
* utilities
* schemas
* tests
* middleware

Generated files may be exempt only when generated automatically by a tool and not manually maintained.

Do not use file-size limits as an excuse to create meaningless wrappers. Split files by responsibility.

---

# 3. Core Technology Stack

Use a PNPM monorepo.

## Backend

* Node.js
* TypeScript
* Express
* PostgreSQL
* Drizzle ORM
* Zod validation
* REST API
* WebSocket only where real-time functionality requires it

## Authentication

* JWT access token
* Refresh token
* Secure password hashing
* Role-based access control
* Device/terminal registration

## Android

Later phase:

* React
* TypeScript
* Capacitor
* Native SQLite
* Kotlin Capacitor plugins where hardware access is required

## Browser / Windows PWA

* React
* TypeScript
* IndexedDB local persistence
* Same business logic as Android where possible

A future Windows desktop wrapper may use Tauri if direct USB/serial/printer integration becomes necessary.

## Cloud

* Node/Express API
* PostgreSQL
* Object storage when needed
* Redis only when actual scaling requirements justify it

Do not introduce Redis, Kafka, RabbitMQ, Kubernetes, microservices, or other infrastructure prematurely.

Start with a clean modular monolith.

---

# 4. Primary Architecture Principle

The POS must be:

## OFFLINE FIRST

A store must continue billing even if:

* internet stops
* VPS is unreachable
* Wi-Fi internet is unavailable
* mobile network is unavailable

The local client is responsible for immediate POS operations.

The server is responsible for:

* centralized data
* synchronization
* multi-device coordination
* reporting
* business administration
* subscription management
* backup
* cross-branch visibility

Never make invoice creation depend on a live VPS connection.

Correct flow:

```text
User creates sale
        ↓
Validate locally
        ↓
Save invoice locally
        ↓
Save stock movement locally
        ↓
Save payment locally
        ↓
Print receipt immediately
        ↓
Create sync/outbox event
        ↓
Return success to cashier

Internet available?
        ↓
Yes
        ↓
Sync events to VPS
```

Cloud synchronization happens separately from local billing.

---

# 5. Monorepo Structure

Use approximately:

```text
/
├── apps/
│   ├── api/
│   ├── pos/
│   └── admin/
│
├── packages/
│   ├── contracts/
│   ├── domain/
│   ├── validation/
│   ├── sync/
│   ├── printer/
│   └── shared/
│
├── docs/
│   ├── architecture/
│   ├── api/
│   └── decisions/
│
├── PROJECT_PLAN.md
├── HANDOFF.md
├── CHANGELOG.md
├── TODO.md
├── README.md
└── pnpm-workspace.yaml
```

Do not create `apps/pos` UI screens during early backend phases unless required for basic API testing.

---

# 6. Codex Session Survival Protocol

This is extremely important.

Codex must assume that its context can disappear at any time.

Therefore project knowledge must live inside the repository, not only inside the conversation.

Codex must maintain:

```text
PROJECT_PLAN.md
HANDOFF.md
TODO.md
CHANGELOG.md
```

## PROJECT_PLAN.md

Permanent architecture and project specification.

Do not rewrite it casually.

## HANDOFF.md

Must describe the exact current development state.

Update after every meaningful completed task.

It must contain:

```text
Current Phase:
Current Subtask:

Completed:
- ...

Currently Working:
- ...

Next:
- ...

Important Decisions:
- ...

Known Issues:
- ...

Tests:
- ...

Last Successful Commands:
- ...

Database Status:
- ...

API Status:
- ...

Git Status:
- clean / changes pending

Last Commit:
- commit hash
```

A new Codex session should be able to continue simply by reading:

1. `PROJECT_PLAN.md`
2. `HANDOFF.md`
3. `TODO.md`

---

# 7. Git Discipline

Git must be used as a recovery mechanism.

Never allow a large amount of completed work to exist only in the working directory.

After each completed logical slice:

```text
implementation
→ tests
→ lint
→ typecheck
→ update HANDOFF.md
→ git status
→ commit
→ push
```

Examples of logical slices:

```text
feat(auth): add login and refresh tokens

feat(tenant): add business and branch models

feat(product): add product creation API

feat(stock): add stock movement ledger

feat(sync): add idempotent event ingestion
```

Do not create one giant commit covering an entire phase.

Never:

* force push
* rewrite working history unnecessarily
* delete user code without justification
* reset hard unless explicitly instructed
* remove working features to simplify implementation

If context appears limited, do not start another feature.

Instead:

```text
finish current smallest safe unit
run tests
update HANDOFF.md
commit
push
```

---

# 8. Development Workflow

For every task Codex receives:

### Step 1

Read:

```text
PROJECT_PLAN.md
HANDOFF.md
TODO.md
```

### Step 2

Inspect existing implementation.

Do not assume something is missing before checking.

### Step 3

State internally the smallest implementation slice required.

### Step 4

Implement only that slice.

### Step 5

Write/update tests.

### Step 6

Run:

```text
lint
typecheck
unit tests
relevant integration tests
```

### Step 7

Fix regressions.

### Step 8

Update documentation.

### Step 9

Commit and push.

### Step 10

Move to the next item.

Never attempt three major phases simultaneously.

---

# 9. Architecture Rule: Modular Monolith

Do not start with microservices.

Backend modules should remain logically independent inside one application.

Example:

```text
modules/
├── auth/
├── tenants/
├── businesses/
├── branches/
├── terminals/
├── users/
├── products/
├── categories/
├── customers/
├── suppliers/
├── sales/
├── payments/
├── inventory/
├── purchases/
├── sync/
├── reports/
└── audit/
```

Each module should contain small focused files such as:

```text
product.routes.ts
product.controller.ts
product.service.ts
product.repository.ts
product.schema.ts
product.types.ts
```

Do not combine the entire module into one file.

---

# 10. Database Isolation

This is a multi-tenant platform.

Every tenant-owned record must be scoped appropriately.

Core hierarchy:

```text
Tenant
   ↓
Business
   ↓
Branch
   ↓
Terminal
```

Users may have access to:

* tenant
* specific business
* specific branches
* specific POS terminal functionality

Every relevant query must enforce tenant ownership.

Never trust a `tenantId` supplied by the frontend.

Tenant identity must come from authenticated authorization context.

---

# 11. Primary Database Entities

Implement database domains gradually.

Do not build everything in one migration.

Core models will eventually include:

```text
Tenant

Business

Branch

Terminal

User

Role

UserBranchAccess

Category

Product

ProductVariant

Unit

TaxProfile

Customer

Supplier

Sale

SaleItem

Payment

StockMovement

Purchase

PurchaseItem

SyncEvent

AuditLog

AppSetting

BranchSetting

PrinterProfile
```

Additional models may be introduced later.

---

# 12. Identifier Strategy

Never use auto-increment database numbers as globally meaningful identifiers.

Use:

**ULID or UUID**

for internal record IDs.

Example:

```text
sale.id =
01K9F7S4P8M...
```

Human-facing invoice number is separate.

Example:

```text
INV-JPR-01-000284
```

Therefore:

```text
database ID != invoice number
```

This avoids collisions between offline devices.

---

# 13. Financial Data Rules

Do not use floating-point arithmetic for money.

Store monetary values using integer smallest currency units or a safe decimal strategy.

For INR, recommended representation:

```text
₹125.50
```

stored internally as:

```text
12550 paise
```

Where practical.

Never calculate financial totals using normal JavaScript floating-point logic such as:

```text
0.1 + 0.2
```

without a safe money abstraction.

Create shared money calculation utilities and tests.

---

# 14. Sales Data Must Be Effectively Immutable

Once a finalized sale is created, do not silently modify historical financial data.

Correction mechanisms should include:

* cancellation
* return
* refund
* credit note
* adjustment transaction

Maintain audit history.

Never simply overwrite previous sales records.

---

# 15. Inventory Architecture

Inventory must use a movement ledger.

Do not rely solely on:

```text
product.stock = 100
```

Use:

```text
StockMovement
```

with types such as:

```text
OPENING_STOCK

PURCHASE

SALE

SALE_RETURN

PURCHASE_RETURN

ADJUSTMENT_IN

ADJUSTMENT_OUT

DAMAGE

TRANSFER_IN

TRANSFER_OUT
```

Example:

```text
+100 PURCHASE
-3 SALE
-2 SALE
+1 SALE_RETURN
-1 DAMAGE
```

Current stock can then be calculated or materialized from this ledger.

Every stock-changing transaction must generate a stock movement.

---

# 16. Audit Logging

Important administrative operations require an audit trail.

Record:

```text
actorUserId
tenantId
branchId
entityType
entityId
action
timestamp
metadata
```

Important examples:

```text
PRODUCT_PRICE_CHANGED

SALE_CANCELLED

STOCK_ADJUSTED

USER_CREATED

ROLE_CHANGED

SETTING_CHANGED
```

Do not store sensitive passwords or tokens inside audit metadata.

---

# 17. PHASE 0 — Repository Foundation

Before implementing product features:

Create:

* PNPM workspace
* TypeScript configuration
* ESLint
* formatter
* test framework
* environment configuration
* structured logging
* error handling
* health endpoint
* database connection
* migration framework
* CI test workflow
* Git ignore rules

Required endpoint:

```text
GET /health
```

Return:

```json
{
  "status": "ok"
}
```

Database health may later be included separately.

### Phase 0 completion criteria

The project must successfully run:

```text
pnpm install

pnpm lint

pnpm typecheck

pnpm test
```

API server must start successfully.

Commit and push Phase 0 before Phase 1.

---

# 18. PHASE 1 — Multi-Tenant Core

Implement:

```text
Tenant

Business

Branch

Terminal
```

Relationship:

```text
Tenant
 └ Business
    └ Branch
       └ Terminal
```

Basic operations:

```text
Create business

Update business

Create branch

Update branch

Register terminal

Disable terminal
```

Do not build UI.

Test tenant isolation.

Example test:

Tenant A must never retrieve Tenant B's branches.

### Completion criteria

* migrations pass
* CRUD tests pass
* tenant isolation tests pass
* API validation implemented
* OpenAPI/API docs updated where applicable
* Git committed
* HANDOFF updated

---

# 19. PHASE 2 — Authentication and RBAC

Implement authentication.

Initial roles:

```text
PLATFORM_ADMIN

BUSINESS_OWNER

BUSINESS_ADMIN

BRANCH_MANAGER

CASHIER

INVENTORY_MANAGER

REPORT_VIEWER
```

Do not hard-code permission checks throughout controllers.

Create permission-based authorization.

Examples:

```text
product:create

product:update

sale:create

sale:refund

inventory:adjust

report:view

user:manage
```

Roles map to permissions.

This allows customized roles later.

Implement:

```text
login

refresh token

logout

password change

password reset architecture

session/device tracking

disabled user check
```

Add rate limiting where appropriate.

Tests must cover authorization failures.

---

# 20. PHASE 3 — Product Master

Implement:

```text
Category

Unit

TaxProfile

Product
```

Product architecture must support extremely fast product entry later.

Only a very small number of fields should be mandatory.

## Required fields for basic product creation

Prefer only:

```text
Product Name

Selling Price
```

Everything else should have defaults or remain optional.

Possible optional fields:

```text
Barcode

SKU

Category

Purchase Price

Tax Profile

Opening Stock

Unit

Low Stock Level

Description

HSN/SAC

Image

Brand
```

Default values should come from business settings.

Example:

```text
Default Unit = PCS

Default Tax = No Tax / configured business tax

Track Inventory = true/false based on business configuration

Category = General
```

The backend API must therefore support:

```json
{
  "name": "Coca Cola 500ml",
  "sellingPrice": 4000
}
```

without requiring unnecessary fields.

Server automatically generates:

```text
ID
SKU if required
timestamps
tenant linkage
business linkage
default unit
default tax profile
```

Barcode must not be mandatory.

---

# 21. Product Search

Design search for POS speed.

Search must support:

```text
name

SKU

barcode
```

Barcode exact match should have priority.

Search response must be optimized for POS usage.

Do not send unnecessarily large product objects during checkout searches.

Support pagination for management screens.

---

# 22. PHASE 4 — Customer Master

Customer creation at checkout must also require minimal input.

Basic customer fields:

```text
name
mobile
email
address
tax number
notes
```

Do not require all fields.

For normal POS sales:

**Customer is optional.**

Support a default:

```text
Walk-in Customer
```

Never force cashier to create a customer for every transaction.

---

# 23. PHASE 5 — Sales Engine

This is a critical phase.

Implement sales as a domain service rather than business logic inside the controller.

Sale must support:

```text
items

quantity

selling price

discount

tax

subtotal

total

customer

branch

terminal

cashier

payment

timestamp
```

Calculations must occur in trusted domain logic.

Never accept a frontend-computed final total without server validation.

The server must recalculate totals.

Support:

```text
CASH

CARD

UPI

OTHER
```

Later:

```text
SPLIT PAYMENT

CREDIT
```

can be introduced cleanly.

---

# 24. Invoice Numbering

Invoice number must be human readable but independent from the database ID.

Possible format:

```text
INV-{BRANCH}-{TERMINAL}-{SEQUENCE}
```

Example:

```text
INV-JPR-01-000125
```

Offline invoice numbering must not create collisions.

Therefore either reserve number ranges per terminal or incorporate terminal identity into the invoice number.

Internal ULID remains authoritative.

---

# 25. PHASE 6 — Inventory Ledger

Connect sales to stock movements.

Finalizing:

```text
2 × Coke
```

must automatically create an inventory movement:

```text
SALE
quantity = -2
productId = ...
referenceId = saleId
```

Returning one item should create:

```text
SALE_RETURN
quantity = +1
```

Do not modify old movement records.

Create new corrective movements.

Implement inventory balance query.

Tests must verify stock calculations.

---

# 26. PHASE 7 — Purchase and Supplier Foundation

After sales/inventory are stable, implement:

```text
Supplier

Purchase

PurchaseItem
```

Finalized purchases create positive inventory movements.

Avoid building advanced accounting during the first implementation.

Initial purpose is:

```text
purchase entry
supplier association
purchase cost
stock increase
```

---

# 27. PHASE 8 — Offline Sync Protocol

This is one of the most important architectural phases.

Do not make synchronization an afterthought.

Create an explicit synchronization protocol.

Client will maintain:

```text
Outbox
```

Each locally created transaction generates an event.

Example:

```json
{
  "eventId": "ULID",
  "deviceId": "ULID",
  "type": "SALE_CREATED",
  "entityId": "ULID",
  "createdAt": "...",
  "payload": {}
}
```

Server endpoint concept:

```text
POST /sync/push
```

The endpoint must be:

**idempotent**

If the same event is received repeatedly, it must not duplicate a sale.

Server stores processed event IDs.

Client may therefore safely retry synchronization.

---

# 28. Sync Pull

Client also requires server changes.

Concept:

```text
GET /sync/pull?cursor=...
```

Server returns:

```text
changes
nextCursor
serverTime
```

Only changed records should be transferred.

Do not download the complete database repeatedly.

---

# 29. Sync Conflict Strategy

Different data categories require different conflict rules.

## Financial transactions

Append-only.

Do not use last-write-wins.

Examples:

```text
Sales
Payments
Returns
Stock movements
```

## Master data

Server-authoritative with version information.

Examples:

```text
Product name
Product price
Category
Customer
```

Use:

```text
updatedAt
version
```

where required.

Never silently lose locally created transactions because cloud data is newer.

---

# 30. Sync Status

Each local event should have a state:

```text
PENDING

SYNCING

SYNCED

FAILED
```

Retry automatically.

Use exponential retry/backoff.

Permanent validation errors must be distinguishable from temporary network failures.

---

# 31. PHASE 9 — Reporting APIs

Only after transactional functionality is stable.

Initial reports:

```text
Today's Sales

Date Range Sales

Branch Sales

Terminal Sales

Cashier Sales

Payment Method Summary

Top Products

Low Stock

Current Stock

Stock Movement

Sales Return

Tax Summary
```

Do aggregation server-side.

Do not send millions of raw transactions to the frontend for reporting.

---

# 32. PHASE 10 — Business Settings

Create configurable defaults.

Examples:

```text
currency

timezone

invoice prefix

default unit

default tax profile

inventory tracking default

receipt footer

business logo

branch address

receipt printer profile
```

India may default to:

```text
Currency = INR
Timezone = Asia/Kolkata
```

but settings should remain configurable.

---

# 33. PHASE 11 — Printer Domain

Do not initially tightly couple business logic to one printer.

Create a shared printer contract.

Concept:

```text
PrinterService
```

Functions should eventually support:

```text
printReceipt()

printKitchenOrder()

printTestPage()

openCashDrawer()

cutPaper()

printBarcode()

printQrCode()
```

Connection types:

```text
BLUETOOTH

TCP

USB

SYSTEM
```

Use ESC/POS as the primary receipt printer command model.

---

# 34. Printer Profiles

Each branch can store printer profiles.

Example:

```text
Name:
Billing Printer

Type:
TCP

IP:
192.168.1.55

Port:
9100

Paper:
80mm
```

Another:

```text
Name:
Mobile Printer

Type:
BLUETOOTH

Device:
XX:XX:XX...
```

Later restaurant mode can route:

```text
Receipt → Billing Printer

Food → Kitchen Printer

Drinks → Bar Printer
```

---

# 35. PHASE 12 — Client Data Architecture

Only after backend API and synchronization contracts are stable should substantial POS frontend implementation begin.

React code must separate:

```text
UI

domain logic

local database

remote API

sync

printer
```

UI components must not directly contain API business logic.

---

# 36. Local Database Abstraction

Create a common repository interface.

Example concept:

```text
ProductRepository

SaleRepository

CustomerRepository

StockRepository

SyncRepository
```

Platform implementations may use:

```text
Android:
SQLite

Browser:
IndexedDB

Desktop:
SQLite
```

React business logic should not care which database implementation is active.

---

# 37. Android Architecture

Use:

```text
React
TypeScript
Capacitor
SQLite
```

Native hardware functions should be exposed through small Capacitor plugins.

Do not create one giant native plugin.

Preferred plugin separation:

```text
pos-printer-bluetooth

pos-printer-usb

device-info

barcode-scanner
```

where native access is required.

Keep Kotlin files under 200 lines too.

---

# 38. Windows Strategy

Initial Windows support may use:

```text
PWA
```

for normal operation.

For hardware requiring native access, introduce either:

```text
small local printer bridge
```

or later:

```text
Tauri wrapper
```

Do not duplicate the whole React application for Windows.

---

# 39. PHASE 13 — Functional POS UI

Only now begin cashier UI.

The primary design target is:

**Tablet first**

Then:

**Mobile**

Then:

**Windows larger screen**

Use responsive layouts.

---

# 40. POS UI Golden Rule

The cashier interface must be designed primarily for:

**TOUCH**

Do not design functionality that depends on:

```text
mouse hover

right click

tiny icons

keyboard shortcuts

precision pointer movement
```

Keyboard shortcuts may be added as optional desktop acceleration later, but never required.

Every essential action must work by touch.

---

# 41. Touch Target Requirements

Buttons must be large enough for rapid repeated operation.

Critical buttons:

```text
Add Item

Quantity

Remove Item

Discount

Pay

Cash

UPI

Print

New Sale
```

must be visually clear and separated.

Do not use tiny text links for important actions.

---

# 42. Primary POS Screen

Tablet layout concept:

```text
┌─────────────────────────────────────────────┐
│ Search / Scan                              │
├──────────────────────────┬──────────────────┤
│                          │                  │
│ Product Grid             │ Current Bill     │
│                          │                  │
│                          │                  │
│                          │                  │
├──────────────────────────┤                  │
│ Categories               │                  │
├──────────────────────────┼──────────────────┤
│                          │ TOTAL            │
│                          │ ₹ 1,245           │
│                          │                  │
│                          │ [ PAY ]          │
└──────────────────────────┴──────────────────┘
```

Do not copy this blindly.

Optimize after usability testing.

---

# 43. Checkout Interaction Goal

Common sale should require approximately:

```text
tap item

tap item

tap PAY

tap CASH
```

and finish.

Do not force unnecessary confirmation dialogs.

Print automatically according to business settings.

---

# 44. Product Entry UX — Critical Requirement

Adding products must require the least possible typing.

Default quick-add form:

```text
Product Name      REQUIRED

Selling Price     REQUIRED
```

Everything else should initially stay hidden or defaulted.

Primary actions:

```text
SAVE

SAVE & ADD ANOTHER
```

Advanced options can be behind:

```text
MORE DETAILS
```

---

# 45. Product Entry Example

Initial screen:

```text
Add Product

Product Name
[_____________________]

Selling Price
₹ [____________]

[ SAVE & NEW ]   [ SAVE ]
```

This is enough to create a valid sellable product.

After saving, backend automatically provides:

```text
ID

SKU/default identifier

General category

default unit

default tax profile

timestamps
```

depending on configured business defaults.

---

# 46. Optional Product Information

A separate expandable area may contain:

```text
Barcode

Purchase Price

Opening Stock

Category

Unit

Tax

HSN

Low Stock Alert

Description

Brand

Image
```

Do not show all of these fields prominently during normal quick product creation.

---

# 47. Barcode Entry

If barcode scanner is available:

```text
scan barcode
```

should populate the barcode automatically.

If barcode already exists:

show existing product rather than creating a duplicate.

---

# 48. Smart Defaults

The UI should learn/use configured business defaults.

Example:

A grocery store may have:

```text
Unit = PCS

GST = 5%

Inventory = enabled

Category = General
```

Then cashier should not repeatedly enter them.

Defaults should be configurable once at business or branch level.

---

# 49. Numeric Entry

Price and quantity fields should open appropriate numeric input on touch devices.

Do not make users switch unnecessarily between keyboard modes.

For commonly used values consider quick quantity controls:

```text
-  1  +
```

---

# 50. Product Duplication

Provide:

```text
Duplicate Product
```

later.

Useful when adding similar products.

Example:

```text
Coke 250 ml
Coke 500 ml
Coke 1 L
```

User duplicates and modifies only necessary fields.

---

# 51. Rapid Bulk Entry

Later introduce a fast-entry mode resembling:

```text
NAME          PRICE

Coke          40
Pepsi         40
Sprite        40
Water         20
```

with repeated:

```text
Save & Next
```

Do not make spreadsheet-style bulk entry part of initial MVP unless needed.

---

# 52. Customer Entry UX

At checkout customer entry must not interrupt normal sales.

Default:

```text
Walk-in Customer
```

Optional customer lookup:

```text
mobile

name
```

Quick create should ideally require:

```text
Mobile
```

or:

```text
Name + Mobile
```

depending on configured business requirements.

---

# 53. Payment UX

Payment screen must be optimized for touch.

Example:

```text
TOTAL

₹1,250

[ CASH ]

[ UPI ]

[ CARD ]

[ OTHER ]
```

For cash:

Show optional quick denominations.

Example:

```text
Exact

₹500

₹1000

₹2000
```

Calculate change automatically.

---

# 54. Offline Indication

Do not frighten cashier when internet is unavailable.

Show a small status indicator:

```text
Online
```

or:

```text
Offline — 12 pending
```

Billing continues normally.

Never show a blocking "No Internet" screen for POS transactions.

---

# 55. Synchronization UI

Provide a small sync status.

Example:

```text
Synced
```

or:

```text
7 Pending
```

Failed permanent sync items may require administrator attention.

Do not expose technical stack traces to cashiers.

---

# 56. PHASE 14 — UI/UX Polish

Only after working functionality is confirmed.

Then work on:

```text
spacing

typography

touch target sizes

navigation

product grid

icons

empty states

loading states

error messages

confirmation interactions

responsive layouts

dark/light considerations

accessibility
```

Primary testing order:

```text
10-inch Android tablet

7–8-inch Android tablet

Android phone

Windows 1366×768

larger desktop
```

---

# 57. UI Performance

A POS interface must feel immediate.

Do not wait for cloud API responses for:

```text
adding product to cart

changing quantity

opening payment

creating an offline sale
```

Normal interaction should use local state/database.

Background synchronization must not freeze the interface.

---

# 58. Error Handling

Use centralized error structures.

Backend should return predictable errors such as:

```json
{
  "code": "PRODUCT_NOT_FOUND",
  "message": "Product not found"
}
```

Do not expose SQL/database errors directly.

Client should map technical errors into useful human messages.

---

# 59. Logging

Backend logs should include useful context:

```text
requestId

tenantId

userId

branchId

terminalId

route

status

duration
```

Never log:

```text
passwords

refresh tokens

full payment secrets
```

---

# 60. Security Requirements

Implement from the beginning:

```text
input validation

parameterized database access

password hashing

RBAC

tenant isolation

JWT verification

refresh token handling

rate limiting

secure HTTP headers

CORS configuration

audit trail
```

Never trust IDs sent by the client without verifying ownership.

---

# 61. Testing Strategy

Tests must be written continuously, not at project end.

Required categories:

```text
unit

service

database/integration

authorization

tenant isolation

financial calculations

inventory calculations

sync idempotency
```

Critical business logic requires tests before moving on.

---

# 62. Critical Regression Tests

The following must eventually be permanently covered:

```text
Tenant A cannot access Tenant B.

Duplicate sync event does not duplicate sale.

Sale decreases inventory exactly once.

Return increases inventory exactly once.

Invalid payment total cannot finalize sale.

Incorrect frontend total is recalculated.

Disabled user cannot login.

Cashier cannot perform unauthorized stock adjustment.

Offline ULIDs do not collide.

Duplicate barcode is handled correctly.

Invoice numbering does not collide between terminals.
```

---

# 63. API Contracts

Shared API/request types should live in:

```text
packages/contracts
```

Do not maintain unrelated duplicate interfaces separately in backend and frontend.

Use schema validation where possible.

API breaking changes must be intentional.

---

# 64. No Premature Features

Do not build the following until the core POS is stable unless specifically requested:

```text
advanced accounting

payroll

CRM

AI features

loyalty program

online store

complex analytics

Kubernetes

microservices

event streaming infrastructure

advanced restaurant KDS

marketplace integrations
```

Keep architecture extensible, but do not implement speculative complexity.

---

# 65. Future Business Modules

The architecture should allow later modules such as:

```text
RETAIL

RESTAURANT

SALON

HOTEL

GROCERY

WHOLESALE
```

Do not implement all immediately.

POS Core remains shared.

Business modules extend the core.

---

# 66. Suggested MVP Boundary

The first commercially usable MVP should contain:

```text
Authentication

Business

Branch

Users/RBAC

Terminal

Product

Category

Customer

Sales

Payments

Invoice

Inventory

Purchase

Supplier

Offline local database

Cloud synchronization

Receipt printing

Basic reports

Business settings

Android tablet client

Responsive mobile support

Windows/PWA support
```

Complete these well before adding specialist business modules.

---

# 67. Development Phase Gates

Codex must not move forward simply because code was written.

Each phase requires:

```text
implementation complete

tests passing

typecheck passing

lint passing

documentation updated

HANDOFF updated

TODO updated

Git commit created

Git pushed
```

Then and only then begin the next phase.

---

# 68. Handling Unexpected Problems

If an architectural problem is discovered:

Do not perform a massive rewrite immediately.

First:

```text
document the issue

identify affected modules

write/update tests

create smallest safe fix

run regression tests
```

Record important architecture decisions under:

```text
docs/decisions/
```

Example:

```text
ADR-001-offline-first.md

ADR-002-stock-ledger.md

ADR-003-sync-idempotency.md
```

---

# 69. Codex Must Never Fake Completion

Do not mark a task complete because files were created.

A task is complete only if relevant code executes successfully.

If something cannot be tested, state explicitly in `HANDOFF.md`:

```text
NOT VERIFIED
```

Include reason.

Never write:

```text
completed
```

when implementation was not actually run or verified.

---

# 70. Test Data / Seed

Create a development seed later containing:

```text
Demo Business

Main Branch

POS-01

Owner

Cashier

10 sample products

3 sample customers
```

Do not mix test seed with production migrations.

---

# 71. Local Development

Provide one-command or simple development startup.

Target:

```text
pnpm dev
```

Where practical.

README must document:

```text
requirements

environment variables

database setup

migration commands

seed command

development startup

test commands
```

---

# 72. Environment Configuration

Create typed environment validation.

Example:

```text
DATABASE_URL

JWT_SECRET

REFRESH_SECRET

PORT

NODE_ENV
```

Application must fail fast during startup if required configuration is missing.

Do not spread `process.env` calls throughout the project.

Use one configuration module.

---

# 73. Database Migration Discipline

Every structural database modification requires a migration.

Never depend on manual SQL changes applied only on the developer machine.

Migrations must be committed.

Do not edit old production-applied migrations casually.

Add new migrations.

---

# 74. Deployment Foundation

Once backend MVP becomes stable:

Prepare deployment configuration for a normal VPS.

Initial production architecture may be:

```text
Internet
   ↓
Reverse Proxy
   ↓
Node API
   ↓
PostgreSQL
```

Use HTTPS.

Application server should remain stateless enough to permit horizontal expansion later.

Do not introduce complex orchestration until needed.

---

# 75. Backups

Production architecture must eventually include automated PostgreSQL backup.

Backup strategy must include:

```text
scheduled backup

retention

off-server copy

restore procedure
```

A backup that has never been restore-tested should not be considered fully verified.

---

# 76. API Versioning

Expose API under a versioned path.

Example:

```text
/api/v1/
```

This makes future client compatibility easier.

---

# 77. Terminal Registration

Each POS installation should receive a permanent:

```text
terminalId
```

Example:

```text
Main Counter

POS-01
```

Store:

```text
terminalId

branchId

device installation ID

last sync

app version

status
```

Do not use Android hardware identifiers as the primary permanent identity.

Generate application-controlled identity.

---

# 78. Future Subscription Architecture

Do not implement payment subscription initially unless requested.

But tenant structure should later allow:

```text
TRIAL

ACTIVE

SUSPENDED

EXPIRED
```

Avoid embedding licensing logic into sales transaction code.

---

# 79. Code Quality Rules for Codex

Codex must:

* use descriptive names
* avoid giant classes
* avoid giant services
* keep functions focused
* extract common business rules
* avoid copy/paste logic
* avoid unnecessary abstractions
* avoid premature generic frameworks
* avoid `any` wherever possible
* validate external input
* keep source files below 200 lines
* add tests when business logic changes
* update handoff continuously

---

# 80. Preferred Function Size

Aim for functions normally below approximately:

```text
40–60 lines
```

Complex workflows should be decomposed by responsibility.

Do not make a file shorter merely by placing an enormous function into another file.

---

# 81. Controller Rule

Controllers should primarily:

```text
receive request

read validated input

call service

return response
```

Do not place substantial business logic in controllers.

---

# 82. Repository Rule

Database queries belong in repository/data-access layers where reasonable.

Avoid direct scattered database queries across controllers.

This makes testing and tenant enforcement easier.

---

# 83. Service Rule

Business rules belong in service/domain layers.

Examples:

```text
finalizeSale()

calculateSaleTotals()

refundSale()

adjustStock()

createProduct()
```

---

# 84. Documentation Rule

Do not generate hundreds of pages of documentation.

Maintain only documentation useful for continuation and maintenance.

The most important files are:

```text
PROJECT_PLAN.md

HANDOFF.md

README.md

TODO.md

docs/decisions/*
```

---

# 85. TODO Discipline

Use categories:

```text
NOW

NEXT

LATER

BLOCKED
```

Example:

```text
NOW
- Complete product repository tests

NEXT
- Product search endpoint

LATER
- Product images

BLOCKED
- None
```

Remove completed tasks instead of allowing TODO to become an endless historical log.

History belongs in Git.

---

# 86. HANDOFF Must Be Updated Frequently

Do not wait until context is nearly exhausted.

Update `HANDOFF.md` whenever:

```text
a feature is completed

a significant decision changes

a blocker is discovered

a migration is created

an important bug is fixed
```

This is critical to continuity.

---

# 87. Recommended Initial Codex Execution Order

Execute strictly in this sequence:

```text
PHASE 0
Repository/tooling foundation

PHASE 1
Tenant/business/branch/terminal

PHASE 2
Authentication/RBAC

PHASE 3
Product master

PHASE 4
Customer master

PHASE 5
Sales/payment engine

PHASE 6
Inventory ledger

PHASE 7
Supplier/purchase

PHASE 8
Offline sync protocol

PHASE 9
Reporting APIs

PHASE 10
Business/settings

PHASE 11
Printer contracts

PHASE 12
Client/local database/data layer

PHASE 13
Functional tablet/mobile POS

PHASE 14
Printer native integrations

PHASE 15
UI/UX refinement

PHASE 16
Windows/PWA refinement

PHASE 17
Deployment/security/performance hardening
```

Do not jump directly from Phase 2 into screen design.

---

# 88. First Codex Session Instruction

When starting the repository for the first time:

1. Read this complete `PROJECT_PLAN.md`.
2. Inspect the repository.
3. Do not implement the complete application.
4. Create/update `HANDOFF.md`.
5. Create/update `TODO.md`.
6. Implement only Phase 0.
7. Keep every manually maintained file under 200 lines.
8. Run all Phase 0 verification commands.
9. Fix failures.
10. Update documentation.
11. Commit Phase 0.
12. Push to the configured Git remote.
13. Only after Phase 0 is verified begin Phase 1.
14. Continue using small commits.
15. Never leave substantial verified work uncommitted.

---

# 89. New Codex Session Instruction

Whenever a new Codex session starts:

Do this before writing code:

```text
git status

git log -5 --oneline
```

Then read:

```text
PROJECT_PLAN.md

HANDOFF.md

TODO.md
```

Then inspect the implementation referenced by `HANDOFF.md`.

Do not restart completed work.

Do not regenerate the project.

Do not change architecture unless a documented technical reason requires it.

Continue from the exact next incomplete subtask.

---

# 90. Context Preservation Rule

If context becomes limited:

STOP starting new work.

Immediately:

```text
finish smallest current safe unit

run relevant tests

update HANDOFF.md

update TODO.md

git status

commit

push
```

The repository must always be capable of explaining the development state to another Codex session.

---

# 91. Final Product Design Principle

The product should feel simple to the customer even though the backend architecture is powerful.

The cashier should not have to understand:

```text
sync

cloud

tenant

terminal ID

database

inventory ledger

API
```

They should experience:

```text
Open POS

Tap product

Tap product

Tap PAY

Tap CASH/UPI

Receipt prints
```

Likewise product creation should normally be:

```text
Enter Product Name

Enter Selling Price

Save
```

All architectural complexity must remain behind this simple interaction.

---

# 92. Definition of Successful Architecture

This architecture is considered successful when the following scenario works:

A shop has:

```text
3 Android tablets

1 owner mobile

1 Windows PC

2 receipt printers
```

Internet goes down.

All three tablets continue creating bills.

Receipts continue printing.

Each terminal creates unique transactions.

Stock changes are recorded locally.

Internet returns.

All pending transactions synchronize automatically.

No duplicate sales are created.

No invoices are lost.

Owner's dashboard receives updated combined sales.

Inventory reconciles correctly.

Another business on the same SaaS platform cannot access any of this shop's information.

That is the fundamental technical objective of this project.
