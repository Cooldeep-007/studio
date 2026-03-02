# Corner — Accounting & Finance App

## Overview
A Next.js 14 full-stack web application for accounting and finance management. Built with Firebase (Firestore + Auth) as the backend, Google Genkit AI integration, and Tailwind CSS + shadcn/ui for the UI.

## Architecture

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database / Auth**: Firebase (Firestore + Firebase Auth)
- **AI**: Google Genkit (`@genkit-ai/google-genai`)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **PDF Export**: jsPDF + jsPDF-autotable

## Project Structure

```
src/
  app/          # Next.js App Router pages (route groups: (app), (auth))
  components/   # Shared UI components (shadcn/ui + custom)
  firebase/     # Firebase client config, auth helpers, Firestore helpers
  ai/           # Genkit AI flows and configuration
  hooks/        # Custom React hooks
public/         # Static assets
docs/           # Project documentation
```

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
- `allowedDevOrigins: ['*']` set in next.config.js to allow Replit proxy
