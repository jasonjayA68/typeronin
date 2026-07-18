/**
 * What a user-agent string says about the client.
 *
 * A deliberately small, dependency-free reader. It is not trying to identify
 * every browser ever shipped — it is trying to tell an account holder "you last
 * signed in from Chrome on a Mac", and to give a fraud check a coarse device
 * class. Order matters: Edge and Opera both carry "Chrome" in their strings, and
 * every Chrome carries "Safari", so the more specific token is tested first.
 *
 * Everything is best-effort. A UA that matches nothing yields nulls rather than a
 * confident guess, because a wrong device on a security panel is worse than a
 * blank one.
 */

export type ClientInfo = {
  browser: string | null;
  os: string | null;
  device: string | null;
};

export function parseUserAgent(ua: string | null | undefined): ClientInfo {
  if (!ua) return { browser: null, os: null, device: null };

  return {
    browser: detectBrowser(ua),
    os: detectOs(ua),
    device: detectDevice(ua),
  };
}

function detectBrowser(ua: string): string | null {
  if (/\bEdg(e|A|iOS)?\//.test(ua)) return "Edge";
  if (/\bOPR\/|\bOpera\b/.test(ua)) return "Opera";
  if (/\bSamsungBrowser\//.test(ua)) return "Samsung Internet";
  if (/\bFirefox\/|\bFxiOS\//.test(ua)) return "Firefox";
  // Chrome and Chromium — but only after the Chromium-based ones above are ruled
  // out, since they all carry "Chrome" in the string.
  if (/\bChrome\/|\bCriOS\//.test(ua)) return "Chrome";
  // Safari carries "Safari" too, so it is last, and only counts when Chrome did
  // not already match.
  if (/\bSafari\//.test(ua)) return "Safari";
  return null;
}

function detectOs(ua: string): string | null {
  if (/\bWindows NT\b/.test(ua)) return "Windows";
  if (/\biPhone\b|\biPad\b|\biPod\b/.test(ua)) return "iOS";
  if (/\bAndroid\b/.test(ua)) return "Android";
  // "Mac OS X" also appears in iOS strings, so it is tested after the iOS tokens.
  if (/\bMac OS X\b|\bMacintosh\b/.test(ua)) return "macOS";
  if (/\bLinux\b|\bX11\b/.test(ua)) return "Linux";
  return null;
}

function detectDevice(ua: string): string | null {
  if (/\biPad\b/.test(ua)) return "Tablet";
  // Android without "Mobile" is, by Google's own convention, a tablet.
  if (/\bAndroid\b/.test(ua)) return /\bMobile\b/.test(ua) ? "Mobile" : "Tablet";
  if (/\biPhone\b|\biPod\b/.test(ua) || /\bMobile\b/.test(ua)) return "Mobile";
  if (/\bWindows NT\b|\bMac OS X\b|\bMacintosh\b|\bLinux\b|\bX11\b/.test(ua)) return "Desktop";
  return null;
}

/** A one-line summary for a panel: "Chrome on macOS". */
export function describeClient(info: ClientInfo): string {
  if (info.browser && info.os) return `${info.browser} on ${info.os}`;
  return info.browser ?? info.os ?? info.device ?? "Unknown device";
}
