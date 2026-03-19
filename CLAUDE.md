# Cashflow Pennylane — Project Instructions

## Stack
- React 18+ / Vite 5+ / TypeScript 5+ (strict)
- Supabase (PostgreSQL + Auth + RLS + Edge Functions)
- Vercel (hosting, CDG1 region)
- Tailwind CSS 3+ / Recharts / Zustand / React Router v6
- date-fns for dates, Zod for validation, Lucide React for icons

## Conventions
- Files: kebab-case (e.g., `cashflow-calculator.ts`)
- Components: PascalCase (e.g., `CashflowChart.tsx`)
- Functions/variables: camelCase
- Build order: shared → engine → server → web

## Commands
- `pnpm dev` — Start all packages in dev mode
- `pnpm build` — Build all packages
- `pnpm test` — Run all tests (vitest)
- `pnpm lint` — Lint all packages
- `pnpm typecheck` — TypeScript check

## Rules
- NO `any` TypeScript — use `unknown` + type guards
- NO `console.log` in production — use structured logger
- NO secrets in code — all secrets via env vars
- Pennylane: always check token expiry before API calls, retry with exponential backoff
- GDPR: see SECURITY.md for full compliance requirements
- RLS enabled on ALL Supabase tables — no exceptions
- All user-facing text in French
- Comments use REQUIREMENT:, SECURITY:, PERF: prefixes for intent
