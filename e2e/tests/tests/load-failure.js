import { fixture, test, Selector } from "testcafe";

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
});
