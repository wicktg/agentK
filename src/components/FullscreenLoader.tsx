"use client";

import { useEffect, useState } from "react";

const TARGET_TEXT = "Loading...";
const CIPHER_CHARS = "01#%&*+=-~_?/><$!@ABCDEFabcdef";

export default function FullscreenLoader({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [displayText, setDisplayText] = useState(TARGET_TEXT);

  useEffect(() => {
    const startTime = Date.now();
    const DURATION = 5000; // Exact 5 seconds

    // Scramble interval for looping decryption/encryption animation
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;

      // Every 1.2s cycle through decrypt -> encrypt phases
      const cycleTime = (elapsed % 1400) / 1400; // 0 to 1

      if (cycleTime < 0.45) {
        // Clear/Decrypted window
        setDisplayText(TARGET_TEXT);
      } else {
        // Scrambled/Encrypted window
        const scrambled = TARGET_TEXT.split("")
          .map((char) => {
            if (char === ".") return ".";
            return CIPHER_CHARS[
              Math.floor(Math.random() * CIPHER_CHARS.length)
            ];
          })
          .join("");
        setDisplayText(scrambled);
      }

      if (elapsed >= DURATION) {
        clearInterval(interval);
        onComplete();
      }
    }, 55);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-[#08090c] flex items-center justify-center select-none">
      <div className="flex flex-col items-center">
        <h2 className="text-xl sm:text-2xl font-mono font-medium text-white tracking-wider">
          {displayText}
        </h2>
      </div>
    </div>
  );
}
