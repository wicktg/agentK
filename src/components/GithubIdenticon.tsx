"use client";

import { useMemo } from "react";

// Generate a deterministic 5x5 symmetric matrix identicon
export default function GithubIdenticon({ size = 32 }: { size?: number }) {
  const { grid, color } = useMemo(() => {
    // Generate random seed or pattern
    const seed = Math.random();
    const colors = [
      "#17A2C6",
      "#57cee9",
      "#38bdf8",
      "#2dd4bf",
      "#818cf8",
      "#34d399",
    ];
    const chosenColor = colors[Math.floor(seed * colors.length)];

    // 5x5 symmetric grid (columns: 0=4, 1=3, 2=center)
    const pattern: boolean[][] = [];
    for (let r = 0; r < 5; r++) {
      const row: boolean[] = [];
      const c0 = Math.sin((r + 1) * 31.7 + seed * 100) > 0;
      const c1 = Math.sin((r + 1) * 19.3 + seed * 200) > 0;
      const c2 = Math.sin((r + 1) * 43.1 + seed * 300) > 0;
      row[0] = c0;
      row[1] = c1;
      row[2] = c2;
      row[3] = c1; // symmetric
      row[4] = c0; // symmetric
      pattern.push(row);
    }

    return { grid: pattern, color: chosenColor };
  }, []);

  const cellSize = size / 5;

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-[6px] overflow-hidden bg-[#0e131f] border border-white/[0.12] shrink-0 select-none shadow-sm flex items-center justify-center"
      title="User Profile"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect width={size} height={size} fill="#0e131f" />
        {grid.map((row, r) =>
          row.map((filled, c) =>
            filled ? (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize}
                height={cellSize}
                fill={color}
              />
            ) : null,
          ),
        )}
      </svg>
    </div>
  );
}
