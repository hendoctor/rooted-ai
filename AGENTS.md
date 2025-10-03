# RootedAI Contributor Guide

Welcome! This repository powers the RootedAI marketing site, client portal, and Supabase edge functions. Follow these guidelines whenever you touch code inside this repo.

## Core Principles
- **TypeScript-first**: All new code should be written in TypeScript/TSX with explicit interfaces for Supabase data, React props, and utility inputs.
- **Security by default**: Preserve the existing guardrails (auth guards, RBAC checks, Supabase RPC hardening, CSRF/rate limiting) and extend them when adding new flows.
- **Performance matters**: Reuse caching utilities (`CacheManager`, React Query) and progressive loading hooks. Avoid unnecessary network calls or rerenders.
- **DX consistency**: Use the existing module alias `@/` for local imports, keep file names in PascalCase for components and camelCase for utilities/hooks, and co-locate domain-specific helpers with their feature area.

## Frontend Patterns
- Prefer functional React components declared with `const ComponentName = () => { ... }` and export them as default unless a module exports multiple symbols.
- Wrap protected routes with the appropriate guard components (`AuthGuard`, `PermissionGuard`, `RBACGuard`, etc.) and keep redirect logic inside hooks like `useAdminRedirect` rather than scattered `useEffect`s.
- Compose UI with shadcn components located under `src/components/ui`. Extend them via `React.forwardRef` and the shared `cn` helper for Tailwind class merging.
- Tailwind CSS is the styling baseline. Use semantic utility classes (e.g., `bg-background`, `text-muted-foreground`) and respect the brand palette documented in `README.md`. Avoid hard-coded hex values unless introducing palette primitives.
- Favor accessible patterns: supply `aria-*` attributes, keyboard handlers, and semantic markup. When adding dialogs, menus, or tooltips, use the provided Radix wrappers and ensure focus trapping works.

## State & Data Fetching
- Fetch Supabase data through existing helpers/RPC functions. If you must write a new query, keep it in `src/integrations/supabase` and handle errors with actionable toasts/logging.
- Cache remote state with React Query or `CacheManager`. Invalidate caches thoughtfully (e.g., on auth changes or mutations) instead of forcing full reloads.
- Use the custom hooks in `src/hooks` for cross-cutting concerns (progressive loading, performance monitoring, visibility refresh). Extend those hooks rather than duplicating logic.

## Supabase Functions & Security
- Edge functions live in `supabase/functions`. Use Deno-compatible TypeScript, hardened CORS, CSRF validation, rate limiting, and structured logging similar to existing functions (`contact-form`, `secure-auth`).
- Never log sensitive secrets. Prefer structured audit log inserts via Supabase when recording security events.
- Keep SQL migrations idempotent and grouped logically. Test them against a staging database before production deploys.

## Utilities & Shared Libraries
- Put generic utilities in `src/lib` or `src/utils`. Document intent with comments, especially for security- or performance-critical helpers.
- Reuse helpers such as `generateSlug` and avoid reimplementing string/date manipulation functions already present.

## Testing & QA
- Run `npm run lint` and `npm run build` before opening a PR. Add unit or integration tests when introducing business logic that can regress.
- For UI changes, provide before/after context (screenshots or Loom) and verify mobile responsiveness.
- Document new endpoints, admin tools, or flows in the appropriate README under the root if they impact operations.

## Documentation & Communication
- Update feature specs (e.g., `NEWSLETTER_FEATURE.md`, `AUTH_SYSTEM_README.md`) when you change the described behavior.
- Keep commit messages and PR descriptions actionable—summarize what changed, why, and any follow-up tasks.

By keeping these best practices in mind, we’ll maintain a secure, polished, and consistent experience across the RootedAI platform.
