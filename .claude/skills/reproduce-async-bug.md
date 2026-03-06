---
skill: reproduce-async-bug
description: Systematically reproduce async cancellation bugs in React components before implementing fixes
tags: [bug-reproduction, testing, react, async, debugging]
---

# Reproduce Async Bug Skill

Use this skill to systematically reproduce bugs related to async operations in React components, particularly fetch cancellation issues, before implementing fixes.

## When to Use This Skill

- User reports extensions/data not loading
- Suspected race conditions in async operations
- Need to prove a bug exists before fixing it
- Want to ensure fix actually solves the problem
- Component re-renders cause async issues

## Process

### 1. Understand the Bug Report

Ask clarifying questions:
- What triggers the bug?
- Is it reproducible consistently?
- What should happen vs. what actually happens?
- Any console errors or warnings?

### 2. Create Reproduction Tests

Create a test file: `ComponentName.bug-name.test.tsx`

**Test Structure:**
```typescript
describe('ComponentName - Bug Description', () => {
  // Test 1: Demonstrate the core bug
  it('BUG: Description of buggy behavior', async () => {
    // Setup tracking variables
    let fetchCount = 0;
    let aborted = false;

    // Create mock that tracks calls
    const mockProvider = jest.fn(async () => {
      fetchCount++;
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 200));
      return mockData;
    });

    // Render component
    const { rerender, unmount } = render(
      <Component provider={mockProvider} />
    );

    // Trigger bug scenario (rapid changes, unmount, etc.)
    // ...

    // Wait for async operations
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    // Assert buggy behavior
    expect(fetchCount).toBe(expectedValue);
    expect(aborted).toBe(expectedValue);
  });

  // Test 2: Edge case or variant
  // Test 3: Another scenario
});
```

### 3. Write Tests That "Pass" to Prove Bug

**Important:** Tests should PASS when bug exists, FAIL after fix.

Example:
```typescript
// This test PASSES = bug confirmed
expect(fetchCompleted).toBe(true); // Should be false after fix
expect(stateUpdateWarning).toBe(true); // Should be false after fix
```

### 4. Create Visual Demo (Optional)

For browser-specific bugs, create an HTML demo:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Bug Demo</title>
  <script src="https://unpkg.com/react@17/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@17/umd/react-dom.development.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    // Reproduce buggy component behavior
    function BuggyComponent() {
      const [data, setData] = useState(null);

      useEffect(() => {
        // Buggy async operation (no cleanup)
        fetch('/api/data').then(setData);
      }, [dependency]); // No cleanup function!

      return <div>{data}</div>;
    }
  </script>
</body>
</html>
```

### 5. Document Findings

Create a summary document:

```markdown
# Bug Reproduction Results

## Bug Confirmed: [YES/NO]

## Test Results
- Test 1: [Description] - [PASS/FAIL]
- Test 2: [Description] - [PASS/FAIL]

## Root Cause
- Missing cleanup function in useEffect
- No AbortController pattern
- State updates after unmount

## Impact
- Severity: High/Medium/Low
- User experience: [Description]
- Frequency: Always/Sometimes/Rare

## Next Steps
1. Implement fix
2. Update tests to expect correct behavior
3. Verify fix with tests
```

### 6. Run and Verify

```bash
# Run reproduction tests
npm test -- --testPathPattern='bug-name'

# Expected: Tests PASS (proving bug exists)
```

## Common Async Bug Patterns

### Pattern 1: Missing Cleanup in useEffect

**Bug:**
```typescript
useEffect(() => {
  fetchData().then(setData);
}, [deps]);
// ❌ No cleanup function
```

**Test:**
```typescript
it('BUG: Fetch not cancelled on unmount', async () => {
  let completed = false;
  const { unmount } = render(<Component />);
  await waitFor(() => expect(fetchStarted).toBe(true));
  unmount();
  await wait(500);
  expect(completed).toBe(true); // ❌ Bug: should be false
});
```

### Pattern 2: Race Conditions

**Bug:**
```typescript
useEffect(() => {
  fetch1().then(setData); // Both run in parallel!
}, [param]);
// When param changes, new fetch starts but old one continues
```

**Test:**
```typescript
it('BUG: Multiple parallel fetches', async () => {
  const { rerender } = render(<Component param="A" />);
  await wait(50);
  rerender(<Component param="B" />); // Trigger new fetch
  await wait(500);
  expect(fetchCount).toBe(2); // ❌ Bug: both completed
});
```

### Pattern 3: State Updates After Unmount

**Bug:**
```typescript
useEffect(() => {
  async function load() {
    const data = await fetch();
    setData(data); // Might run after unmount!
  }
  load();
}, []);
```

**Test:**
```typescript
it('BUG: State update after unmount', async () => {
  const { unmount } = render(<Component />);
  await wait(50);
  unmount();
  await wait(500);
  // Check for React warning
  expect(consoleWarnings).toContain('unmounted component');
});
```

## Verification Checklist

After creating reproduction:

- [ ] Tests run and PASS (proving bug exists)
- [ ] Console logs show expected buggy behavior
- [ ] Root cause identified and documented
- [ ] Edge cases covered with multiple tests
- [ ] Visual demo created (if needed for browser bugs)
- [ ] Impact and severity documented

## Integration with Fix Process

1. **Reproduce** (this skill) → Proves bug exists
2. **Design** → Plan the fix
3. **Implement** → Write the fix
4. **Update Tests** → Change assertions to expect correct behavior
5. **Verify** → Tests should now FAIL (bug gone) until tests are updated

## Output Deliverables

- `ComponentName.bug-name.test.tsx` - Reproduction tests
- `BUG-REPRODUCTION-RESULTS.md` - Summary document
- `bug-demo.html` (optional) - Visual demo
- Console logs showing buggy behavior

## Tips

- Use realistic timing (200-500ms delays)
- Track all relevant state (call counts, aborted flags, warnings)
- Test both success and failure paths
- Include edge cases (rapid changes, immediate unmount)
- Document expected vs actual behavior clearly
- Keep tests focused (one bug aspect per test)

## Anti-Patterns to Avoid

❌ **Don't** fix the bug while reproducing
❌ **Don't** write tests that expect correct behavior initially
❌ **Don't** skip visual demos for browser-specific bugs
❌ **Don't** assume the bug without proof
❌ **Don't** make reproduction tests too complex

## Example: Full Workflow

```bash
# 1. Create reproduction tests
npm test -- --testPathPattern='fetch-cancellation'
# Result: 3 tests PASS ✅ (bug confirmed)

# 2. Implement fix
# ... code changes ...

# 3. Run tests again
npm test -- --testPathPattern='fetch-cancellation'
# Result: 3 tests PASS ✅ (old buggy expectations)

# 4. Update test expectations
# Change: expect(aborted).toBe(false) → expect(aborted).toBe(true)

# 5. Verify fix
npm test -- --testPathPattern='fetch-cancellation'
# Result: 3 tests PASS ✅ (new correct expectations)
```

## Related Skills

- `async-cleanup-audit` - Find missing cleanup functions
- `abort-controller-retrofit` - Add cancellation support
- `race-condition-test` - Test for race conditions
