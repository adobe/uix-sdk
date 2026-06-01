import { fixture, test, Selector } from "testcafe";

fixture("Load Failure").page("http://localhost:3000/#/load-failure");

test("Live extension loads when one extension URL is unreachable", async (t) => {
  const countEl = Selector("#extension-count");

  await t
    .expect(countEl.innerText)
    .notEql("0", "At least one extension should load", { timeout: 30000 });

  await t
    .expect(countEl.innerText)
    .eql("1", "Exactly one extension should be loaded");
});
