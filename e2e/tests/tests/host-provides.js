import { fixture, test, Selector } from "testcafe";

const iframeSelector = "#iframe-for-guest";

fixture("Host Provides APIs").page("http://localhost:3000");

test("Guest can call host APIs and display result", async (t) => {
  const iframe = Selector(iframeSelector);
  await t.expect(iframe.exists).ok("Iframe should exist", { timeout: 15000 });

  await t.switchToIframe(iframeSelector);

  const infoEl = Selector("#info-from-host");
  await t
    .expect(infoEl.exists)
    .ok("Host info element should exist in guest UI", { timeout: 15000 });
  await t
    .expect(infoEl.innerText)
    .contains("Message from the host to guest!", { timeout: 5000 });
});
