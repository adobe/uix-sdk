import { fixture, test, Selector } from 'testcafe';

fixture('Dynamic Extensions via extensionsListCallback')
  .page('http://localhost:3000/#/dynamic');

test('Extension added at runtime via extensionsListCallback appears in extensions[]', async (t) => {
  const countEl = Selector('#extension-count');
  const dynamicExtEl = Selector('[data-extension-id="ext-dynamic"]');

  // Initial state: provider returns 1 extension, callback is pass-through
  await t
    .expect(countEl.innerText)
    .eql('1', 'Should start with one extension', { timeout: 15000 });

  await t
    .expect(dynamicExtEl.exists)
    .notOk('ext-dynamic should not be present before button click');

  // Trigger dynamic addition by changing the callback's identity
  await t.click('#add-extension-button');

  // SDK re-runs effect with new callback → injects ext-dynamic specifically
  await t
    .expect(dynamicExtEl.exists)
    .ok('ext-dynamic extension should appear after button click', { timeout: 15000 });

  await t
    .expect(countEl.innerText)
    .eql('2', 'Total count should be 2', { timeout: 15000 });
});
