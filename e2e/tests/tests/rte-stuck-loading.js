import { fixture, test, Selector } from "testcafe";

/**
 * Reproduces the CF Editor RTE "stuck on loading skeleton" incident
 * (SITES-49454) at the extensibility-SDK level.
 *
 * Setup (#/rte-stuck):
 *   - `ext-ok`    : a healthy RTE extension, connects and reports ready instantly.
 *   - `ext-stuck` : completes the tunnel handshake but NEVER posts `guest-ready`.
 *
 * The host component gates its "editor" on the host's `loadallguests` event --
 * exactly how the real RTE gates `contentLoading` on `beforeLoadReady`. Because
 * the host waits for ALL guests to settle before firing `loadallguests`, the
 * never-ready guest stalls the whole extension point: the skeleton stays up for
 * the entire guest-ready timeout even though `ext-ok` was ready immediately.
 *
 * Guest-ready timeout for this scenario is 5000ms (App.js guestOptionsMap),
 * standing in for the 20s production default.
 */
fixture("RTE stuck loading").page("http://localhost:3000/#/rte-stuck");

test("RTE stays on the loading skeleton while an extension never reports ready", async (t) => {
  const skeleton = Selector("#rte-skeleton");
  const editor = Selector("#rte-editor");
  const readyFlag = Selector("#ready-flag");

  // Give the host time to create iframes and finish the tunnel handshake for
  // both guests, but stay well under the 5000ms guest-ready timeout. During
  // this window the healthy `ext-ok` has already connected, yet readiness is
  // still blocked by `ext-stuck` -- the bug.
  await t.wait(3000);

  await t
    .expect(skeleton.exists)
    .ok("RTE should still show the loading skeleton while a guest is never-ready")
    .expect(editor.exists)
    .notOk("RTE editor must not be available while the host is still loading")
    .expect(readyFlag.innerText)
    .eql("waiting", "Readiness signal from the host has not fired yet");
});

test("RTE recovers only after the never-ready guest times out", async (t) => {
  const skeleton = Selector("#rte-skeleton");
  const editor = Selector("#rte-editor");
  const readyFlag = Selector("#ready-flag");
  const loadedCount = Selector("#loaded-count");
  const failedCount = Selector("#failed-count");

  // The RTE only clears its skeleton once the host finally fires
  // `loadallguests` -- which cannot happen until `ext-stuck` times out at
  // ~5s. This is the "would have loaded after 20-30s" behaviour from the
  // incident, compressed to the 5s test timeout.
  await t
    .expect(editor.exists)
    .ok("RTE editor should eventually appear once the host times out the stuck guest", {
      timeout: 15000,
    })
    .expect(skeleton.exists)
    .notOk("Skeleton should be gone once the editor is ready")
    .expect(readyFlag.innerText)
    .eql("ready", "Host readiness signal has fired");

  // The healthy extension loaded; the stuck one is reported as failed.
  await t
    .expect(loadedCount.innerText)
    .eql("1", "Exactly the healthy extension should be reported as loaded")
    .expect(failedCount.innerText)
    .eql("1", "The never-ready extension should be reported as failed");
});
