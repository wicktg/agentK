"use client";

import { useEffect, useRef } from "react";

// Exact #17A2C6 brand color palette with clean white highlights
const PALETTE = [
  "#17A2C6",
  "#17A2C6",
  "#17A2C6",
  "#17A2C6",
  "#17A2C6",
  "#17A2C6",
  "#17A2C6",
  "#ffffff", // crisp white highlight
  "#ffffff",
  "#d6f3fa", // soft tint
  "#57cee9", // bright cyan
];

// ASCII glyph sets
const SQUARE_ASCII_GLYPHS = [
  "#",
  "%",
  "@",
  "8",
  "&",
  "M",
  "W",
  "X",
  "0",
  "1",
  "█",
  "■",
  "H",
  "K",
];
const CIRCLE_ASCII_GLYPHS = [
  "@",
  "0",
  "O",
  "Q",
  "o",
  "Ø",
  "©",
  "●",
  "•",
  "*",
  "(",
  ")",
  "C",
  "D",
];
const BACKGROUND_ASCII_GLYPHS = [".", "·", ":", "+", "-", "°", "`", ","];
const CIPHER_SCRAMBLE_GLYPHS = [
  "0",
  "1",
  "!",
  "@",
  "#",
  "$",
  "%",
  "^",
  "&",
  "*",
  "<",
  ">",
  "~",
  "=",
  "+",
  "-",
  "/",
  "?",
];

export default function GridCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const startTime = performance.now();
    const DURATION = 1000; // Exact 1 second intro animation

    const render = (progress = 1.0) => {
      const dpr = window.devicePixelRatio || 1;
      const parent = canvas.parentElement;
      const width = parent ? parent.clientWidth : window.innerWidth;
      const height = parent ? parent.clientHeight : window.innerHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = "#08090c";
      ctx.fillRect(0, 0, width, height);

      // Pitch calibrated for monospace ASCII character aspect ratio
      const pitchX = Math.max(14, Math.min(18, Math.floor(width / 72)));
      const pitchY = Math.max(16, Math.min(22, Math.floor(pitchX * 1.25)));

      const cols = Math.ceil(width / pitchX) + 1;
      const rows = Math.ceil(height / pitchY) + 1;

      const offsetX = (width % pitchX) / 2;
      const offsetY = (height % pitchY) / 2;

      ctx.font = `bold ${Math.floor(pitchX * 0.95)}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const isMobile = width < 768;
      // On mobile screens, slightly offset the pattern to keep clean clearance below hero text
      const mobileTopCut = isMobile ? 0.08 : 0.0;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = offsetX + c * pitchX;
          const cy = offsetY + r * pitchY;

          const u = c / (cols - 1); // 0 (left) to 1 (right)
          const v = r / (rows - 1); // 0 (top) to 1 (bottom)

          let isLeftSquare = false;
          let isRightCircle = false;

          // Boundary curve for left cluster
          const leftBound =
            0.36 + mobileTopCut + u * 1.28 + Math.sin(u * 12) * 0.04;

          const seedL = Math.sin(c * 19.3 + r * 71.7) * 43758.5453;
          const noiseL = seedL - Math.floor(seedL);

          if (u < 0.52) {
            if (v >= leftBound) {
              isLeftSquare = true;
            } else if (v >= leftBound - 0.08 && noiseL > 0.45) {
              isLeftSquare = true;
            } else if (v >= leftBound - 0.14 && noiseL > 0.85) {
              isLeftSquare = true;
            }
          }

          // Boundary curve for right cluster
          const uRight = 1.0 - u;
          const rightBound =
            0.42 + mobileTopCut + uRight * 1.15 + Math.sin(uRight * 10) * 0.035;

          const seedR = Math.sin(c * 23.7 + r * 53.1) * 31415.9265;
          const noiseR = seedR - Math.floor(seedR);

          if (u >= 0.48) {
            if (v >= rightBound) {
              isRightCircle = true;
            } else if (v >= rightBound - 0.07 && noiseR > 0.48) {
              isRightCircle = true;
            } else if (v >= rightBound - 0.13 && noiseR > 0.88) {
              isRightCircle = true;
            }
          }

          // Specific floating satellite (only on desktop)
          if (
            !isMobile &&
            Math.abs(u - 0.78) < 0.025 &&
            Math.abs(v - 0.64) < 0.03
          ) {
            isRightCircle = true;
          }

          // Smooth junction near bottom center
          if (isLeftSquare && isRightCircle) {
            if (u < 0.5) isRightCircle = false;
            else isLeftSquare = false;
          }

          // Keep safe clearance on mobile so pattern never overlaps hero text
          if (isMobile && v < 0.43) {
            isLeftSquare = false;
            isRightCircle = false;
          }

          // Check if this pattern cell is currently scrambling or resolved
          const cellUnlockTime =
            0.15 + (1 - v) * 0.55 + (isLeftSquare ? noiseL : noiseR) * 0.3;
          const isDecrypted = progress >= 1.0 || progress >= cellUnlockTime;

          // Progressive smooth fade from the bottom on the characters
          const bottomFade =
            v > 0.6 ? Math.max(0, 1 - Math.pow((v - 0.6) / 0.4, 1.2)) : 1.0;

          // Smooth fade in near the threshold on mobile for the blue/white cluster
          const topFade =
            isMobile && v >= 0.43 && v < 0.49
              ? Math.max(0, Math.min(1.0, (v - 0.43) / 0.06))
              : 1.0;

          const heroPatternAlpha = bottomFade * topFade;

          if (isLeftSquare) {
            ctx.globalAlpha = heroPatternAlpha;
            const colorIndex = Math.floor(noiseL * PALETTE.length);
            ctx.fillStyle = PALETTE[colorIndex];

            if (isDecrypted) {
              const glyphIndex = Math.floor(
                noiseL * SQUARE_ASCII_GLYPHS.length,
              );
              ctx.fillText(SQUARE_ASCII_GLYPHS[glyphIndex], cx, cy);
            } else {
              // Rapid cipher scramble during 1s intro
              const randomGlyph =
                CIPHER_SCRAMBLE_GLYPHS[
                  Math.floor(Math.random() * CIPHER_SCRAMBLE_GLYPHS.length)
                ];
              ctx.fillText(randomGlyph, cx, cy);
            }
            ctx.globalAlpha = 1.0;
          } else if (isRightCircle) {
            ctx.globalAlpha = heroPatternAlpha;
            const colorIndex = Math.floor(noiseR * PALETTE.length);
            ctx.fillStyle = PALETTE[colorIndex];

            if (isDecrypted) {
              const glyphIndex = Math.floor(
                noiseR * CIRCLE_ASCII_GLYPHS.length,
              );
              ctx.fillText(CIRCLE_ASCII_GLYPHS[glyphIndex], cx, cy);
            } else {
              // Rapid cipher scramble during 1s intro
              const randomGlyph =
                CIPHER_SCRAMBLE_GLYPHS[
                  Math.floor(Math.random() * CIPHER_SCRAMBLE_GLYPHS.length)
                ];
              ctx.fillText(randomGlyph, cx, cy);
            }
            ctx.globalAlpha = 1.0;
          } else {
            // Full ambient background ASCII matrix (always rendered across entire canvas)
            const seedB = Math.sin(c * 13.1 + r * 37.9) * 10000;
            const noiseB = seedB - Math.floor(seedB);
            const bgGlyph =
              BACKGROUND_ASCII_GLYPHS[
                Math.floor(noiseB * BACKGROUND_ASCII_GLYPHS.length)
              ];

            ctx.globalAlpha = 1.0;
            ctx.fillStyle = "rgba(255, 255, 255, 0.01)";
            ctx.fillText(bgGlyph, cx, cy);
          }
        }
      }
    };

    // 1-second cryptographic decode animation loop on mount
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / DURATION);

      render(progress);

      if (progress < 1.0) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    animationFrameId = requestAnimationFrame(tick);

    const handleResize = () => {
      render(1.0);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      style={{ zIndex: 0 }}
    />
  );
}
