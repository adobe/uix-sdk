import { fixture, test, Selector } from "testcafe";

fixture("Multiple Extensions").page("http://localhost:3000/#/multi");

test("Both extensions load and respond to API calls", async (t) => {
  const countEl = Selector("#extension-count");

  // Wait for both extensions to connect
  await t
    .expect(countEl.innerText)
    .eql("2", "Both extensions should be loaded", { timeout: 30000 });

  // Request messages from all extensions
  await t.click("#get-all-messages");

  const messages = Selector(".ext-message");
  await t
    .expect(messages.count)
    .eql(2, "Should receive a message from each extension", { timeout: 10000 });
});
