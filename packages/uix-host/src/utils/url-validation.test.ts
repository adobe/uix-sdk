/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { isValidHttpUrl } from "./url-validation";

describe("isValidHttpUrl", () => {
  describe("valid URLs", () => {
    it("should accept http URLs", () => {
      expect(isValidHttpUrl("http://example.com")).toBe(true);
      expect(isValidHttpUrl("http://localhost:3000")).toBe(true);
      expect(isValidHttpUrl("http://localhost:3000/path?query=value")).toBe(
        true,
      );
    });

    it("should accept https URLs", () => {
      expect(isValidHttpUrl("https://example.com")).toBe(true);
      expect(isValidHttpUrl("https://example.com/path")).toBe(true);
      expect(
        isValidHttpUrl("https://example.com:8080/path?query=value#hash"),
      ).toBe(true);
    });
  });

  describe("dangerous protocols", () => {
    it("should reject javascript: protocol", () => {
      expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
      expect(isValidHttpUrl("javascript:alert('xss')")).toBe(false);
    });

    it("should reject data: protocol", () => {
      expect(isValidHttpUrl("data:text/html,<script>alert(1)</script>")).toBe(
        false,
      );
      expect(
        isValidHttpUrl(
          "data:text/html;base64,PHNjcmlwdD5hbGVydCgneHNzJyk8L3NjcmlwdD4=",
        ),
      ).toBe(false);
    });

    it("should reject file: protocol", () => {
      expect(isValidHttpUrl("file:///etc/passwd")).toBe(false);
      expect(isValidHttpUrl("file://C:/Windows/System32/config/sam")).toBe(
        false,
      );
    });

    it("should reject other protocols", () => {
      expect(isValidHttpUrl("ftp://example.com")).toBe(false);
      expect(isValidHttpUrl("ws://example.com")).toBe(false);
      expect(isValidHttpUrl("wss://example.com")).toBe(false);
      expect(isValidHttpUrl("about:blank")).toBe(false);
    });
  });

  describe("weak validation bypass attempts", () => {
    it("should reject URLs starting with http but not http:", () => {
      expect(isValidHttpUrl("httpx://evil.com")).toBe(false);
      expect(isValidHttpUrl("httpsomething://bad.com")).toBe(false);
      expect(isValidHttpUrl("http-evil://bad.com")).toBe(false);
    });
  });

  describe("malformed URLs", () => {
    it("should reject invalid URL strings", () => {
      expect(isValidHttpUrl("not a url")).toBe(false);
      expect(isValidHttpUrl("://missing-protocol")).toBe(false);
      expect(isValidHttpUrl("http://")).toBe(false);
      expect(isValidHttpUrl("https://")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should reject null and undefined", () => {
      expect(isValidHttpUrl(null as any)).toBe(false);
      expect(isValidHttpUrl(undefined as any)).toBe(false);
    });

    it("should reject empty string", () => {
      expect(isValidHttpUrl("")).toBe(false);
      expect(isValidHttpUrl("   ")).toBe(false);
    });

    it("should reject non-string values", () => {
      expect(isValidHttpUrl(123 as any)).toBe(false);
      expect(isValidHttpUrl({} as any)).toBe(false);
      expect(isValidHttpUrl([] as any)).toBe(false);
    });
  });
});
