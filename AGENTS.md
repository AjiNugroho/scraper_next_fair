<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Overview

Next.js 16.2.9 project using the App Router. Two purposes:
- Dashboard for managing and monitoring scraper workers
- API gateway for those workers

**Package manager: Bun** — always use `bun` / `bunx`, never `npm` / `npx`.

## Stack

| Layer | Tool | Notes |
|---|---|---|
| Framework | Next.js 16.2.9, App Router | RSC-first |
| Language | TypeScript 5 | strict |
| Database | PostgreSQL via `pg` Pool | connection pool, max 10 |
| ORM | Drizzle ORM v0.45.2 | `node-postgres` driver |
| Auth | Better Auth v1.6.18 | email/password + `admin` + `apiKey` plugins |
| UI | shadcn/ui | style: `radix-nova`, base: `mist` |
| Styling | Tailwind CSS v4 | CSS variables, no config file |
| Icons | lucide-react | |
| Data fetching | TanStack Query v5 | with devtools in dev |
| Toasts | sonner | via `<Toaster position="top-center">` |
| Themes | next-themes | attribute: `class`, default: system |

## Directory Structure

```
app/
  (auth)/login/        # public auth pages
  (dashboard)/         # protected dashboard pages
  api/auth/            # Better Auth handler (GET + POST)
  layout.tsx           # root layout — ThemeProvider > TanstackProvider > Toaster
  TanstackProvider.tsx # client-side QueryClient wrapper
lib/
  auth.ts              # server auth config (betterAuth instance)
  auth-client.ts       # client auth config (createAuthClient)
  utils.ts             # cn() helper
db/
  drizzle.ts           # db instance (Pool + drizzle)
  auth-schema.ts       # all Drizzle table definitions + schema export
  migrations/          # generated SQL migrations
  seed.ts              # seed script
proxy.ts               # Next.js middleware (auth guard via getSessionCookie)
drizzle.config.ts      # points to db/auth-schema.ts, out: db/migrations
```

## Auth Setup

- **Server** (`lib/auth.ts`): `betterAuth` with `drizzleAdapter(db, { provider: "pg" })`, plugins: `admin()`, `apiKey()` (rate-limited: 100 req/min)
- **Client** (`lib/auth-client.ts`): `createAuthClient` with `adminClient()`, `apiKeyClient()`
- **API route** (`app/api/auth/[...all]/route.ts`): `toNextJsHandler(auth.handler)`
- **Middleware** (`proxy.ts`): redirects to `/login` if no session cookie; excludes `api/auth`, `api/client`, `api/health`, and static assets

## Database Schema (`db/auth-schema.ts`)

Tables: `user`, `session`, `account`, `verification`, `apikey`
- `user`: id, name, email, role, banned, banReason, banExpires
- `session`: with `impersonatedBy` (admin plugin)
- `apikey`: rate limiting fields, permissions, metadata, referenceId

## DB Scripts

```bash
bun db:generate   # bunx drizzle-kit generate
bun db:migrate    # bunx drizzle-kit migrate
bun db:seed       # bun db/seed.ts
```

## Component & Page Conventions

### Server vs Client split
- `page.tsx` is **always a Server Component** — no `"use client"`, no hooks, no auth-client calls
- Client components for a specific page live under that page's own `/components/` subdirectory
  ```
  app/(dashboard)/workers/
    page.tsx              ← server component
    components/
      WorkerTable.tsx     ← client component ("use client")
      WorkerForm.tsx      ← client component
    datahooks/
      useWorkers.ts       ← TanStack Query hooks
  ```
- `components/` at the project root is for **shared components** — primarily shadcn/ui primitives and layout pieces used across multiple pages

### Auth in client components
- Always import from `lib/auth-client.ts` (`authClient`) — never call Better Auth server APIs from client code
- Server components and Route Handlers use `lib/auth.ts` (`auth`)

### Data fetching
- All data fetching in client components must use **TanStack Query hooks**
- Hooks live in a `datahooks/` directory co-located with the page they serve
  ```
  app/(dashboard)/workers/datahooks/useWorkers.ts
  app/(dashboard)/scrapers/datahooks/useScrapers.ts
  ```
- Do not fetch data directly inside components — extract into a hook in `datahooks/`

### Forms (create / edit)
- Always built with **shadcn Form + Field** components, **react-hook-form**, and **Zod** for schema validation
- Structure: define Zod schema → infer type → `useForm` with `zodResolver` → `<Form>`, `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>`, `<FormMessage>`

### Tables
- Always built with **shadcn Table** + **TanStack Table** (`@tanstack/react-table`)
- Define columns with `ColumnDef`, use `useReactTable` with `getCoreRowModel`, render with shadcn `<Table>` primitives

### Delete confirmation
- Every delete action **must** warn the user that deletion cannot be undone
- The user must type the **exact item name** into an input field to confirm before the delete button becomes enabled
- Use a modal/dialog for this — never a plain browser `confirm()`

## Styling Rules

- **Only use Tailwind semantic color tokens** — `primary`, `secondary`, `muted`, `accent`, `destructive`, `background`, `foreground`, `card`, `border`, `ring`, `input`, etc.
- **Never hardcode colors** — no hex values (`#fff`), no `rgb()`/`rgba()`, no `oklch()` literals in className or style props. Use Tailwind opacity modifiers instead (e.g. `bg-primary/10`, `text-foreground/50`).
- This applies everywhere: components, pages, SVGs inline styles — no exceptions.

### Dashboard page wrapper
Every `page.tsx` under `app/(dashboard)/` must wrap its content in a shadcn `<Card>` with:
```tsx
<Card className="bg-background border-none shadow-none ring-0">
  ...
</Card>
```

## shadcn/ui

- Style: `radix-nova`, base color: `mist`, CSS variables enabled
- Components go in `components/ui/`
- Aliases: `@/components`, `@/components/ui`, `@/lib`, `@/hooks`
- Add components with: `bunx shadcn add <component>`

## Environment Variables

Required in `.env`:
- `DATABASE_URL`
- `BETTER_AUTH_URL`
- `TRUSTED_ORIGINS`
