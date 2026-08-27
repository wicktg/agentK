"use client";

import { useEffect, useState } from "react";

export default function DesktopModeGuard() {
  const [isForcedDesktopOnMobile, setIsForcedDesktopOnMobile] = useState(false);

  useEffect(() => {
    const checkMode = () => {
      if (typeof window === "undefined") return;

      // Physical screen dimensions in CSS pixels
      const screenW = window.screen.width || 0;
      const screenH = window.screen.height || 0;
      const physicalMinDimension = Math.min(screenW, screenH);

      // Viewport width reported to the web page
      const viewportW =
        window.innerWidth || document.documentElement.clientWidth || 0;

      // Touch capability
      const hasTouch =
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0;

      // Explicit Mobile UA signature
      const isMobileUA =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent || "",
        );

      // When a mobile phone requests "Desktop site":
      // 1. Physical min dimension is small (< 620px)
      // 2. Device has touch capability
      // 3. Viewport width is artificially forced to desktop (>= 768px)
      const isSimulatedDesktopOnPhone =
        hasTouch &&
        physicalMinDimension > 0 &&
        physicalMinDimension < 620 &&
        viewportW >= 768;

      const isMobileUAFullDesktop =
        isMobileUA && viewportW >= 768 && physicalMinDimension < 620;

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
      <div className="max-w-md mx-auto flex flex-col items-center">
        {/* Primary Message */}
        <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-[-0.02em] mb-2 leading-tight">
          Switch to mobile view
        </h1>

        <p className="text-[15px] sm:text-base text-[#9ea3b5] font-normal tracking-[-0.01em] leading-relaxed">
          for the best possible experience.
        </p>
      </div>
    </div>
  );
}
