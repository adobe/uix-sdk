import { fixture, test, Selector, ClientFunction } from "testcafe";

// render-test and the failure-count assertion in load-failure require fixes
// introduced in 1.1.9. Skip for older published versions in the version matrix.
function versionAtLeast(current, minimum) {
  if (!current) return true;
  const curr = current.split(".").map(Number);
  const min = minimum.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((curr[i] || 0) > (min[i] || 0)) return true;
    if ((curr[i] || 0) < (min[i] || 0)) return false;
  }
  return true;
}

const runFixTests = versionAtLeast(process.env.HOST_SDK_VERSION, "1.1.9");

fixture("Render Test").page("http://localhost:3000/#/render-test");

const getCount = ClientFunction(id => {
  const el = document.getElementById(id);
  return el ? parseInt(el.innerText, 10) : 0;
});

test("Children do not remount on parent re-render", async (t) => {
  if (!runFixTests) return;

  // Wait for Panel A extension to finish loading
  await t
    .expect(Selector("#panelA-loading").innerText)
    .eql("false", "Panel A extension should finish loading", { timeout: 30000 });

  // All components should be on their first mount
  const mountIds = [
    "#panelA-outer-mount",
    "#panelA-main-mount",
    "#panelA-container-mount",
    "#panelA-slot-mount",
    "#panelB-outer-mount",
    "#panelB-main-mount",
    "#panelB-container-mount",
    "#panelB-slot-mount",
  ];
  for (const id of mountIds) {
    await t.expect(Selector(id).innerText).eql("#1", `${id} should be on first mount`);
  }

  // Trigger three parent re-renders
  await t.click("#force-rerender").click("#force-rerender").click("#force-rerender");

  // Parent should have re-rendered
  await t
    .expect(Selector("#parent-renders").innerText)
    .eql("4", "Parent should have rendered 4 times");

  // Mount IDs must not have changed — no remounts occurred
  for (const id of mountIds) {
    await t.expect(Selector(id).innerText).eql("#1", `${id} should still be on first mount after re-renders`);
  }

  // Render counts must be > 1 — re-renders did propagate into children
  const renderIds = [
    "panelA-outer-renders",
    "panelA-main-renders",
    "panelA-container-renders",
    "panelA-slot-renders",
    "panelB-outer-renders",
    "panelB-main-renders",
    "panelB-container-renders",
    "panelB-slot-renders",
  ];
  for (const id of renderIds) {
    await t
      .expect(getCount(id))
      .gt(1, `#${id} should have re-rendered at least once`);
  }
});
