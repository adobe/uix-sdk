# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- AbortController pattern for extension fetch cancellation
- Optional `signal?: AbortSignal` parameter to `ExtensionsProvider` type
- Cleanup function in `Extensible` component's useEffect for proper cancellation
- `isMounted` flag to prevent state updates after component unmount

### Fixed
- **[CRITICAL]** Extension fetch operations not being cancelled when:
  - Component unmounts
  - Dependencies change (e.g., `extensionsListCallback` changes)
  - Multiple rapid re-renders occur
- "State update on unmounted component" React warnings
- Race conditions causing wrong extensions to load
- Multiple parallel fetch requests wasting bandwidth
- Extensions failing to load when browser cancels requests

### Changed
- `ExtensionsProvider` type signature: `() => Promise<InstalledExtensions>` → `(signal?: AbortSignal) => Promise<InstalledExtensions>`
- All provider implementations updated to forward `AbortSignal`:
  - `combineExtensionsFromProviders`
  - `createExtensionRegistryProvider`
  - `createExtensionRegistryAsObjectsProvider`
  - `mutedProvider`
  - `createExtensionManagerExtensionsProvider`
  - `fetchExtensionsFromExtensionManager`
  - `fetchExtensionsFromRegistry`

### Technical Details

**Files Modified:**
- `packages/uix-host/src/host.ts` - Updated `ExtensionsProvider` type
- `packages/uix-host-react/src/components/Extensible.tsx` - Added cleanup function
- `packages/uix-host/src/extensions-provider/composition.ts` - Forward signal
- `packages/uix-host/src/extensions-provider/extension-registry.ts` - Forward signal
- `packages/uix-host/src/extensions-provider/mute.ts` - Forward signal
- `packages/uix-host-react/src/components/ExtensibleWrapper/ExtensionManagerProvider.ts` - Forward signal

**Backward Compatibility:**
- ✅ 100% backward compatible
- ✅ `signal` parameter is optional
- ✅ Existing providers work without modification
- ✅ All existing tests pass (22/22)

**Migration:**
No migration needed for existing code. To benefit from cancellation:

```typescript
// Optional: Update custom providers to support cancellation
const myProvider: ExtensionsProvider = async (signal?: AbortSignal) => {
  const response = await fetch('/api/extensions', { signal });
  return response.json();
};
```

## [1.1.6] - 2024-XX-XX

_(Previous releases documented here)_
