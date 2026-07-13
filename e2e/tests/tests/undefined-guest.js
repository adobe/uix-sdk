import { fixture, test, Selector } from 'testcafe';

fixture('Undefined Guest GuestUIFrame')
  .page('http://localhost:3000/#/undefined-guest');

// Regression guard for SITES-35203: when a guest is removed while its
// GuestUIFrame is still mounted (e.g. host.modal.close() tears the guest down),
// the frame must render null instead of throwing and crashing the host subtree.
test('GuestUIFrame renders null instead of crashing the host when its guest is removed', async (t) => {
  const guestId = Selector('#frame-guest-id');
  const iframe = Selector('#iframe-for-guest');
  const crashed = Selector('#host-crashed');
  const alive = Selector('#host-alive');

  // Guest loads and the UI frame mounts.
  await t
    .expect(guestId.innerText)
    .eql('extensionId', 'guest should load', { timeout: 30000 });
  await t
    .expect(iframe.exists)
    .ok('GuestUIFrame should mount for the loaded guest', { timeout: 30000 });

  // Remove the guest while the frame is still mounted with its (now stale) id.
  await t.click('#remove-guest-button');
  await t.expect(Selector('#frame-removed').innerText).eql('true');

  // The host must survive: no crash boundary, sentinel still present, and the
  // frame degrades to null rather than throwing during render.
  await t
    .expect(crashed.exists)
    .notOk('host subtree must not crash when the guest is undefined');
  await t.expect(alive.exists).ok('host UI should stay mounted');
  await t
    .expect(iframe.exists)
    .notOk('GuestUIFrame should render null for a removed guest', {
      timeout: 10000,
    });
});
