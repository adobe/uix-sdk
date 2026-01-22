import { fixture, test, Selector } from "testcafe";

const iframeSelector = "#iframe-for-guest";

fixture("UIX Host App").page("http://localhost:3000");

test("Check if guest is loaded", async (t) => {
  const iframe = Selector(iframeSelector);
  await t.expect(iframe.exists).ok("Iframe should exist");

  const iframeSrc = await iframe.getAttribute("src");
  console.log("Iframe src:", iframeSrc);
  await t
    .expect(iframe.getAttribute("src"))
    .notEql("", "Iframe should have src attribute");
});

test("Check response from guest app", async (t) => {
  const guestMessageButton = Selector("#get-guest-message-button");
  await t.click(guestMessageButton);

  const guestMessage = Selector("#get-guest-message-result").innerText;
  await t.expect(guestMessage).ok();
});

test("Set message from host", async (t) => {
  await t.click("#set-message-from-host");

  const iframe = Selector(iframeSelector);
  await t.expect(iframe.exists).ok("Iframe should exist");

  await t
    .expect(iframe.getAttribute("src"))
    .notEql("", "Iframe should have src attribute");

  await t.switchToIframe(iframeSelector);

  const textParagraph = Selector("#text-from-host").exists;
  await t.expect(textParagraph).ok("Text from host should exist in iframe");
});
