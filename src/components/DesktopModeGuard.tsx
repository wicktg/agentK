"use client";

import { useEffect, useState } from "react";

export default function DesktopModeGuard() {
  const [isForcedDesktopOnMobile, setIsForcedDesktopOnMobile] = useState(false);

  useEffect(() => {
    const checkMode = () => {
      if (typeof window === "undefined") return;

      // Physical screen dimensions in CSS pixels (unaffected by desktop mode viewport scaling on mobile)
      const screenW = window.screen.width || 0;
      const screenH = window.screen.height || 0;
      const physicalMinDimension = Math.min(screenW, screenH);

      // Viewport width reported to the web page
      const viewportW = window.innerWidth || document.documentElement.clientWidth || 0;

      // Touch capability
      const hasTouch =
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0;

      // Explicit Mobile UA signature (if not fully disguised)
      const isMobileUA =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent || "",
        );

      // When a mobile phone requests "Desktop site":
      // 1. Physical min dimension is small (< 620px), characteristic of phones.
      // 2. Device has touch points.
      // 3. Viewport width is artificially forced to desktop (>= 768px, typically 980px or 1024px).
      const isSimulatedDesktopOnPhone =
        hasTouch &&
        physicalMinDimension > 0 &&
        physicalMinDimension < 620 &&
        viewportW >= 768;

      // Also check if UA is clearly mobile but viewport is >= 768
      const isMobileUAFullDesktop = isMobileUA && viewportW >= 768 && physicalMinDimension < 620;

      if (isSimulatedDesktopOnPhone || isMobileUAFullDesktop) {
        setIsForcedDesktopOnMobile(true);
      } else {
        setIsForcedDesktopOnMobile(false);
      }
    };

    checkMode();

    window.addEventListener("resize", checkMode);
    window.addEventListener("orientationchange", checkMode);

    return () => {
      window.removeEventListener("resize", checkMode);
      window.removeEventListener("orientationchange", checkMode);
    };
  }, []);

  if (!isForcedDesktopOnMobile) return null;

  return (
    <div className="fixed inset-0 z-[999999] bg-[#08090c] text-white flex flex-col items-center justify-center text-center p-6 select-none animate-in fade-in duration-300">
      {/* Background Subtle Gradient Vignette */}
      <div className="absolute inset-0 bg-radial from-[#0e1118] via-[#08090c] to-[#08090c] pointer-events-none opacity-80" />

      {/* Content Container */}
      <div className="relative z-10 max-w-md mx-auto flex flex-col items-center">
        {/* Minimal ASCII Indicator */}
        <div className="bg-[#050608] border border-white/[0.08] rounded-xl px-5 py-3.5 mb-7 font-mono text-xs shadow-inner">
          <pre className="text-[#17A2C6] whitespace-pre font-mono font-medium">
{` .---------------------------.
|   AGENT_K // VIEW_GUARD     |
|   [!] DESKTOP MODE ACTIVE   |
 '---------------------------'`}
          </pre>
        </div>

        {/* Primary Notification Text */}
        <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-[-0.02em] mb-2 leading-tight">
          Switch to mobile view
        </h1>

        <p className="text-[15px] sm:text-base text-[#9ea3b5] font-normal tracking-[-0.01em] mb-7 leading-relaxed">
          for the best possible experience.
        </p>

        {/* Minimal Monospace Instruction */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-[#788290]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#17A2C6] animate-pulse" />
          <span>Disable &quot;Desktop site&quot; in browser settings</span>
        </div>
      </div>
    </div>
  );
}
