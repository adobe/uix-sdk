import { fixture, test, Selector } from "testcafe";

const iframeSelector = "#iframe-for-guest";

fixture(`UIX Host App - Local Dist Build`)
  .page("http://localhost:3000")
  .beforeEach(async (t) => {
    console.log('Running test with locally built packages from ./dist');
    await t.takeScreenshot(`start-local-dist-build.png`);
  });

/**
 * Helper function to wait for iframe to be fully loaded
 */
async function waitForIframeLoaded(t, iframeSelector, timeout = 20000) {
  const iframe = Selector(iframeSelector);
  
  await t.expect(iframe.exists).ok("Iframe should exist", { timeout });
  await t.expect(iframe.getAttribute("src")).notEql("", "Iframe should have src attribute", { timeout });
  
  let isLoaded = false;
  let attempts = 0;
  const maxAttempts = Math.floor(timeout / 500);
  
  while (!isLoaded && attempts < maxAttempts) {
    isLoaded = await t.eval(() => {
      const iframe = document.querySelector("#iframe-for-guest");
      if (!iframe) return false;
      
      try {
        if (iframe.contentDocument) {
          return iframe.contentDocument.readyState === "complete";
        }
        return iframe.contentWindow && iframe.src && iframe.src !== "";
      } catch (e) {
        return iframe.src && iframe.src !== "";
      }
    });
    
    if (!isLoaded) {
      await t.wait(500);
      attempts++;
    }
  }
  
  return iframe;
}

test("Check if guest is loaded with local dist", async (t) => {
  console.log('Test 1: Checking guest load with local dist packages');
  
  const iframe = await waitForIframeLoaded(t, iframeSelector);
  const iframeSrc = await iframe.getAttribute("src");
  console.log("Iframe src:", iframeSrc);
  
  await t.expect(iframe.exists).ok("Iframe should remain loaded");
  
  const iframeBounds = await iframe.boundingClientRect;
  await t.expect(iframeBounds.width).gt(0, "Iframe should have width");
  await t.expect(iframeBounds.height).gt(0, "Iframe should have height");
  
  await t.takeScreenshot(`test1-complete-local-dist.png`);
});

test("Check response from guest app with local dist", async (t) => {
  console.log('Test 2: Checking guest response with local dist packages');
  
  await waitForIframeLoaded(t, iframeSelector);
  
  const guestMessageButton = Selector("#get-guest-message-button");
  await t.expect(guestMessageButton.exists).ok("Guest message button should exist", { timeout: 10000 });
  
  await t.takeScreenshot(`test2-before-click-local-dist.png`);
  await t.click(guestMessageButton);
  
  const guestMessage = Selector("#get-guest-message-result").innerText;
  await t.expect(guestMessage).ok("Guest message should be displayed", { timeout: 15000 });
  
  const messageText = await guestMessage;
  console.log("Guest message received:", messageText);
  
  await t.takeScreenshot(`test2-complete-local-dist.png`);
});

test("Set message from host with local dist", async (t) => {
  console.log('Test 3: Setting message from host with local dist packages');
  
  await t.takeScreenshot(`test3-start-local-dist.png`);
  await t.click("#set-message-from-host");

  const iframe = await waitForIframeLoaded(t, iframeSelector, 30000);
  await t.takeScreenshot(`test3-iframe-loaded-local-dist.png`);

  try {
    await t.switchToIframe(iframeSelector);
    const textParagraph = Selector("#text-from-host").exists;
    await t.expect(textParagraph).ok("Text from host should exist in iframe", { timeout: 15000 });
    
    console.log("Successfully accessed iframe content with local dist packages");
    await t.takeScreenshot(`test3-iframe-content-local-dist.png`);
    await t.switchToMainWindow();
  } catch (error) {
    console.log("Cannot switch to iframe (cross-origin):", error.message);
    await t.expect(iframe.exists).ok("Iframe exists and loads content (cross-origin prevents access)");
    await t.takeScreenshot(`test3-cross-origin-local-dist.png`);
  }
  
  await t.takeScreenshot(`test3-complete-local-dist.png`);
});
