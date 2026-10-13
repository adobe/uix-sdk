import { fixture, test, Selector, ClientFunction } from "testcafe";

const registrationFrame = Selector("iframe").withAttribute(
  "src",
  /register-and-attach/
);

const startAttach = ClientFunction(() => {
  // The SDK's registration iframe is hidden, so use a native click in its realm.
  document.querySelector("#attach-in-registration-frame").click();
});

const attachFinished = ClientFunction(() => {
  return (
    document.querySelector("#attach-status").textContent === "rejected" ||
    document.querySelector("#resize-error").textContent.length > 0
  );
});

async function pingRegistration(t) {
  await t.click("#ping-registration");
  await t
    .expect(Selector("#registration-ping-status").innerText)
    .notEql("pending", "Registration RPC should settle", { timeout: 15000 });
  const error = await Selector("#registration-ping-error").innerText;
  await t
    .expect(Selector("#registration-ping-result").innerText)
    .eql(
      "registration-pong",
      `The register() connection must remain usable: ${error}`
    );
}

async function waitForRegistration(t) {
  await t
    .expect(Selector("#extension-count").innerText)
    .eql("1", "The extension should register before attempting attach()");
  await pingRegistration(t);
  await t.switchToIframe(registrationFrame);
  await t
    .expect(Selector("#register-status").innerText)
    .eql(
      "connected",
      "A guest-to-host RPC should confirm the initial handshake"
    );
}

fixture("One iframe must not have both register() and attach() connections")
  .page("http://localhost:3000/#/register-and-attach")
  // Capture the known ResizeObserver TypeError in the probe and assert it explicitly.
  .skipJsErrors({ message: /onIframeResize.*not a function/ });

test("attach() in a registration iframe must fail clearly without breaking register() (SITES-53586)", async (t) => {
  await waitForRegistration(t);
  await startAttach();
  await t
    .expect(attachFinished())
    .ok("attach() should reject promptly instead of connecting as a UI frame", {
      timeout: 7000,
    });

  const attachStatus = await Selector("#attach-status").innerText;
  const attachError = await Selector("#attach-error").innerText;
  const resizeError = await Selector("#resize-error").innerText;
  await t.switchToMainWindow();

  await t
    .expect(resizeError)
    .eql(
      "",
      `Invalid attach() must not cause the Semrush onIframeResize crash: ${resizeError}`
    );
  await t
    .expect(attachStatus)
    .eql(
      "rejected",
      "The registration iframe must not establish a second UIX connection"
    );
  await t
    .expect(attachError)
    .match(
      /register|registration|already.*connect|second.*connect|one.*connect/i,
      "The rejection should explain the connection contract, not merely time out"
    );
  await pingRegistration(t);
});

test("register() alone keeps the extension available and its RPC connection usable", async (t) => {
  await waitForRegistration(t);
  await t.expect(Selector("#attach-status").innerText).eql("idle");
  await t.expect(Selector("#resize-error").innerText).eql("");
  await t.switchToMainWindow();
  await pingRegistration(t);
});
