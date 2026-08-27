"use client";

import { useEffect, useRef, useState } from "react";

// Zero-Reflow In-Place Monospace Character Decrypt Component
function InPlaceChar({
  targetChar,
  currentChar,
}: {
  targetChar: string;
  currentChar: string;
}) {
  const isResolved = currentChar === targetChar;
  const isSpace = targetChar === " ";

  if (isSpace) {
    return <span>&nbsp;</span>;
  }

  return (
    <span
      className={`inline-block font-mono select-none ${
        isResolved ? "text-white font-normal" : "text-[#17A2C6] font-normal"
      }`}
    >
      {currentChar}
    </span>
  );
}

// Zero-Reflow Scroll Decryption Keyword Trigger
function ScrollDecryptKeyword({ target }: { target: string }) {
  const [hasAnimated, setHasAnimated] = useState(false);
  const [cipherText, setCipherText] = useState<string[]>(() =>
    target.split("").map((c) => (c === " " ? " " : "*")),
  );
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || hasAnimated) return;

    const chars =
      "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+-=[]{}|;:,.<>?";

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);

          let iteration = 0;
          const maxIterations = target.length * 4;

          const interval = setInterval(() => {
            setCipherText(() => {
              return target.split("").map((targetChar, index) => {
                if (targetChar === " ") return " ";
                if (index < Math.floor(iteration / 4)) {
                  return targetChar;
                }
                return chars[Math.floor(Math.random() * chars.length)];
              });
            });

            iteration += 1;

            if (iteration > maxIterations) {
              clearInterval(interval);
              setCipherText(target.split(""));
            }
          }, 35);

          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [hasAnimated, target]);

  return (
    <span ref={containerRef} className="inline-flex tracking-normal">
      {target.split("").map((targetChar, index) => (
        <InPlaceChar
          key={index}
          targetChar={targetChar}
          currentChar={cipherText[index] || targetChar}
        />
      ))}
    </span>
  );
}

export default function AboutSection() {
  return (
    <section
      id="about"
      className="relative w-full bg-[#08090c] py-24 sm:py-32 md:py-40 lg:py-48 px-6 sm:px-10 md:px-16 lg:px-20 overflow-hidden select-none scroll-mt-6"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 xl:gap-24 items-center">
        {/* Left Column: Artwork Card with Aesthetic Grain Overlay */}
        <div className="lg:col-span-6 xl:col-span-5 flex justify-center">
          <div className="relative w-full max-w-[440px] aspect-square rounded-2xl overflow-hidden group">
            {/* Base Logo Artwork */}
            <img
              src="/logo.png"
              alt="agentK Official Logo"
              className="w-full h-full object-cover select-none transition-transform duration-700 group-hover:scale-[1.02]"
            />

            {/* High-Fidelity SVG Film Grain Texture Overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.38] mix-blend-overlay"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                backgroundSize: "128px 128px",
              }}
            />
          </div>
        </div>

        {/* Right Column: Editorial Typography */}
        <div className="lg:col-span-6 xl:col-span-7 flex flex-col justify-center lg:pl-4">
          {/* Kicker Header in Small Caps without decorative dots */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-sm sm:text-base font-medium text-[#17A2C6] [font-variant:small-caps] tracking-widest antialiased">
              what is agentk?
            </h2>
          </div>

          {/* Narrative Body with Single-Run Scroll Decryption on 'cryptographic identity' */}
          <div className="space-y-6 sm:space-y-7 text-[#9ea3b5] font-normal leading-[1.75] text-[15px] sm:text-base md:text-[17px] tracking-[-0.01em] antialiased">
            <p>
              In decentralized ecosystems, valuable contributions are routinely
              lost in the chaos of social feeds. High-signal research, ecosystem
              breakdowns, and strategic insights published on X evaporate
              without persistent on-chain attribution.
            </p>

            <p>
              agentK acts as your autonomous protocol agent. Every verified
              post, thread, and guide you produce on X is automatically
              detected, sequenced, and pushed directly to the Flop Network under
              your personal{" "}
              <ScrollDecryptKeyword target="cryptographic identity" />.
            </p>

            <p>
              Beyond social contributions, agentK is quietly engineering an
              autonomous pipeline for the Flop Network testnet. Your agent
              operates continuously in the background, establishing early
              participation and network weight without manual intervention.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
