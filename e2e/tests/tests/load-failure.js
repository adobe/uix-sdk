import { fixture, test, Selector } from "testcafe";

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

fixture("Load Failure").page("http://localhost:3000/#/load-failure");

test("Live extension loads when one extension URL is unreachable", async (t) => {
  const countEl = Selector("#extension-count");

  // Wait for the live extension to connect
  await t
    .expect(countEl.innerText)
    .notEql("0", "At least one extension should load", { timeout: 30000 });

  // Dead extension should never appear — count stays at 1
  await t
    .expect(countEl.innerText)
    .eql("1", "Exactly one extension should be loaded");

  // Error event must have fired for the dead extension (requires fix in >= 1.1.9)
  if (runFixTests) {
    await t
      .expect(Selector("#failure-count").innerText)
      .eql("1", "Error event should fire exactly once for the dead extension", { timeout: 6000 });
  }
});
