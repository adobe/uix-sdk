import { fixture, test, Selector } from 'testcafe';

fixture('extensionsListCallback — initial load')
  .page('http://localhost:3000/#/callback-add');

// Provider returns only ext-1. Callback adds ext-2.
// Count must be 2; if callback is ignored it would be 1.
test('extensionsListCallback adds an extension on initial load', async (t) => {
  const countEl = Selector('#extension-count');

  await t
    .expect(countEl.innerText)
    .eql('2', 'Provider gave 1 extension; callback should add 1 more', { timeout: 30000 });

  await t.expect(Selector('[data-extension-id="ext-1"]').exists).ok({ timeout: 5000 });
  await t.expect(Selector('[data-extension-id="ext-2"]').exists).ok({ timeout: 5000 });
});
