# Copilot Instructions for scoutr-vrc

## Project Context

- This is a Tauri + SvelteKit + TypeScript app using Vite.
- Frontend uses Svelte 5 and Tailwind CSS v4.
- The app runs in SPA mode with `@sveltejs/adapter-static` fallback to `index.html`.
- State persistence is handled through `@tauri-apps/plugin-store` and centralized in `src/lib/state/storage.ts`.
- Auth is handled with Supabase in `src/lib/supabase`.
- RobotEvents integration lives under `src/lib/robotevents`.
- The official RobotEvents OpenAPI spec is saved at `src/lib/robotevents/swagger.yml` and should be used as the endpoint source of truth.
- Ui components are from shadcn-svelte, a svelte clone of shadcn-ui. Always add official components with `bun x shadcn-svelte@latest add <component name>` instead of hand-rolling replacements when a matching component exists. Custom components should be placed in `src/lib/components/custom`.

## Primary Tech Rules

- Use TypeScript for all app logic and keep types strict.
- Follow Svelte 5 runes style:
- Use `$state`, `$derived`, and `$props()` patterns.
- Prefer `onclick` style handlers instead of legacy `on:click`.
- Keep existing `$lib` imports and project path conventions.
- Prefer modern ECMAScript syntax and arrow functions where applicable.

## Repository Boundaries

- Do not edit generated or dependency folders unless explicitly requested:
- `.svelte-kit/`
- `node_modules/`
- `src-tauri/target/`
- Keep Tauri Rust changes (`src-tauri/src/*.rs`, `Cargo.toml`, `tauri.conf.json`) scoped and minimal when frontend-only work is requested.

## Frontend Conventions

- Place reusable UI primitives under `src/lib/components/ui`.
- Place app-specific components under `src/lib/components/custom`.
- Keep route-level code in `src/routes` and shared logic in `src/lib`.
- Use existing utility helpers from `src/lib/utils.ts` for class merging and shared types.
- Maintain Tailwind class conventions already present in the codebase.
- Always use theme color tokens defined in `src/routes/layout.css` (`primary`, `muted`, `card`, `border`, etc.).
- Do not introduce hardcoded palette classes (for example `text-cyan-*`, `border-cyan-*`, `bg-black`) when a theme token class exists.

## Data and State Conventions

- Use existing wrappers and modules instead of introducing parallel data access paths.
- For RobotEvents usage, always import `re` from `$lib/robotevents` and do not deep-import from subpaths inside that folder.
- Prefer existing RobotEvents helper utilities (including pagination helpers like `maxPages` and `depaginate`) instead of re-implementing endpoint pagination logic.
- Persist app-level user/team/event settings through the central `storage` store.
- Keep onboarding/auth flow behavior aligned with logic in `src/routes/+layout.svelte` and `src/lib/state`.

## Quality Checks

- After meaningful changes, run:
- `npm run check`

## Change Strategy

- Make focused changes that match existing naming and file organization.
- Avoid broad refactors unless explicitly requested.
- Preserve current behavior first; call out any required behavior change clearly.
