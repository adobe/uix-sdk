import { fixture, test, Selector } from "testcafe";

// Reproduces SITES-48958: a guest's Tunnel.toParent resends its handshake
// offer (same key) every 100ms until its own tunnel reports connected. If
// the host's "accepted" reply takes long enough to process that a second,
// redundant offer arrives after the host already connected - plausible
// when many GuestUIFrame instances of the same extension initialize
// concurrently on one CF Editor page, all competing for main-thread time -
// Tunnel.toIframe's offerListener (which stopped checking !tunnel.isConnected
// as part of the SITES-42495 fix) reprocesses it: opens a second
// MessageChannel and calls tunnel.connect() again, closing the port the
// guest is still actually using and replacing it with one paired to a port
// the guest already stopped listening for (its acceptListener unsubscribes
// after the first accept). Both sides report isConnected, but neither can
// reach the other - a silent, permanent hang with no error and no timeout
// (the initial connection timeout was already cleared on the first
// successful connect).
//
// This test manufactures that exact race deterministically instead of
// relying on incidental timing: HostAppDuplicateOffer.jsx captures the
// guest's real first handshake offer and replays the identical message
// ~800ms after the real connection has already succeeded. The guest then
// makes a real post-connect RPC call, which will hang (and eventually
// reject after the SDK's own ~10s host-call timeout) if the race broke the
// tunnel.
//
// This test asserts the CORRECT behavior (the connection survives a
// same-key duplicate offer) and currently FAILS.

const iframeSelector = "#iframe-under-test";

async function waitConnected(t, label) {
  await t.switchToIframe(iframeSelector);
  await t
    .expect(Selector("#attach-status").innerText)
    .eql("connected", `${label} should connect on initial load`, { timeout: 10000 });
}

fixture("Duplicate handshake offer should not break an established connection")
  .page("http://localhost:3000/#/duplicate-offer");

test("a same-key duplicate offer after connecting must not break the tunnel (SITES-48958)", async (t) => {
  await t.expect(Selector(iframeSelector).exists).ok("iframe should exist", { timeout: 15000 });
  await waitConnected(t, "guest");

  // Wait past the simulated duplicate-offer replay (800ms) and the guest's
  // own delayed post-connect ping (2000ms), with margin for the ping's
  // ~10s internal RPC timeout if the tunnel was broken.
  await t
    .expect(Selector("#ping-status").innerText)
    .notEql("pending", "ping should have resolved one way or another", { timeout: 13000 });

  const pingStatus = await Selector("#ping-status").innerText;
  const pingError = await Selector("#ping-error").innerText;
  await t.switchToMainWindow();

  await t
    .expect(pingStatus)
    .eql(
      "ok",
      `Expected the post-connect ping to succeed over the still-live tunnel, got "${pingStatus}" (${pingError})`
    );
});

fixture("Duplicate offer race - control run (no injected duplicate)")
  .page("http://localhost:3000/#/duplicate-offer?inject=0");

test("ping succeeds normally when no duplicate offer is injected", async (t) => {
  await t.expect(Selector(iframeSelector).exists).ok("iframe should exist", { timeout: 15000 });
  await waitConnected(t, "guest");

  await t
    .expect(Selector("#ping-status").innerText)
    .eql("ok", "ping should succeed with no interference", { timeout: 13000 });

  await t.switchToMainWindow();
});
