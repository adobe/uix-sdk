import { fixture, test, Selector } from "testcafe";

const iframeSelector = "#iframe-for-guest";

fixture("UIX Host App").page("http://localhost:3000");

test("Check if guest is loaded", async (t) => {
  const iframe = Selector(iframeSelector);
  await t.expect(iframe.exists).ok("Iframe should exist", { timeout: 10000 });

  const iframeSrc = await iframe.getAttribute("src");
  await t
    .expect(iframe.getAttribute("src"))
    .notEql("", "Iframe should have src attribute", { timeout: 10000 });
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
  await t.expect(iframe.exists).ok("Iframe should exist", { timeout: 10000 });

  await t
    .expect(iframe.getAttribute("src"))
    .notEql("", "Iframe should have src attribute", { timeout: 10000 });

  await t.switchToIframe(iframeSelector);

  const textParagraph = Selector("#text-from-host").exists;
  await t.expect(textParagraph).ok("Text from host should exist in iframe", { timeout: 10000 });
});
