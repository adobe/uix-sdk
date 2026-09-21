import { fixture, test, Selector } from "testcafe";

const iframeSelector = "#iframe-for-guest";
const guestServerFrameSelector = 'iframe[data-uix-guest="true"][aria-hidden="true"]';

fixture("UIX Host App").page("http://localhost:3000");

test("Check if guest is loaded", async (t) => {
  const iframe = Selector(iframeSelector);
  await t.expect(iframe.exists).ok("Iframe should exist", { timeout: 10000 });

  await t
    .expect(iframe.getAttribute("src"))
    .contains("http://localhost:3002", "Iframe src should point to guest app", { timeout: 10000 });

  await t
    .expect(iframe.getAttribute("allow"))
    .eql("local-network-access", "Guest UI iframe should allow local-network-access", { timeout: 10000 });
});

test("Guest server iframe allows local-network-access", async (t) => {
  // The hidden background iframe used for host<->guest RPC (created in
  // Port.connect()) is a separate DOM node from the visible GuestUIFrame
  // above; it's identified by aria-hidden="true", which only that frame sets.
  const serverFrame = Selector(guestServerFrameSelector);
  await t
    .expect(serverFrame.exists)
    .ok("Guest server iframe should exist", { timeout: 10000 });

  await t
    .expect(serverFrame.getAttribute("allow"))
    .eql("local-network-access", "Guest server iframe should allow local-network-access", { timeout: 10000 });
});

test("Check response from guest app", async (t) => {
  const guestMessageButton = Selector("#get-guest-message-button");
  await t.click(guestMessageButton);

  const guestMessage = Selector("#get-guest-message-result").innerText;
  await t.expect(guestMessage).ok("Guest message should be displayed", { timeout: 10000 });
});

test("Set message from host", async (t) => {
  await t.click("#set-message-from-host");

  const iframe = Selector(iframeSelector);
  await t.expect(iframe.exists).ok("Iframe should exist", { timeout: 30000 });

  await t
    .expect(iframe.getAttribute("src"))
    .notEql("", "Iframe should have src attribute", { timeout: 30000 });

  await t.switchToIframe(iframeSelector);

  const textParagraph = Selector("#text-from-host").exists;
  await t.expect(textParagraph).ok("Text from host should exist in iframe", { timeout: 10000 });
});
