"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

import { adSenseScriptSrc } from "@/features/ads/config";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * One AdSense unit.
 *
 * The <ins> is markup AdSense reads; the push() tells it to fill. Both are
 * required, and the push must happen after the element exists — hence an effect
 * rather than an inline script.
 */
export function AdSenseUnit({
  clientId,
  slotId,
  responsive,
}: {
  clientId: string;
  slotId: string;
  responsive: boolean;
}) {
  const filled = useRef(false);
  const src = adSenseScriptSrc();

  useEffect(() => {
    // Pushing twice for the same <ins> makes AdSense throw "already have ads in
    // them", and React will re-run this on every navigation without the guard.
    if (filled.current) return;
    filled.current = true;

    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch (error) {
      // A blocked or failed advert must never take the page down with it.
      console.error("adsense push failed", error);
    }
  }, []);

  return (
    <>
      {src ? (
        // afterInteractive, not beforeInteractive: an advert must never sit on
        // the critical path of the thing the reader came for.
        <Script id="adsbygoogle-init" src={src} strategy="afterInteractive" crossOrigin="anonymous" />
      ) : null}
      <ins
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format={responsive ? "auto" : undefined}
        data-full-width-responsive={responsive ? "true" : undefined}
      />
    </>
  );
}
