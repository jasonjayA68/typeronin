import { describe, expect, it } from "vitest";

import { describeClient, parseUserAgent } from "@/features/auth/user-agent";

/**
 * The user-agent reader. The whole point is the ordering: the Chromium-based
 * browsers all carry "Chrome", and Chrome itself carries "Safari", so a naive
 * check reports everything as Safari. These cases pin that order down.
 */

const UAS = {
  chromeMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  safariMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  edgeWin:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
  firefoxLinux: "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
  safariIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
  chromeAndroidPhone:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  androidTablet:
    "Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  ipad:
    "Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
};

describe("parseUserAgent — browser, past the shared tokens", () => {
  it("reads Chrome on macOS, not Safari", () => {
    expect(parseUserAgent(UAS.chromeMac)).toMatchObject({ browser: "Chrome", os: "macOS", device: "Desktop" });
  });

  it("reads real Safari on macOS", () => {
    expect(parseUserAgent(UAS.safariMac).browser).toBe("Safari");
  });

  it("reads Edge, not Chrome, when both tokens are present", () => {
    expect(parseUserAgent(UAS.edgeWin)).toMatchObject({ browser: "Edge", os: "Windows" });
  });

  it("reads Firefox on Linux", () => {
    expect(parseUserAgent(UAS.firefoxLinux)).toMatchObject({ browser: "Firefox", os: "Linux", device: "Desktop" });
  });
});

describe("parseUserAgent — device class", () => {
  it("calls an iPhone a Mobile on iOS", () => {
    expect(parseUserAgent(UAS.safariIphone)).toMatchObject({ os: "iOS", device: "Mobile" });
  });

  it("calls an Android phone Mobile", () => {
    expect(parseUserAgent(UAS.chromeAndroidPhone).device).toBe("Mobile");
  });

  it("calls an Android device without 'Mobile' a Tablet", () => {
    expect(parseUserAgent(UAS.androidTablet).device).toBe("Tablet");
  });

  it("calls an iPad a Tablet", () => {
    expect(parseUserAgent(UAS.ipad).device).toBe("Tablet");
  });
});

describe("parseUserAgent — nothing to go on", () => {
  it("returns nulls for empty or junk, never a confident guess", () => {
    expect(parseUserAgent(null)).toEqual({ browser: null, os: null, device: null });
    expect(parseUserAgent("")).toEqual({ browser: null, os: null, device: null });
    expect(parseUserAgent("curl/8.1.2")).toEqual({ browser: null, os: null, device: null });
  });
});

describe("describeClient", () => {
  it("summarises browser and OS", () => {
    expect(describeClient(parseUserAgent(UAS.chromeMac))).toBe("Chrome on macOS");
  });

  it("degrades gracefully when parts are missing", () => {
    expect(describeClient({ browser: null, os: null, device: "Mobile" })).toBe("Mobile");
    expect(describeClient({ browser: null, os: null, device: null })).toBe("Unknown device");
  });
});
