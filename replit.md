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

Three tables power the admin analytics:
- `auth_events` — logs every login, signup, logout, and failed attempt
- `active_sessions` — real-time heartbeat tracking of currently active users
- `audit_log` — tracks all Firestore document changes (create, update, delete, set)

## Admin Dashboard

Accessible at `/admin` (Owner/Admin roles only). Features:
- Real-time active user count and list
- Authentication event log with filtering
- Audit log of all system changes
- Downloadable reports in CSV (Excel) and PDF format
- Top users and login statistics

## Development

- **Dev server**: `npm run dev` → runs on `0.0.0.0:5000`
- **Build**: `npm run build`
- **Start (prod)**: `npm run start`
- **AI dev server**: `npm run genkit:dev`

## Deployment

- **Target**: Autoscale
- **Build command**: `npm run build`
- **Run command**: `npm run start`

## Firebase Configuration

Firebase credentials are stored in `src/firebase/config.ts`. The project uses Firebase production backends (no emulators).

## Replit Configuration

- Dev server runs on port 5000, host 0.0.0.0
- `allowedDevOrigins` set in next.config.js for Replit proxy
- PostgreSQL database connected via DATABASE_URL environment variable
