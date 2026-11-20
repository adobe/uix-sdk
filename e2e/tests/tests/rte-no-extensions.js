import { fixture, test, Selector } from "testcafe";

/**
 * Reproduces the regression introduced by uix-sdk commit d645b96
 * ("Update host render", PR #94, host-rerenders-update): host creation was
 * moved inside the `if (!extensions || !Object.keys(extensions).length) return;`
 * guard in `Extensible.tsx` -- a guard that previously only skipped calling
 * `host.load()`. As a result, when the extension point resolves to ZERO
 * extensions, `Host` is never instantiated at all, `useHost()` returns
 * `host: undefined` forever, and anything gating readiness on the host
 * (like the RTE's `useRTEBeforeLoad`) can never flip to `ready`.
 *
 * This differs from #/rte-stuck (SITES-49454): there, a non-empty guest
 * list means a `Host` IS created and `loadallguests` eventually fires once
 * the stuck guest's connection times out (bounded delay). Here, with zero
 * extensions, there is nothing to time out -- the hang is permanent.
 *
 * Setup (#/rte-no-extensions): the extensions provider resolves to `{}`.
 */
fixture("RTE with zero extensions").page("http://localhost:3000/#/rte-no-extensions");

test("RTE clears the loading skeleton when there are no extensions to load", async (t) => {
  const skeleton = Selector("#rte-skeleton");
  const editor = Selector("#rte-editor");
  const readyFlag = Selector("#ready-flag");

  // There is nothing to connect to and nothing to wait for, so readiness
  // should resolve almost immediately. Currently it never resolves, so this
  // assertion times out and the test fails.
  await t
    .expect(editor.exists)
    .ok("RTE editor should be available since there are no extensions to wait for", {
      timeout: 5000,
    })
    .expect(skeleton.exists)
    .notOk("Skeleton must not still be showing once zero extensions is confirmed")
    .expect(readyFlag.innerText)
    .eql("ready", "Readiness should resolve to true when the extension point has zero extensions");
});
