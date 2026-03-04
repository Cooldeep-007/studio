# Corner — Accounting & Finance App

## Overview
A Next.js 14 full-stack web application for accounting and finance management. Built with Firebase (Firestore + Auth) as the frontend data layer, PostgreSQL for admin analytics, Google Genkit AI integration, and Tailwind CSS + shadcn/ui for the UI.

## Architecture

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Frontend Database / Auth**: Firebase (Firestore + Firebase Auth)
- **Backend Database**: PostgreSQL (via `pg` package) for admin analytics, auth event logging, audit trails
- **AI**: Google Genkit (`@genkit-ai/google-genai`)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **PDF Export**: jsPDF + jsPDF-autotable

## Project Structure

```
src/
  app/
    (app)/        # Protected pages (dashboard, vouchers, ledgers, admin, etc.)
    (auth)/       # Login/signup pages
    api/          # Backend API routes
      auth/events/    # Auth event logging endpoint
      sessions/       # Active session heartbeat endpoint
      audit/          # Audit log endpoint
      admin/          # Admin data endpoints (stats, active-users, auth-events, audit-log, reports)
  components/   # Shared UI components (shadcn/ui + custom)
  firebase/     # Firebase client config, auth helpers, Firestore helpers
  ai/           # Genkit AI flows and configuration
  hooks/        # Custom React hooks (includes use-tracking for session/audit)
  lib/          # Utilities, auth actions, types, DB connection
public/         # Static assets
docs/           # Project documentation
```

## Backend (PostgreSQL)

Four tables power the backend:
- `auth_events` — logs every login, signup, logout, and failed attempt
- `active_sessions` — real-time heartbeat tracking of currently active users
- `audit_log` — tracks all Firestore document changes (create, update, delete, set)
- `parent_groups` — system-defined and user-created parent groups for the Chart of Accounts (17 default groups seeded on first API call, supports hierarchy via parent_group_id self-reference)

### Parent Groups API (`/api/parent-groups`)
- **GET** — returns all active parent groups
- **POST** — create a custom group (requires `group_name` + `primary_nature`)
- **PUT** — update a custom group (system groups protected)
- **DELETE** — soft-delete a custom group (system groups protected)

## Admin Dashboard

Accessible at `/admin` (Owner/Admin roles only). Features:
- Real-time active user count and list
- Authentication event log with filtering
- Audit log of all system changes
- Downloadable reports in CSV (Excel) and PDF format
- Top users and login statistics

## Voucher View (`/vouchers/[id]`)

Enhanced invoice-style view page with:
- **Company & Party sections**: Shows seller/buyer info with GSTIN, address, contact details
- **Items table**: Full line-item breakdown with HSN/SAC, qty, rate, discount, taxable amount, GST breakdown (CGST/SGST/IGST), and totals
- **Summary section**: Subtotal, discount, taxable value, GST components, TCS, adjustment, round off, grand total with amount in words
- **Payment status**: Badges for Paid/Partial/Unpaid with outstanding amount display
- **Instant Payment/Receipt**: Dialog to record payments against invoices — creates linked Payment/Receipt vouchers in Firestore, updates outstanding amount and status, tracks bill allocations
- **Payment history**: Shows all linked payments/receipts with amounts
- **Configure Print/Export**: Dialog (Settings2 icon button) with 10 toggleable sections — Company & Party Info, Invoice Meta, Items Table, Tax Summary, Amount in Words, Outstanding Amount, Narration, Remarks, Accounting Entries, Payment History. Each section is conditionally hidden in print via `print:hidden` CSS class based on user selection. Accounting Entries default off; all others default on.
- Non-invoice vouchers (Journal, Payment, Receipt, Contra) retain the original Dr/Cr entries table view

## Voucher Numbering

Configurable per company/voucher type with Auto or Manual mode:
- **Auto mode**: Sequential numbers like `SLS/2526-0001`, `PUR/2526-0002`, etc. Format: `{PREFIX}/{FY}-{SEQ}`
- **Manual mode**: User enters voucher number manually in an inline input field
- Settings stored in Firestore at `firms/{firmId}/companies/{companyId}/settings/voucherNumbering`
- Settings gear icon in the CardDescription of each voucher form opens a popover to toggle mode
- Hook: `useVoucherNumbering(firmId, companyId, voucherType)` in `src/hooks/use-voucher-numbering.ts`
- Component: `VoucherNumberSettings` in `src/components/voucher-number-settings.tsx`
- Prefixes: SLS (Sales), PUR (Purchase), PAY (Payment), RCT (Receipt), JRN (Journal), CNT (Contra), DBN (Debit Note), CRN (Credit Note), PRF (Proforma), ADS (Adhoc Sale), ADP (Adhoc Purchase)

## Development

- **Dev server**: `npm run dev` → runs on `0.0.0.0:5000`
- **Build**: `npm run build`
- **Start (prod)**: `npm run start`
- **AI dev server**: `npm run genkit:dev`

## Deployment

- **Target**: Autoscale
- **Build command**: `npm run build`
- **Run command**: `npm run start`

## Authentication

Sign-in providers on the login page:
- **Email/Password** — standard email + password authentication
- **Google** — OAuth via popup (GoogleAuthProvider)
- **GitHub** — OAuth via popup (GithubAuthProvider) — requires enabling in Firebase Console
- **Microsoft** — OAuth via popup (OAuthProvider 'microsoft.com') — requires enabling in Firebase Console
- **Phone (OTP)** — SMS verification via Firebase PhoneAuthProvider with invisible reCAPTCHA — requires enabling in Firebase Console

All cross-layout navigation (auth ↔ app route groups) uses `window.location.href` / `window.location.replace` to prevent Next.js "Segment mismatch" errors that cause page flickering.

Session heartbeat tracking uses a module-level singleton interval (60s) to avoid spam during auth state transitions.

## Firebase Configuration

Firebase credentials are stored in `src/firebase/config.ts`. The project uses Firebase production backends (no emulators).

## Replit Configuration

- Dev server runs on port 5000, host 0.0.0.0
- `allowedDevOrigins` set in next.config.js for Replit proxy
- PostgreSQL database connected via DATABASE_URL environment variable
