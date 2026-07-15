import { fixture, test, Selector } from "testcafe";

// Reproduces SITES-42495: a host renders one GuestUIFrame per "row" (e.g. a
// multifield item), keyed by stable per-row identity rather than array
// position - the same pattern @aem-sites/headless-components' Multifield
// uses (a birth-assigned `multiIdx` that a pure position-swap never
// re-keys). A stable key means React relocates the existing iframe DOM node
// on reorder instead of unmounting/remounting it.
//
// If the browser silently reloads a live cross-origin iframe when it's moved
// in the DOM (a documented risk - see @adobe/uix-host's HostConfig.runtimeContainer
// comment), GuestUIFrame's connect effect (deps: [guest.id], which never
// changes here) never re-runs, so the host never re-attaches - the reloaded
// guest's fresh attach() call then times out.
//
// This test asserts the CORRECT behavior - both rows should still be
// connected after the swap - and currently FAILS because of the bug. It
// should start passing once SITES-42495 is fixed; no changes to the test
// should be needed at that point.

const rowASelector = "#iframe-row-a";
const rowBSelector = "#iframe-row-b";

fixture("Multifield reorder - stable-keyed GuestUIFrame across a position swap")
  .page("http://localhost:3000/#/reorder");

async function waitConnected(t, iframeSelector, label) {
  await t.switchToIframe(iframeSelector);
  await t
    .expect(Selector("#attach-status").innerText)
    .eql("connected", `${label} should connect on initial load`, { timeout: 10000 });
  await t.switchToMainWindow();
}

async function readProbe(t, iframeSelector) {
  await t.switchToIframe(iframeSelector);
  const bootId = await Selector("#boot-id").innerText;
  const status = await Selector("#attach-status").innerText;
  const error = await Selector("#attach-error").innerText;
  await t.switchToMainWindow();
  return { bootId, status, error };
}

test("swapping two stable-keyed rows should not break either iframe's connection (SITES-42495)", async (t) => {
  await t.expect(Selector(rowASelector).exists).ok("Row A iframe should exist", { timeout: 15000 });
  await t.expect(Selector(rowBSelector).exists).ok("Row B iframe should exist", { timeout: 15000 });

  await waitConnected(t, rowASelector, "Row A");
  await waitConnected(t, rowBSelector, "Row B");

  const before = {
    a: await readProbe(t, rowASelector),
    b: await readProbe(t, rowBSelector),
  };

  await t.click("#swap-rows-button");

  // Give a silently-reloaded guest time to either reconnect or hit its
  // (short, test-configured) attach() timeout.
  await t.wait(6000);

  const after = {
    a: await readProbe(t, rowASelector),
    b: await readProbe(t, rowBSelector),
  };

  // eslint-disable-next-line no-console
  console.log("[multifield-reorder] probe result:", JSON.stringify({ before, after }, null, 2));

  // The DOM nodes themselves must survive the swap (identified by their
  // stable ids, regardless of which now sits in which visual position).
  await t.expect(Selector(rowASelector).exists).ok("Row A iframe element should still exist after swap");
  await t.expect(Selector(rowBSelector).exists).ok("Row B iframe element should still exist after swap");

  // Precondition check, expected to keep passing either way: at least one
  // row's iframe silently reloaded (new bootId) purely from being moved in
  // the DOM - proving React relocated the live node rather than
  // remounting it, and that the browser discarded its browsing context
  // anyway. This is just context for the real assertions below; a reload
  // happening is not itself the bug.
  const aReloaded = after.a.bootId !== before.a.bootId;
  const bReloaded = after.b.bootId !== before.b.bootId;
  await t
    .expect(aReloaded || bReloaded)
    .ok(
      `Expected at least one row's iframe to silently reload after the swap (this is a browser quirk, not the bug under test). before=${JSON.stringify(before)} after=${JSON.stringify(after)}`
    );

  // The actual bug: a silent reload should not be fatal. The host/SDK
  // should notice the guest reconnecting and re-establish the tunnel, so
  // both rows should read "connected" here. Today they don't - whichever
  // row got moved is left permanently unreachable instead.
  await t
    .expect(after.a.status)
    .eql(
      "connected",
      `Row A should still be connected after the swap. bootId ${before.a.bootId} -> ${after.a.bootId}, error="${after.a.error}"`
    );
  await t
    .expect(after.b.status)
    .eql(
      "connected",
      `Row B should still be connected after the swap. bootId ${before.b.bootId} -> ${after.b.bootId}, error="${after.b.error}"`
    );
});

test("a genuine remount (new key) reconnects cleanly - positive control", async (t) => {
  await t.expect(Selector(rowASelector).exists).ok("Row A iframe should exist", { timeout: 15000 });
  await waitConnected(t, rowASelector, "Row A");

  const before = await readProbe(t, rowASelector);

  await t.click("#remount-row-a-button");
  await t.wait(1000);

  await waitConnected(t, rowASelector, "Row A (after remount)");
  const after = await readProbe(t, rowASelector);

  await t
    .expect(after.bootId)
    .notEql(before.bootId, "A real remount should produce a fresh boot id");
  await t.expect(after.status).eql("connected", "A real remount should reconnect cleanly");
});
