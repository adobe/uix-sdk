import {
  makeAllowAttrs,
  makeSandboxAttrs,
  normalizeIframe,
} from "./iframe-normalizers";

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

describe("makeAllowAttrs", () => {
  it("merges directives from strings and arrays, first feature wins", () =>
    expect(
      makeAllowAttrs(
        "local-network-access",
        " microphone ;  autoplay  'self' ;",
        ["Microphone 'none'", "camera https://example.com"]
      )
    ).toEqual([
      "local-network-access",
      "microphone",
      "autoplay 'self'",
      "camera https://example.com",
    ]));
});

describe("normalizeIframe", () => {
  it("merges required allow directives with existing ones", () => {
    const frame = document.createElement("iframe");
    frame.setAttribute("allow", "microphone; autoplay");
    normalizeIframe(frame);
    expect(frame.getAttribute("allow")).toBe(
      "local-network-access; microphone; autoplay"
    );
  });

  it("applies required attributes and default sandbox to iframe", () => {
    const frame = document.createElement("iframe");
    normalizeIframe(frame);
    expect(frame).toMatchInlineSnapshot(`
      <iframe
        allow="local-network-access"
        data-uix-guest="true"
        referrerpolicy="strict-origin"
        role="presentation"
      />
    `);
  });
});
