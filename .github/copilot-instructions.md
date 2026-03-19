# Copilot Instructions for UIX SDK

Trust these instructions. Only search the codebase if information here is incomplete or appears incorrect.

## What This Repo Is

Adobe UIX (UI Extensibility) SDK — a TypeScript monorepo enabling Experience Cloud host apps to define extensible UI areas and guest apps (extensions) to run in isolated iframes and communicate via RPC over `postMessage`. The only runtime dependency is Penpal (iframe communication).

**Stack:** TypeScript 5.2 · ES2022 target · React 17+ (peer dep for host-react) · Node ≥ 16 LTS · npm workspaces · tsup bundler · Jest 29 · ESLint 9 flat config · Prettier

## Package Structure

Four SDK packages under `packages/`, in dependency order:

| Package | Path | Role |
|---|---|---|
| `@adobe/uix-core` | `packages/uix-core/` | RPC layer, tunneling, shared types — no deps |
| `@adobe/uix-guest` | `packages/uix-guest/` | Extension-side: `register()` / `attach()` |
| `@adobe/uix-host` | `packages/uix-host/` | Host-side: `Host` class, extension registry |
| `@adobe/uix-host-react` | `packages/uix-host-react/` | React bindings: `<Extensible>`, `useExtensions()`, `<GuestUIFrame>` |

Each package entry point is `src/index.ts`. Tests live alongside source as `*.test.ts`.

## Build & Validate — Exact Command Sequence

**Always run `npm install` before any build after cloning or cleaning.**

```bash
# 1. Bootstrap (required once, and after any package.json change)
npm install

# 2. Build all SDK packages (development mode, includes source maps)
npm run build

# 3. Run the full test suite (lint → unit tests → per-package tests, sequential)
npm test

# 4. Run only unit tests (faster, skips lint)
npm run test:unit

# 5. Lint only (ESLint + Prettier check + fixpack, runs in parallel)
npm run lint

# 6. Auto-fix formatting and linting issues before committing
npm run format        # Prettier auto-fix
# ESLint auto-fixes run automatically during lint:eslint via --fix flag

# 7. Build TypeScript declarations
npm run declarations:build
```

`npm test` runs `lint → test:unit → test:subtests` sequentially via `run-s`. All three must pass for CI to succeed. Do not skip lint.

**Production build** (used in CI release): `npm run build:production`

## ESLint Rules to Know

The flat config is in `eslint.base.mjs` (shared) and `eslint.config.mjs` in each package. Rules that commonly cause failures:

- **Import order**: imports must be sorted (eslint-plugin-simple-import-sort). Group: external, then internal with `../` prefix.
- **Object key order**: object literal keys must be alphabetically sorted (sort-keys-fix). Use `// eslint-disable-next-line sort-keys-fix/sort-keys-fix` sparingly.
- **Function length**: max 75 lines per function (200 in test files). Split large functions.
- **Parameter count**: max 4 parameters. Use an options object for more.
- **Statement count**: max 15 statements per function.
- **No default exports** except in config files.
- **No `any`**: use `// eslint-disable-next-line @typescript-eslint/no-explicit-any` when unavoidable.
- **React hooks**: exhaustive-deps is enforced. Use `// eslint-disable-next-line react-hooks/exhaustive-deps` with a comment explaining why when the default is intentionally not followed.
- **No circular imports**: enforced via eslint-plugin-import.

Run `npm run format` then `npm run lint` after editing to catch issues before committing.

## Testing

- **Framework**: Jest 29 with ts-jest, jsdom environment
- **Config**: `jest.config.ts` at root; covers all four packages
- **Test globals** injected automatically: `UIX_SDK_VERSION = "0.0.999"`, `UIX_SDK_BUILDMODE = "test"`
- **Pattern**: test files sit next to source (`src/foo.ts` → `src/foo.test.ts`)
- **uix-core** requires a setup file (`jest.messagechannel.cjs`) — already configured, no action needed
- Per-package test scripts (`npm test` inside a workspace) use `NODE_ENV=test jest`

## Key Configuration Files

| File | Purpose |
|---|---|
| `jest.config.ts` | Root Jest config, 4 projects (one per SDK package) |
| `tsconfig.json` | Root TypeScript project references |
| `tsconfig-base.json` | Shared TS settings (target ES2019, module ES2020) |
| `eslint.base.mjs` | Shared ESLint flat config factory |
| `configs/common-tsupconfig.js` | Shared tsup bundler config (note: minification currently disabled) |
| `scripts/bundler.mjs` | Builds packages in dependency order |
| `scripts/release.mjs` | Versioning + publish (requires `main` branch + clean working dir) |

## CI Checks (GitHub Actions)

PRs run the `e2e-local-dist.yml` workflow, which:
1. Installs dependencies (`npm ci`).
2. Builds the packages (`npm run build`).
3. Runs the end-to-end test suite against the built distribution (see `e2e-local-dist.yml` for the exact command).

There is currently no separate PR workflow that runs `npm run lint` or `npm run test:unit`; run these locally as needed during development.

To approximate CI locally, run the same commands as in `e2e-local-dist.yml` (e.g. `npm ci`, `npm run build`, then the E2E test command defined there).
## Versioning Rules

All four packages are versioned in lockstep. Every `package.json` (root + all packages) must have the same version string. The release script validates this. Do not change versions manually.

## Common Pitfalls

- **`npm test` fails on lint**: run `npm run format` first, then re-check with `npm run lint`.
- **Import errors after adding a file**: ensure the export is added to the package's `src/index.ts`.
- **Type errors with `.js` extensions in imports**: all internal imports use `.js` extensions (TypeScript ESM requirement) — do not change to `.ts`.
- **`host` and `guestOptions` are intentionally omitted** from the `useEffect` dep array in `Extensible.tsx` — do not add them; the effect uses a ref (`prevSharedContext`) to track `sharedContext` changes.
