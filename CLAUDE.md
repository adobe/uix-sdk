# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Adobe UIX (UI Extensibility) SDK monorepo for Experience Cloud Apps. It enables:
- **Host applications** to define extensible areas in their UI
- **Guest applications** (extensions) to run in isolated contexts (iframes) and interact with hosts via RPC

The SDK abstracts iframe communication into a clean async API, using message passing underneath.

## Architecture

### Package Structure

The monorepo contains four SDK packages in `packages/`:

1. **@adobe/uix-core**: Internal utilities shared by all packages
   - RPC layer (`rpc/`): call-sender, call-receiver for bidirectional method calls
   - Tunneling (`tunnel/`): message passing infrastructure between host/guest
   - Event emitters, promise wrappers, cross-realm object handling
   - Type definitions used across the SDK

2. **@adobe/uix-guest**: Extension-side library
   - `GuestServer`: Background frame that registers extension capabilities
   - `GuestUI`: UI frames for rendering extension content
   - Entry points: `register()` for GuestServer, `attach()` for GuestUI
   - Extensions must have exactly one GuestServer; may have multiple GuestUI frames

3. **@adobe/uix-host**: Host-side library (framework-agnostic)
   - `Host` class: manages extension loading, connection, lifecycle
   - Extension registry integration (fetches available extensions)
   - Port abstraction for host-guest communication
   - DOM utilities for iframe management

4. **@adobe/uix-host-react**: React bindings for uix-host
   - `<Extensible>` provider component
   - `useExtensions()` hook for accessing extensions in React components
   - `<ExtensibleComponentBoundary>` for scoping extensions to subtrees
   - `<GuestUIFrame>` for rendering extension UI

### Key Concepts

- **Host-Guest Architecture**: Hosts provide extension points; guests implement them via method registration
- **RPC Communication**: Bidirectional async method calls abstracted from underlying postMessage
- **Shared Context**: Hosts can provide context (auth, theme, locale) that all guests can access
- **Extension Points**: Named interfaces that guests implement (e.g., "cf-editor", "aem")
- **Namespaced APIs**: All guest methods must be organized in namespaces (e.g., `methods.myNamespace.myMethod()`)

## Development Commands

All commands run from repository root:

### Building
```bash
npm run build              # Development build with source maps
npm run build:production   # Production build with minification
npm run clean             # Remove all build artifacts and node_modules
```

### Development Server
```bash
npm run dev               # Start development server with hot reload
                          # - Incremental SDK compilation
                          # - Live example servers
                          # - Mock registry for host-guest connections

npm run demo              # Production build + demo server
```

### Testing
```bash
npm test                  # Run all tests (lint + unit tests in all packages)
npm run test:unit         # Run Jest unit tests only
npm run test:unit:watch   # Watch mode for unit tests
npm run lint              # Check formatting and linting
npm run format            # Auto-fix formatting issues
```

Individual packages support `npm run test` and `npm run test:watch` (run with `-w packages/<name>`).

### Testing with Local Changes
```bash
# Link local SDK to another project (uses yalc, not npm link)
node scripts/publish-local-to.mjs ../path/to/other-project

# Must re-run after each rebuild (doesn't auto-update)
# Use --dry-run to preview commands
```

### TypeScript
```bash
npm run declarations:build  # Build TypeScript declarations
npm run declarations:watch  # Watch mode for declarations
```

### Documentation
```bash
npm run docs              # Generate API documentation
npm run docs:watch        # Watch mode for docs
npm run report:api        # Generate API report without markdown
```

## Testing Strategy

- **Unit tests**: Jest with ts-jest, located alongside source files (`.test.ts`)
- **Test environment**: jsdom (simulates browser environment)
- **Configuration**: `jest.config.ts` in root defines projects for core, host, host-react
- **Running specific tests**: Use `npm test` within a package workspace or `-w` flag from root

Example test file locations:
- `packages/uix-core/src/rpc/call-sender.test.ts`
- `packages/uix-host/src/extensions-provider/extension-registry.test.ts`
- `packages/uix-host-react/src/components/ExtensibleWrapper/ExtensionManagerProvider.test.ts`

E2E tests are in `e2e/` directories and run via GitHub Actions workflows.

## Release Process

**Important**: Must be on VPN for Git push and NPM publish to work.

```bash
# Standard release (updates versions, commits, tags, pushes, publishes)
node scripts/release.mjs <major|minor|patch|prerelease>

# Options:
#   --no-version   Skip version bump
#   --no-git       Skip Git commit/tag/push
#   --no-publish   Skip NPM publish
#   --registry=<url>  Override default NPM registry
#   --dry-run      Preview commands without executing
```

Release script validates:
- On `main` branch with clean working directory
- All packages have matching version strings
- Updates versions across all packages and interdependencies

Nightly builds are published automatically to NPM under the `nightly` tag.

## Code Conventions

### TypeScript
- Target: ES2022
- Project references configured for all packages in root `tsconfig.json`
- Each package has its own `tsconfig.json` extending `tsconfig-base.json`

### Build Tools
- **SDK packages**: Built with `tsup` (faster esbuild-based bundler)
- **Examples**: Use Vite or Parcel depending on the example
- **Output**: Both ESM and CJS formats (`npm run build:esm`)

### Exports
- All exports use `.js` extensions in import paths (TypeScript requirement for ESM)
- Package entry points defined in `package.json`: `main`, `types`, `browser` fields

### File Naming
- Source files: `kebab-case.ts`
- React components: `PascalCase.tsx` or `PascalCase.ts` for logic-only components
- Test files: `*.test.ts` alongside source

## Important Patterns

### Adding New SDK Features
1. Add core functionality to appropriate package (uix-core, uix-host, uix-guest)
2. If React-specific, add to uix-host-react
3. Update TypeScript types (exported from each package's `index.ts`)
4. Add unit tests alongside implementation
5. Update examples if demonstrating new capability

### Interdependencies
- uix-core has no dependencies (except Penpal)
- uix-host depends on uix-core
- uix-host-react depends on uix-host (and React as peer dependency)
- uix-guest depends on uix-core

### Extension Loading Flow
1. Host creates `Host` instance with extension list provider
2. Host listens for `loadallguests` event
3. Host queries loaded guests with `getLoadedGuests({ namespace: ['method'] })`
4. GuestServer registers methods via `register({ methods: {...} })`
5. Host calls guest methods via `guest.apis.namespace.method()`

### Debugging
- Development builds include extra logging (set `debug: true` in host/guest config)
- Use `UIX_SDK_BUILDMODE` global to check build mode
- Debug flags in `debug-host.ts` and `debug-guest.ts`

## Examples Directory

Located in `examples/`, each demonstrates different use cases:
- `host-vite-react-*`: React host applications
- `guest-vite-react-*`: React guest extensions
- `guest-parcel-*`, `guest-vite-*`: Various build tool examples
- Each example has its own `package.json` and can run independently
- Examples serve as both documentation and acceptance tests

Run all examples together: `npm run dev` (starts multi-server)

## Scripts Directory

Custom scripts in `scripts/*.mjs`:
- `bundler.mjs`: Builds packages in dependency order
- `multi-server.mjs`: Runs dev/demo servers for examples + mock registry
- `publish-local-to.mjs`: Exports local builds to other projects via yalc
- `release.mjs`: Automated versioning, Git tagging, NPM publishing
- `mock-registry.mjs`: Local extension registry for development

## Dependencies

- **Runtime**: Penpal (iframe communication) is the only SDK dependency
- **Development**: TypeScript, Jest, tsup, Parcel, Vite, React (for examples)
- **Tooling**: Prettier, ESLint, Husky (Git hooks), fixpack (package.json formatting)

## Notes

- The SDK targets modern browsers (last 2 versions); doesn't support Internet Explorer
- Uses native browser features: EventTarget, fetch, Proxy, Reflect, WeakMap
- For older browser support, consumers must transpile the SDK
- All packages are marked `sideEffects: false` for optimal tree-shaking
