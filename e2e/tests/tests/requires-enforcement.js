import { fixture, test, Selector } from "testcafe";

fixture("Requires Enforcement").page("http://localhost:3000/#/requires");

test("Extension missing required method is excluded", async (t) => {
  const countEl = Selector("#extension-count");

  // Wait for the full extension to connect
  await t
    .expect(countEl.innerText)
    .notEql("0", "Full extension should load", { timeout: 30000 });

  // Give the partial extension time to connect (it will be excluded by requires)
  await t.wait(3000);

  // Only the extension implementing all required methods should appear
  await t
    .expect(countEl.innerText)
    .eql("1", "Partial extension missing setMessage should be excluded");
});
