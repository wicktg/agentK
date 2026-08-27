"use client";

import { useMemo, useState } from "react";

interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function GithubContributions() {
  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  // Generate deterministic heatmap data for 52 weeks (7 rows x 52 columns)
  const { weeks, totalContributions } = useMemo(() => {
    let total = 0;
    const generatedWeeks: ContributionDay[][] = [];
    const startDate = new Date(2026, 0, 1); // Jan 1, 2026

    for (let w = 0; w < 52; w++) {
      const week: ContributionDay[] = [];
      for (let d = 0; d < 7; d++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + (w * 7 + d));

        // Pseudo-random realistic contribution frequency pattern
        const seed = Math.sin((w * 7 + d) * 12.9898 + 43.12) * 43758.5453;
        const rand = seed - Math.floor(seed);

        let count = 0;
        let level: 0 | 1 | 2 | 3 | 4 = 0;

        if (rand > 0.4) {
          if (rand > 0.88) {
            count = Math.floor(rand * 15) + 8; // 8-22 commits
            level = 4;
          } else if (rand > 0.72) {
            count = Math.floor(rand * 8) + 4; // 4-7 commits
            level = 3;
          } else if (rand > 0.55) {
            count = Math.floor(rand * 4) + 2; // 2-3 commits
            level = 2;
          } else {
            count = 1;
            level = 1;
          }
        }

        total += count;

        const dateStr = currentDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        week.push({
          date: dateStr,
          count,
          level,
        });
      }
      generatedWeeks.push(week);
    }

    return { weeks: generatedWeeks, totalContributions: total };
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center select-none py-4 px-2 sm:px-4">
      {/* Kicker / Title matching Reference Screenshot */}
      <div className="w-full flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-white tracking-[-0.01em]">
            Code Contributions
          </h2>
          <p className="text-xs text-[#788290] font-mono mt-0.5">
            {totalContributions.toLocaleString()} proven contributions in 2026
          </p>
        </div>
      </div>

      {/* Main Heatmap Card Container */}
      <div className="w-full bg-[#08090c] border border-white/[0.08] rounded-2xl p-5 sm:p-7 overflow-hidden relative">
        {/* Month Labels along top */}
        <div className="flex justify-between pl-8 sm:pl-10 pr-2 mb-2.5 text-[11px] font-mono text-[#788290]">
          {MONTHS.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>

        {/* Heatmap Grid Row & Columns */}
        <div className="flex items-start gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {/* Day of Week Labels (Mon-Sun) */}
          <div className="flex flex-col justify-between h-[126px] py-[2px] shrink-0 text-[10px] font-mono text-[#788290] leading-none">
            {DAYS_OF_WEEK.map((day) => (
              <span key={day} className="h-3 flex items-center">
                {day}
              </span>
            ))}
          </div>

          {/* 52-Week Grid Matrix */}
          <div className="flex gap-1 sm:gap-1.5 flex-1 min-w-[680px]">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1 sm:gap-1.5 flex-1">
                {week.map((day, dIdx) => {
                  let bgClass = "bg-white/[0.04] border border-white/[0.04]";
                  if (day.level === 1) {
                    bgClass = "bg-[#17A2C6]/25 border border-[#17A2C6]/30";
                  } else if (day.level === 2) {
                    bgClass = "bg-[#17A2C6]/50 border border-[#17A2C6]/50";
                  } else if (day.level === 3) {
                    bgClass = "bg-[#17A2C6]/80 border border-[#17A2C6]/80";
                  } else if (day.level === 4) {
                    bgClass =
                      "bg-[#57cee9] border border-white/60 shadow-[0_0_8px_rgba(23,162,198,0.4)]";
                  }

                  return (
                    <div
                      key={dIdx}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredDay({
                          date: day.date,
                          count: day.count,
                          x: rect.left + rect.width / 2,
                          y: rect.top - 8,
                        });
                      }}
                      onMouseLeave={() => setHoveredDay(null)}
                      className={`w-full aspect-square rounded-[3px] sm:rounded-[3.5px] transition-all duration-100 hover:scale-125 hover:z-20 cursor-pointer ${bgClass}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Card Footer matching Reference */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 mt-4 border-t border-white/[0.06] text-xs">
          {/* Learn Link */}
          <button
            type="button"
            className="text-[#17A2C6] hover:text-[#57cee9] transition-colors cursor-pointer text-xs font-normal"
          >
            Learn how we count contributions
          </button>

          {/* Less -> More Legend */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#788290]">
            <span>Less</span>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-white/[0.04] border border-white/[0.04]" />
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#17A2C6]/25 border border-[#17A2C6]/30" />
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#17A2C6]/50 border border-[#17A2C6]/50" />
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#17A2C6]/80 border border-[#17A2C6]/80" />
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#57cee9] border border-white/60" />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Floating Monospace Hover Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full px-3 py-1.5 rounded-lg bg-[#0c0d12] border border-white/[0.12] shadow-2xl text-[11px] font-mono text-white flex flex-col items-center gap-0.5 whitespace-nowrap"
          style={{ left: hoveredDay.x, top: hoveredDay.y }}
        >
          <span className="font-semibold text-[#17A2C6]">
            {hoveredDay.count === 0
              ? "No contributions"
              : `${hoveredDay.count} contribution${hoveredDay.count > 1 ? "s" : ""}`}
          </span>
          <span className="text-[#8e98a8] text-[10px]">{hoveredDay.date}</span>
        </div>
      )}
    </div>
  );
}
