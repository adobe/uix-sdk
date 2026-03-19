# Copilot Instructions for UIX SDK

Treat these instructions as your primary guide, but verify tooling and CI details against `package.json` and relevant workflow files when making or describing changes that depend on them. Search the codebase whenever information here seems incomplete, inconsistent, or out of date.

## What This Repo Is

Adobe UIX (UI Extensibility) SDK — a TypeScript monorepo enabling Experience Cloud host apps to define extensible UI areas and guest apps (extensions) to run in isolated iframes and communicate via RPC over `postMessage`.

**Stack:** TypeScript 5.2 · ES2022 target · React 17+ (used by `@adobe/uix-host-react`; React is not declared as a peerDependency there) · Node ≥ 16 LTS · npm workspaces · tsup bundler · Jest 29 · ESLint 8 with root `.eslintrc.cjs` · Prettier

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

# 5. Lint only (Prettier check + fixpack, runs in parallel; no ESLint)
npm run lint

# 6. Auto-fix formatting issues (Prettier-only) before committing
npm run format        # Prettier auto-fix

# 7. Build TypeScript declarations
npm run declarations:build
```

`npm test` runs `lint → test:unit → test:subtests` sequentially via `run-s`. The `lint` step only runs the Prettier check and fixpack; it does not run ESLint. All three must pass for CI to succeed. Do not skip lint.

**Production build** (used in CI release): `npm run build:production`

## ESLint

ESLint is configured via `.eslintrc.cjs` at the root (ESLint v8). It extends `eslint:recommended`, `plugin:@typescript-eslint/recommended`, and `plugin:@typescript-eslint/recommended-requiring-type-checking`. Two unsafe-assignment/unsafe-return rules are turned off; all other recommended TypeScript rules apply.

Note: `npm run lint` does **not** invoke ESLint — it only runs Prettier check and fixpack. To run ESLint manually: `npx eslint .`

Run `npm run format` then `npm run lint` after editing to catch formatting issues before committing.

## Testing

- **Framework**: Jest 29 with ts-jest, jsdom environment
- **Config**: `jest.config.ts` at root; defines 3 projects: `uix-core`, `uix-host`, `uix-host-react` (uix-guest is **not** included as a Jest project)
- **Test globals** injected automatically: `UIX_SDK_VERSION = "0.0.999"`, `UIX_SDK_BUILDMODE = "test"`
- **Pattern**: test files sit next to source (`src/foo.ts` → `src/foo.test.ts`)
- **uix-core** requires a setup file (`jest.messagechannel.cjs`) — already configured, no action needed
- Per-package test scripts exist only in `uix-host` and `uix-host-react`; run with `NODE_ENV=test jest`

## Key Configuration Files

| File | Purpose |
|---|---|
| `jest.config.ts` | Root Jest config, 3 projects (uix-core, uix-host, uix-host-react) |
| `tsconfig.json` | Root TypeScript project references |
| `tsconfig-base.json` | Shared TS settings (target ES2019, module ES2020) |
| `.eslintrc.cjs` | Root ESLint configuration |
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
