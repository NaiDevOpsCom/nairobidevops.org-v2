/**
 * Unit tests for safeNavigate utility
 *
 * Tests cover:
 * - Basic internal route validation
 * - Encoded URL bypass attempts
 * - Protocol-relative URL blocking
 * - Dangerous protocol blocking
 * - Path traversal normalization
 * - External URL validation
 */

import { describe, it, expect } from "vitest";

import {
  validateInternalRoute,
  getSafeRoute,
  validateExternalUrl,
  isExternalUrl,
} from "../safeNavigate";

describe("safeNavigate", () => {
  describe("validateInternalRoute", () => {
    describe("valid internal routes", () => {
      it("accepts simple paths", () => {
        expect(validateInternalRoute("/about")).toEqual({
          isValid: true,
          sanitizedUrl: "/about",
        });
      });

      it("accepts nested paths", () => {
        expect(validateInternalRoute("/events/2024")).toEqual({
          isValid: true,
          sanitizedUrl: "/events/2024",
        });
      });

      it("accepts root path", () => {
        expect(validateInternalRoute("/")).toEqual({
          isValid: true,
          sanitizedUrl: "/",
        });
      });

      it("normalizes paths without leading slash", () => {
        const result = validateInternalRoute("about");
        expect(result.isValid).toBe(true);
        expect(result.sanitizedUrl).toBe("/about");
      });
    });

    describe("dangerous protocol blocking", () => {
      it("blocks javascript: protocol", () => {
        const result = validateInternalRoute("javascript:alert(1)");
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe("Dangerous protocol detected");
        expect(result.sanitizedUrl).toBe("/");
      });

      it("blocks data: protocol", () => {
        const result = validateInternalRoute("data:text/html,<script>alert(1)</script>");
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe("Dangerous protocol detected");
      });

      it("blocks vbscript: protocol", () => {
        const result = validateInternalRoute("vbscript:msgbox(1)");
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe("Dangerous protocol detected");
      });

      it("blocks file: protocol", () => {
        const result = validateInternalRoute("file:///etc/passwd");
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe("Dangerous protocol detected");
      });
    });

    describe("encoded URL bypass prevention", () => {
      it("blocks URL-encoded javascript:", () => {
        // javascript: encoded
        const encoded = "%6A%61%76%61%73%63%72%69%70%74%3Aalert(1)";
        const result = validateInternalRoute(encoded);
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe("Dangerous protocol detected");
      });

      it("blocks double-encoded URLs", () => {
        // //evil.com double encoded: %252F%252Fevil.com
        const doubleEncoded = "%252F%252Fevil.com";
        const result = validateInternalRoute(doubleEncoded);
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe("External URL not allowed for internal navigation");
      });

      it("blocks URL-encoded protocol-relative URLs", () => {
        // //evil.com encoded: %2F%2Fevil.com
        const encoded = "%2F%2Fevil.com";
        const result = validateInternalRoute(encoded);
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe("External URL not allowed for internal navigation");
      });
    });

    describe("protocol-relative URL blocking", () => {
      it("blocks //evil.com", () => {
        const result = validateInternalRoute("//evil.com");
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe("External URL not allowed for internal navigation");
      });

      it("blocks //evil.com/path", () => {
        const result = validateInternalRoute("//evil.com/path");
        expect(result.isValid).toBe(false);
      });
    });

    describe("absolute URL blocking", () => {
      it("blocks http:// URLs", () => {
        const result = validateInternalRoute("http://evil.com");
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe("External URL not allowed for internal navigation");
      });

      it("blocks https:// URLs", () => {
        const result = validateInternalRoute("https://evil.com");
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe("External URL not allowed for internal navigation");
      });

      it("blocks ftp:// URLs", () => {
        const result = validateInternalRoute("ftp://evil.com");
        expect(result.isValid).toBe(false);
      });
    });

    describe("path traversal normalization", () => {
      it("normalizes ../ sequences", () => {
        const result = validateInternalRoute("/about/../admin");
        expect(result.isValid).toBe(true);
        expect(result.sanitizedUrl).toBe("/admin");
      });

      it("prevents escaping root", () => {
        const result = validateInternalRoute("/../../../etc/passwd");
        expect(result.isValid).toBe(true);
        expect(result.sanitizedUrl).toBe("/etc/passwd");
      });

      it("normalizes ./ sequences", () => {
        const result = validateInternalRoute("/about/./test");
        expect(result.isValid).toBe(true);
        expect(result.sanitizedUrl).toBe("/about/test");
      });

      it("handles query strings correctly without traversing", () => {
        // Should NOT normalize away query params even if they look like traversal
        // e.g. /page?redirect=../admin should ideally be /page?redirect=../admin in a raw sense,
        // OR if we normalize the path part only, the query param stays as is.
        // normalizePath implementation now separates path and query.
        // Input: /page?param=../admin
        // Path part: /page -> normalized /page
        // Result: /page?param=../admin

        const result = validateInternalRoute("/page?param=../admin");
        expect(result.isValid).toBe(true);
        // verify query string persists and '..' in query is not "resolved" against the path
        expect(result.sanitizedUrl).toBe("/page?param=../admin");
      });
    });

    describe("edge cases", () => {
      it("handles empty string", () => {
        const result = validateInternalRoute("");
        expect(result.isValid).toBe(false);
        expect(result.sanitizedUrl).toBe("/");
      });

      it("handles whitespace", () => {
        // Whitespace-only strings should be considered invalid
        const result = validateInternalRoute("   ");
        expect(result.isValid).toBe(false);
        expect(result.sanitizedUrl).toBe("/");
      });

      it("uses custom fallback", () => {
        const result = validateInternalRoute("javascript:alert(1)", "/error");
        expect(result.sanitizedUrl).toBe("/error");
      });

      it("handles null-ish values", () => {
        // @ts-expect-error Testing runtime behavior
        const result = validateInternalRoute(null);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe("getSafeRoute", () => {
    it("returns valid routes unchanged", () => {
      expect(getSafeRoute("/about")).toBe("/about");
    });

    it("returns fallback for invalid routes", () => {
      expect(getSafeRoute("javascript:alert(1)")).toBe("/");
    });

    it("uses custom fallback", () => {
      expect(getSafeRoute("javascript:alert(1)", "/home")).toBe("/home");
    });
  });

  describe("validateExternalUrl", () => {
    it("accepts https:// URLs", () => {
      const result = validateExternalUrl("https://example.com");
      expect(result.isValid).toBe(true);
      expect(result.sanitizedUrl).toBe("https://example.com");
    });

    it("accepts http:// URLs", () => {
      const result = validateExternalUrl("http://example.com");
      expect(result.isValid).toBe(true);
    });

    it("blocks javascript: URLs", () => {
      const result = validateExternalUrl("javascript:alert(1)");
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe("Dangerous protocol detected");
    });

    it("blocks relative URLs", () => {
      const result = validateExternalUrl("/about");
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe("Only http:// and https:// protocols allowed");
    });

    it("blocks protocol-relative URLs", () => {
      const result = validateExternalUrl("//evil.com");
      expect(result.isValid).toBe(false);
    });
  });

  describe("isExternalUrl", () => {
    it("identifies https URLs", () => {
      expect(isExternalUrl("https://example.com")).toBe(true);
    });

    it("identifies http URLs", () => {
      expect(isExternalUrl("http://example.com")).toBe(true);
    });

    it("rejects relative paths", () => {
      expect(isExternalUrl("/about")).toBe(false);
    });

    it("handles encoded URLs", () => {
      // https:// encoded
      expect(isExternalUrl("%68%74%74%70%73%3A//example.com")).toBe(true);
    });

    it("handles empty input", () => {
      expect(isExternalUrl("")).toBe(false);
    });
  });
});
