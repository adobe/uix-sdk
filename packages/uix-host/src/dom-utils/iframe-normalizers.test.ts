import { makeSandboxAttrs, normalizeIframe } from "./iframe-normalizers";

describe("makeSandboxAttrs", () => {
  it("merges and dedupes sandbox attributes", () =>
    expect(
      makeSandboxAttrs(
        "allow-scripts allow-popups",
        ["allow-downloads", "allow-orientation-lock", "allow-scripts"],
        "allow-orientation-lock"
      ).join(" ")
    ).toEqual(
      "allow-scripts allow-popups allow-downloads allow-orientation-lock"
    ));
});

describe("normalizeIframe", () => {
  it("applies required attributes and default sandbox to iframe", () => {
    const frame = document.createElement("iframe");
    normalizeIframe(frame);
    expect(frame).toMatchInlineSnapshot(`
      <iframe
        data-uix-guest="true"
        referrerpolicy="strict-origin"
        role="presentation"
      />
    `);
  });
});
