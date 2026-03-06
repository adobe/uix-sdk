---
skill: add-abort-controller
description: Add AbortController pattern to React hooks and async operations for proper cleanup and cancellation
tags: [react, async, cleanup, abort-controller, useEffect]
---

# Add AbortController Pattern Skill

Systematically add AbortController pattern to React components and async operations to enable proper cancellation and cleanup.

## When to Use This Skill

- Fixing async cancellation bugs
- Adding cleanup to useEffect hooks
- Preventing "state update on unmounted component" warnings
- Implementing cancellable fetch operations
- Preventing race conditions in async operations

## The Problem

Without AbortController:
```typescript
useEffect(() => {
  fetch('/api/data')
    .then(setData)
    .catch(console.error);
}, [dependency]);
// ❌ No cleanup
// ❌ Fetch continues after unmount
// ❌ Fetch continues when dependency changes
```

## The Solution Pattern

### 1. Update Type Definitions (if needed)

**Provider/Callback Types:**
```typescript
// Before
export type DataProvider = () => Promise<Data>;

// After (backward compatible)
export type DataProvider = (signal?: AbortSignal) => Promise<Data>;
```

### 2. Add Cleanup to useEffect

**Basic Pattern:**
```typescript
useEffect(() => {
  const abortController = new AbortController();
  let isMounted = true;

  asyncOperation(abortController.signal)
    .then((result) => {
      if (!isMounted) return; // Don't update if unmounted
      setData(result);
    })
    .catch((error) => {
      // Ignore abort errors
      if (!isMounted || abortController.signal.aborted) return;
      console.error('Operation failed', error);
    })
    .finally(() => {
      if (isMounted) setCleanupState(true);
    });

  // Cleanup function
  return () => {
    isMounted = false;
    abortController.abort();
  };
}, [dependency]);
```

### 3. Update Async Functions to Accept Signal

**Fetch Operations:**
```typescript
// Before
async function fetchData() {
  const response = await fetch('/api/data');
  return response.json();
}

// After
async function fetchData(signal?: AbortSignal) {
  const response = await fetch('/api/data', { signal });
  return response.json();
}
```

**Custom Async Operations:**
```typescript
async function processData(signal?: AbortSignal) {
  // Check if aborted before heavy operations
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const step1 = await heavyOperation1();

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const step2 = await heavyOperation2();
  return combine(step1, step2);
}
```

### 4. Propagate Signal Through Provider Chain

**Composition Functions:**
```typescript
// Before
function combineProviders(...providers: Provider[]): Provider {
  return () => Promise.all(providers.map(p => p()));
}

// After
function combineProviders(...providers: Provider[]): Provider {
  return (signal?: AbortSignal) =>
    Promise.all(providers.map(p => p(signal)));
}
```

**Wrapper Functions:**
```typescript
// Before
function withRetry(provider: Provider): Provider {
  return async () => {
    try {
      return await provider();
    } catch (e) {
      return await provider(); // Retry once
    }
  };
}

// After
function withRetry(provider: Provider): Provider {
  return async (signal?: AbortSignal) => {
    try {
      return await provider(signal);
    } catch (e) {
      if (signal?.aborted) throw e; // Don't retry if aborted
      return await provider(signal); // Retry once
    }
  };
}
```

## Implementation Checklist

### Phase 1: Type Updates
- [ ] Update provider/callback type definitions
- [ ] Add optional `signal?: AbortSignal` parameter
- [ ] Ensure backward compatibility (signal is optional)
- [ ] Update JSDoc comments

### Phase 2: Core Implementation
- [ ] Add `AbortController` to useEffect
- [ ] Add `isMounted` flag
- [ ] Pass signal to async operations
- [ ] Add abort error handling
- [ ] Add cleanup function (return statement)

### Phase 3: Provider Updates
- [ ] Update fetch calls to accept signal
- [ ] Update composition functions
- [ ] Update wrapper functions
- [ ] Update all provider implementations

### Phase 4: Testing
- [ ] Run existing tests (should all pass)
- [ ] Update bug reproduction tests
- [ ] Verify cancellation works
- [ ] Check for console warnings
- [ ] Test edge cases

## Common Patterns

### Pattern 1: Simple Fetch

```typescript
useEffect(() => {
  const controller = new AbortController();
  let mounted = true;

  fetch('/api/data', { signal: controller.signal })
    .then(r => r.json())
    .then(data => mounted && setData(data))
    .catch(err => {
      if (controller.signal.aborted) return;
      console.error(err);
    });

  return () => {
    mounted = false;
    controller.abort();
  };
}, []);
```

### Pattern 2: Provider Pattern

```typescript
useEffect(() => {
  const controller = new AbortController();
  let mounted = true;

  provider(controller.signal)
    .then(result => {
      if (!mounted) return;
      setState(result);
    })
    .catch(err => {
      if (!mounted || controller.signal.aborted) return;
      handleError(err);
    })
    .finally(() => {
      if (mounted) setLoaded(true);
    });

  return () => {
    mounted = false;
    controller.abort();
  };
}, [provider]);
```

### Pattern 3: Multiple Parallel Operations

```typescript
useEffect(() => {
  const controller = new AbortController();
  let mounted = true;

  Promise.all([
    fetch1(controller.signal),
    fetch2(controller.signal),
    fetch3(controller.signal),
  ])
    .then(([r1, r2, r3]) => {
      if (!mounted) return;
      combineResults(r1, r2, r3);
    })
    .catch(err => {
      if (!mounted || controller.signal.aborted) return;
      handleError(err);
    });

  return () => {
    mounted = false;
    controller.abort(); // Aborts all 3 fetches
  };
}, []);
```

### Pattern 4: Sequential Operations

```typescript
useEffect(() => {
  const controller = new AbortController();
  let mounted = true;

  async function load() {
    try {
      const step1 = await operation1(controller.signal);
      if (!mounted) return;

      const step2 = await operation2(step1, controller.signal);
      if (!mounted) return;

      setResult(step2);
    } catch (err) {
      if (!mounted || controller.signal.aborted) return;
      handleError(err);
    }
  }

  load();

  return () => {
    mounted = false;
    controller.abort();
  };
}, []);
```

## Error Handling

### Abort Errors

```typescript
.catch((error) => {
  // Don't log abort errors
  if (error.name === 'AbortError') return;
  if (controller.signal.aborted) return;
  if (!mounted) return;

  console.error('Real error:', error);
});
```

### Network Errors vs Abort

```typescript
.catch((error) => {
  if (!mounted || controller.signal.aborted) {
    // Component unmounted or operation cancelled
    return;
  }

  if (error.name === 'TypeError') {
    // Network error
    setNetworkError(true);
  } else {
    // Other error
    setError(error);
  }
});
```

## Testing the Fix

### 1. Verify Unmount Cancellation

```typescript
it('cancels fetch on unmount', async () => {
  let aborted = false;
  const provider = jest.fn(async (signal) => {
    signal.addEventListener('abort', () => { aborted = true; });
    await new Promise(resolve => setTimeout(resolve, 500));
    return data;
  });

  const { unmount } = render(<Component provider={provider} />);
  await wait(50);
  unmount();
  await wait(600);

  expect(aborted).toBe(true); // ✅ Should be cancelled
});
```

### 2. Verify Dependency Change Cancellation

```typescript
it('cancels previous fetch when dependency changes', async () => {
  let call1Aborted = false;
  let call2Aborted = false;

  const provider = jest.fn((signal) => {
    const callNum = provider.mock.calls.length;
    signal.addEventListener('abort', () => {
      if (callNum === 1) call1Aborted = true;
      if (callNum === 2) call2Aborted = true;
    });
    return new Promise(resolve => setTimeout(() => resolve(data), 500));
  });

  const { rerender } = render(<Component dep="A" provider={provider} />);
  await wait(50);
  rerender(<Component dep="B" provider={provider} />); // Trigger cancellation
  await wait(600);

  expect(call1Aborted).toBe(true); // ✅ First call cancelled
  expect(call2Aborted).toBe(false); // ✅ Second call completed
});
```

### 3. Verify No State Update Warnings

```typescript
it('no state updates after unmount', async () => {
  const warnings = [];
  const originalError = console.error;
  console.error = jest.fn((...args) => {
    warnings.push(args.join(' '));
  });

  const { unmount } = render(<Component />);
  await wait(50);
  unmount();
  await wait(600);

  expect(warnings).not.toContain(
    expect.stringContaining('unmounted component')
  );

  console.error = originalError;
});
```

## Backward Compatibility

Ensure existing code works without changes:

```typescript
// Old provider (no signal) should still work
const oldProvider: Provider = async () => {
  return await fetch('/api/data').then(r => r.json());
};

// ✅ Still works because signal is optional
<Component provider={oldProvider} />
```

## Common Mistakes to Avoid

❌ **Forgetting isMounted flag:**
```typescript
// Bad - state updates might happen after unmount
useEffect(() => {
  const controller = new AbortController();
  provider(controller.signal).then(setData);
  return () => controller.abort();
}, []);
```

❌ **Not checking abort before logging:**
```typescript
// Bad - logs abort as error
.catch((error) => {
  console.error(error); // Logs abort errors!
});
```

❌ **Using abort() before returning:**
```typescript
// Bad - aborts immediately!
useEffect(() => {
  const controller = new AbortController();
  provider(controller.signal).then(setData);
  controller.abort(); // ❌ Wrong!
  return () => {};
}, []);
```

## Migration Strategy

### 1. Start with Type Definitions
Update provider types first (backward compatible).

### 2. Update Core Components
Fix the most critical useEffect hooks first.

### 3. Update Providers Gradually
Providers that don't use signal still work (just no cancellation).

### 4. Update Tests
Update expectations in bug reproduction tests.

### 5. Verify
- All tests pass
- No console warnings
- Network tab shows cancellations

## Success Criteria

After implementation:
- ✅ No "state update on unmounted component" warnings
- ✅ Network tab shows "(canceled)" for aborted requests
- ✅ All existing tests still pass
- ✅ Build succeeds with no TypeScript errors
- ✅ Backward compatible (old code works unchanged)

## Related Skills

- `reproduce-async-bug` - First reproduce the bug
- `async-cleanup-audit` - Find all missing cleanups
- `race-condition-test` - Test for race conditions
