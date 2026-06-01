import { fixture, test, Selector } from "testcafe";

fixture("Load Failure — error event").page("http://localhost:3000/#/load-failure");

test("Error event fires for the dead extension", async (t) => {
  await t
    .expect(Selector("#extension-count").innerText)
    .notEql("0", "Live extension should load", { timeout: 30000 });

  await t
    .expect(Selector("#failure-count").innerText)
    .eql("1", "Error event should fire exactly once for the dead extension", { timeout: 6000 });
});
