"use client";

import { useEffect, useRef, useState } from "react";

const CIPHER_GLYPHS = "01#%&*+=-~_?/><$!@";

// Deterministic static initial cipher generator for hydration safety
function getDeterministicCipher(text: string) {
  return text
    .split("")
    .map((char, i) =>
      char === " " ? " " : CIPHER_GLYPHS[i % CIPHER_GLYPHS.length],
    )
    .join("");
}

// Single-run Decrypt Badge component
function DecryptBadge({
  text,
  isTriggered,
  delay = 0,
}: {
  text: string;
  isTriggered: boolean;
  delay?: number;
}) {
  const [displayText, setDisplayText] = useState(() =>
    getDeterministicCipher(text),
  );

  useEffect(() => {
    if (!isTriggered) return;

    let interval: NodeJS.Timeout | null = null;
    let step = 0;
    const maxSteps = text.length;

    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        step += 1;
        setDisplayText(
          text
            .split("")
            .map((char, index) => {
              if (char === " ") return " ";
              if (index < step) {
                return text[index];
              }
              return CIPHER_GLYPHS[
                Math.floor(Math.random() * CIPHER_GLYPHS.length)
              ];
            })
            .join(""),
        );

        if (step >= maxSteps) {
          if (interval) clearInterval(interval);
          setDisplayText(text);
        }
      }, 28);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [isTriggered, text, delay]);

  return (
    <div className="inline-flex items-center gap-1.5 bg-white text-black px-2.5 py-1 text-[11px] font-mono font-bold tracking-wider rounded-[2px] shadow-sm">
      <span className="font-bold">&gt;</span>
      <span>{displayText}</span>
    </div>
  );
}

// --- ASCII Graphic 1: Calm Watching Eye Scanning Feed ---
function AsciiEyeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 400;
    const height = 260;
    canvas.width = width;
    canvas.height = height;

    const cols = 60;
    const rows = 36;
    const cellW = width / cols;
    const cellH = height / rows;

    const glyphs = " .:-=+*#%@";

    const draw = () => {
      ctx.fillStyle = "#06131c";
      ctx.fillRect(0, 0, width, height);

      // Horizontal CRT Scanlines
      ctx.fillStyle = "rgba(10, 30, 42, 0.6)";
      for (let y = 0; y < height; y += 3) {
        ctx.fillRect(0, y, width, 1.2);
      }

      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = (c + 0.5) * cellW;
          const y = (r + 0.5) * cellH;

          const nx = (c / (cols - 1) - 0.5) * 2.4;
          const ny = (r / (rows - 1) - 0.5) * 2.2;

          const upperLid = -0.35 + nx * nx * 0.45;
          const lowerLid = 0.55 - nx * nx * 0.35;

          let intensity = 0;

          if (ny >= upperLid && ny <= lowerLid && Math.abs(nx) < 1.1) {
            const irisDist = Math.hypot(nx, (ny - 0.1) * 1.2);
            if (irisDist < 0.22) {
              intensity = 0.95;
            } else if (irisDist < 0.48) {
              intensity = 0.75;
            } else {
              intensity = 0.35;
            }
          } else {
            const distUpperLid = Math.abs(ny - upperLid);
            const distLowerLid = Math.abs(ny - lowerLid);
            if (distUpperLid < 0.12 && Math.abs(nx) < 1.15) {
              intensity = 0.65;
            } else if (distLowerLid < 0.1 && Math.abs(nx) < 1.05) {
              intensity = 0.45;
            } else {
              intensity = 0.05 + Math.sin(nx * 8 + ny * 6) * 0.04;
            }
          }

          if (intensity > 0.1) {
            const charIdx = Math.floor(intensity * (glyphs.length - 1));
            const char = glyphs[charIdx];

            if (intensity > 0.8) {
              ctx.fillStyle = "#ffffff";
            } else if (intensity > 0.5) {
              ctx.fillStyle = "#17A2C6";
            } else if (intensity > 0.3) {
              ctx.fillStyle = "#127d99";
            } else {
              ctx.fillStyle = "#0c4554";
            }

            ctx.fillText(char, x, y);
          }
        }
      }
    };

    draw();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full object-cover select-none"
    />
  );
}

// --- ASCII Graphic 2: Mysterious Flop Testnet Pipeline Topology ---
function AsciiFlopTestnetCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 400;
    const height = 260;
    canvas.width = width;
    canvas.height = height;

    const cols = 60;
    const rows = 36;
    const cellW = width / cols;
    const cellH = height / rows;

    const glyphs = " .:=+*#%@";

    const draw = () => {
      ctx.fillStyle = "#06131c";
      ctx.fillRect(0, 0, width, height);

      // Horizontal Scanlines
      ctx.fillStyle = "rgba(10, 30, 42, 0.6)";
      for (let y = 0; y < height; y += 3) {
        ctx.fillRect(0, y, width, 1.2);
      }

      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Mysterious Testnet Node Lattice
      const nodes = [
        { u: 0.15, v: 0.5 },
        { u: 0.35, v: 0.25 },
        { u: 0.35, v: 0.75 },
        { u: 0.5, v: 0.5 },
        { u: 0.65, v: 0.25 },
        { u: 0.65, v: 0.75 },
        { u: 0.85, v: 0.5 },
      ];

      const edges: Array<[{ u: number; v: number }, { u: number; v: number }]> =
        [
          [nodes[0], nodes[1]],
          [nodes[0], nodes[2]],
          [nodes[0], nodes[3]],
          [nodes[1], nodes[3]],
          [nodes[2], nodes[3]],
          [nodes[1], nodes[4]],
          [nodes[2], nodes[5]],
          [nodes[3], nodes[4]],
          [nodes[3], nodes[5]],
          [nodes[4], nodes[6]],
          [nodes[5], nodes[6]],
          [nodes[3], nodes[6]],
        ];

      const distToSegment = (
        px: number,
        py: number,
        ax: number,
        ay: number,
        bx: number,
        by: number,
      ) => {
        const dx = bx - ax;
        const dy = by - ay;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.hypot(px - ax, py - ay);
        const t = Math.max(
          0,
          Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq),
        );
        const projX = ax + t * dx;
        const projY = ay + t * dy;
        return Math.hypot(px - projX, py - projY);
      };

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = (c + 0.5) * cellW;
          const y = (r + 0.5) * cellH;

          const u = c / (cols - 1);
          const v = r / (rows - 1);

          let intensity = 0;
          let isCoreNode = false;

          // Check lattice interconnects
          for (const [n1, n2] of edges) {
            const dLine = distToSegment(u, v, n1.u, n1.v, n2.u, n2.v);
            if (dLine < 0.018) {
              intensity = Math.max(intensity, 0.7);
            } else if (dLine < 0.04) {
              intensity = Math.max(intensity, 0.35);
            }
          }

          // Check nodes
          for (const node of nodes) {
            const distNode = Math.hypot((u - node.u) * 1.5, v - node.v);
            if (distNode < 0.04) {
              intensity = 1.0;
              isCoreNode = true;
            } else if (distNode < 0.09) {
              intensity = Math.max(intensity, 0.85);
            } else if (distNode < 0.14) {
              intensity = Math.max(intensity, 0.3);
            }
          }

          // Ambient mystery pulses
          const pulse = Math.sin(u * 14 + v * 10) * Math.cos(u * 8 - v * 12);
          if (pulse > 0.65) {
            intensity = Math.max(intensity, 0.25);
          }

          if (intensity > 0.08) {
            let char: string;
            if (isCoreNode) {
              char = "@";
            } else {
              const charIdx = Math.floor(intensity * (glyphs.length - 1));
              char = glyphs[charIdx];
            }

            if (intensity > 0.85) {
              ctx.fillStyle = "#ffffff";
            } else if (intensity > 0.55) {
              ctx.fillStyle = "#17A2C6";
            } else if (intensity > 0.3) {
              ctx.fillStyle = "#127d99";
            } else {
              ctx.fillStyle = "#0c4554";
            }

            ctx.fillText(char, x, y);
          }
        }
      }
    };

    draw();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full object-cover select-none"
    />
  );
}

// --- ASCII Graphic 3: Cryptographic DID / Signature Stream ---
function AsciiDidFaceCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 400;
    const height = 260;
    canvas.width = width;
    canvas.height = height;

    const cols = 60;
    const rows = 36;
    const cellW = width / cols;
    const cellH = height / rows;

    const didStream =
      "flop:net:z6MkuTq3YhF7VpW8r2NxL9dK1eJ5bC4mFLOP_TESTNET_PROOF_0x9a8f2e1d7c3b4a5e6f8d9b0c";

    const draw = () => {
      ctx.fillStyle = "#06131c";
      ctx.fillRect(0, 0, width, height);

      // Horizontal Scanlines
      ctx.fillStyle = "rgba(10, 30, 42, 0.6)";
      for (let y = 0; y < height; y += 3) {
        ctx.fillRect(0, y, width, 1.2);
      }

      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      let streamIndex = 0;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = (c + 0.5) * cellW;
          const y = (r + 0.5) * cellH;

          const nx = (c / (cols - 1) - 0.5) * 2.2;
          const ny = (r / (rows - 1) - 0.5) * 2.2;

          const headDist = Math.hypot(nx, ny * 0.9);
          let intensity = 0;

          if (headDist < 0.72) {
            intensity = 0.45;

            if (Math.hypot(nx + 0.18, ny + 0.18) < 0.12) {
              intensity = 0.9;
            }
            if (nx > -0.05 && nx < 0.15 && ny > -0.1 && ny < 0.25) {
              intensity = 0.75;
            }
            if (ny < -0.15 && Math.abs(nx) < 0.45) {
              intensity = 0.65;
            }
            if (Math.hypot(nx - 0.15, ny - 0.05) < 0.2) {
              intensity = 0.8;
            }
            if (Math.abs(nx - 0.02) < 0.18 && Math.abs(ny - 0.38) < 0.06) {
              intensity = 0.85;
            }
          } else {
            intensity = 0.04;
          }

          const char = didStream[streamIndex % didStream.length];
          streamIndex++;

          if (intensity > 0.08) {
            if (intensity > 0.8) {
              ctx.fillStyle = "#ffffff";
            } else if (intensity > 0.6) {
              ctx.fillStyle = "#17A2C6";
            } else if (intensity > 0.35) {
              ctx.fillStyle = "#127d99";
            } else {
              ctx.fillStyle = "#0c4554";
            }

            ctx.fillText(char, x, y);
          }
        }
      }
    };

    draw();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full object-cover select-none"
    />
  );
}

export default function HowItWorksSection() {
  const [triggered, setTriggered] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !triggered) {
          setTriggered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18 },
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [triggered]);

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="relative w-full bg-[#08090c] py-16 sm:py-24 md:py-36 px-4 sm:px-8 md:px-16 lg:px-20 select-none scroll-mt-6"
    >
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        {/* Centered Small-Caps Kicker Heading */}
        <div className="text-center mb-10 sm:mb-14 md:mb-18">
          <h2 className="text-sm sm:text-base font-medium text-[#17A2C6] [font-variant:small-caps] tracking-widest antialiased">
            how it works?
          </h2>
        </div>

        {/* 3 Horizontally Stacked Cards with Single-Run Scroll Decrypt Badges */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-10 xl:gap-12 items-stretch">
          {/* --- CARD 1: WATCHES X CONTENT --- */}
          <div className="bg-[#0e0f14] rounded-2xl p-4 sm:p-6 flex flex-col">
            {/* Top Graphic Box */}
            <div className="w-full aspect-[16/10] rounded-xl overflow-hidden bg-[#06131c] relative mb-6">
              <AsciiEyeCanvas />
              {/* Scanline Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e0f14] via-transparent to-transparent opacity-60 pointer-events-none" />
            </div>

            {/* Headline */}
            <h3 className="text-sm sm:text-[15px] font-semibold text-white uppercase tracking-wider leading-snug">
              CAPTURES X ACTIVITY. MISSES NOTHING.
            </h3>

            {/* Description */}
            <p className="text-xs text-[#8e98a8] uppercase tracking-wide leading-relaxed mt-2.5 mb-7">
              agentK listens to your public X posts, threads, and breakdowns the
              moment they go live.
            </p>

            {/* Feature Badges with Single-Run Scroll Decrypt Animation */}
            <div className="flex flex-col gap-2 items-start mt-auto">
              <DecryptBadge
                text="REAL-TIME POST DETECTION."
                isTriggered={triggered}
                delay={0}
              />
              <DecryptBadge
                text="AUTOMATIC SIGNAL FILTER."
                isTriggered={triggered}
                delay={90}
              />
              <DecryptBadge
                text="ZERO MANUAL SUBMISSION."
                isTriggered={triggered}
                delay={180}
              />
            </div>
          </div>

          {/* --- CARD 2: FLOP TESTNET (INTENTIONALLY VAGUE & HYPE-DRIVEN) --- */}
          <div className="bg-[#0e0f14] rounded-2xl p-5 sm:p-6 flex flex-col">
            {/* Top Graphic Box */}
            <div className="w-full aspect-[16/10] rounded-xl overflow-hidden bg-[#06131c] relative mb-6">
              <AsciiFlopTestnetCanvas />
              {/* Scanline Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e0f14] via-transparent to-transparent opacity-60 pointer-events-none" />
            </div>

            {/* Headline */}
            <h3 className="text-sm sm:text-[15px] font-semibold text-white uppercase tracking-wider leading-snug">
              COOKING FOR FLOP TESTNET.
            </h3>

            {/* Description */}
            <p className="text-xs text-[#8e98a8] uppercase tracking-wide leading-relaxed mt-2.5 mb-7">
              an autonomous testnet pipeline is being forged. your agent will
              contribute to Flop Network silently in the background.
            </p>

            {/* Feature Badges with Single-Run Scroll Decrypt Animation */}
            <div className="flex flex-col gap-2 items-start mt-auto">
              <DecryptBadge
                text="SOMETHING IS COOKING."
                isTriggered={triggered}
                delay={100}
              />
              <DecryptBadge
                text="AUTONOMOUS PARTICIPATION."
                isTriggered={triggered}
                delay={190}
              />
              <DecryptBadge
                text="EARLY TESTNET WEIGHT."
                isTriggered={triggered}
                delay={280}
              />
            </div>
          </div>

          {/* --- CARD 3: SIGNS & PUSHES TO FLOP NETWORK --- */}
          <div className="bg-[#0e0f14] rounded-2xl p-5 sm:p-6 flex flex-col">
            {/* Top Graphic Box */}
            <div className="w-full aspect-[16/10] rounded-xl overflow-hidden bg-[#06131c] relative mb-6">
              <AsciiDidFaceCanvas />
              {/* Scanline Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e0f14] via-transparent to-transparent opacity-60 pointer-events-none" />
            </div>

            {/* Headline */}
            <h3 className="text-sm sm:text-[15px] font-semibold text-white uppercase tracking-wider leading-snug">
              SIGNS & PUSHES TO FLOP NETWORK.
            </h3>

            {/* Description */}
            <p className="text-xs text-[#8e98a8] uppercase tracking-wide leading-relaxed mt-2.5 mb-7">
              every contribution is sealed with your master DID and permanently
              pushed to the Flop Network.
            </p>

            {/* Feature Badges with Single-Run Scroll Decrypt Animation */}
            <div className="flex flex-col gap-2 items-start mt-auto">
              <DecryptBadge
                text="ED25519 SIGNED."
                isTriggered={triggered}
                delay={200}
              />
              <DecryptBadge
                text="DIRECT FLOP NETWORK PUSH."
                isTriggered={triggered}
                delay={290}
              />
              <DecryptBadge
                text="IMMUTABLE PROOF."
                isTriggered={triggered}
                delay={380}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
