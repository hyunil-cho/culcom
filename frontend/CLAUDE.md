# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Next.js on port 3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint via next lint
```

No test framework is configured.

## Architecture

**Next.js 14 App Router** backoffice application (Korean UI) for "Culcom" — a facility/complex management system.

### API Layer

- `src/lib/api.ts` — Single API client module containing the fetch wrapper, all API functions (`authApi`, `branchApi`, `customerApi`, `classApi`, `memberApi`, `staffApi`), and all TypeScript type definitions.
- API calls go to `/api/*` which Next.js rewrites to `http://localhost:8081/api/*` (configured in `next.config.js`).
- Session-based auth with cookies (`credentials: 'include'`). 401 responses auto-redirect to `/login`.

### Routing

```
src/app/
├── (main)/(auth)/login/   # Login page (no AppLayout)
├── (main)/dashboard/      # Dashboard
├── (main)/customers/      # Customer management
├── (main)/branches/       # Branch management
├── complex/               # Facility management (classes, members, staffs, attendance, memberships, timeslots, postponements, refunds, survey)
```

- Route groups `(main)` and `(auth)` are used for layout organization.
- Root `/` redirects to `/dashboard`.
- Pages are client components (`'use client'`) that fetch data in `useEffect` and manage local state with `useState`.

### Layout

- `AppLayout` wraps authenticated pages (Sidebar + Header + content).
- `Header` includes branch selector and session check.
- `Sidebar` provides navigation links.

### Styling

Plain CSS with global CSS variables in `globals.css` (colors, buttons, badges, cards). Components primarily use inline `style={{}}` objects. No Tailwind or CSS-in-JS.

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).