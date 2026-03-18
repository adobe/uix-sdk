import { fixture, test, Selector } from "testcafe";

fixture("Lifecycle").page("http://localhost:3000");

test("Guest reconnects after host page reload", async (t) => {
  const button = Selector("#get-guest-message-button");
  const result = Selector("#get-guest-message-result");

  // Confirm initial connection works
  await t.click(button);
  await t
    .expect(result.innerText)
    .ok("Guest message should be returned on first load", { timeout: 10000 });

  // Reload the page and verify the connection is re-established
  await t.navigateTo("http://localhost:3000");

  await t
    .expect(Selector("#iframe-for-guest").exists)
    .ok("Iframe should be present after reload", { timeout: 15000 });

  await t.click(button);
  await t
    .expect(result.innerText)
    .ok("Guest message should be returned after reload", { timeout: 15000 });
});
