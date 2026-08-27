"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export interface PostItem {
  id: string;
  day: number;
  month: number;
  year: number;
  time: string;
  text: string;
  likes: number;
  comments: number;
  url?: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS_OF_WEEK = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export default function XScheduler() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [previewPost, setPreviewPost] = useState<PostItem | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const now = new Date();
  const todayDate = now.getDate();
  const todayMonth = now.getMonth();
  const todayYear = now.getFullYear();

  // Fetch real verified posts from backend API / Supabase
  useEffect(() => {
    async function loadRealPosts() {
      try {
        const res = await fetch("/api/x/posts", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.posts)) {
            const mapped: PostItem[] = data.posts.map((p: any) => {
              const d = new Date(p.scheduled_for || p.created_at);
              return {
                id: p.id,
                day: d.getDate(),
                month: d.getMonth(),
                year: d.getFullYear(),
                time: p.time_label || "12:00 PM",
                text: p.text,
                likes: p.likes_count || 0,
                comments: p.comments_count || 0,
                url: p.url,
              };
            });
            setPosts(mapped);
          }
        }
      } catch (err) {
        console.warn("Could not load posts:", err);
      }
    }

    loadRealPosts();
  }, [user]);

  // Calendar matrix calculation (Monday-first)
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date(todayYear, todayMonth, 1));
  };

  // Build grid calendar cells (5 rows x 7 cols = 35 cells)
  const calendarCells = [];

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarCells.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      isNextMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= totalDaysInMonth; d++) {
    calendarCells.push({
      day: d,
      isCurrentMonth: true,
      isNextMonth: false,
    });
  }

  // Next month leading days to complete grid
  const remainingCells = 35 - calendarCells.length;
  for (
    let n = 1;
    n <= (remainingCells > 0 ? remainingCells : 42 - calendarCells.length);
    n++
  ) {
    calendarCells.push({
      day: n,
      isCurrentMonth: false,
      isNextMonth: true,
    });
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center select-none py-1 sm:py-2 px-1 sm:px-4">
      {/* Top Toolbar */}
      <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 sm:mb-5 pb-3 sm:pb-4 border-b border-white/[0.06]">
        {/* Left Side: Month / Year Title & Controls */}
        <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] sm:text-xs font-mono font-medium text-[#d2d9e4] border border-white/[0.08] transition-colors cursor-pointer"
            >
              Today
            </button>

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-white/[0.06] text-[#8e98a8] hover:text-white transition-colors cursor-pointer"
                aria-label="Previous Month"
              >
                <svg
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-white/[0.06] text-[#8e98a8] hover:text-white transition-colors cursor-pointer"
                aria-label="Next Month"
              >
                <svg
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>

          <h2 className="text-sm sm:text-base md:text-lg font-semibold text-white tracking-[-0.01em]">
            {MONTH_NAMES[month]} {year}
          </h2>
        </div>

        {/* Right Side: Week | Month View Toggle */}
        <div className="flex items-center justify-end">
          <div className="flex items-center bg-[#050608] p-0.5 sm:p-1 rounded-xl border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                viewMode === "week"
                  ? "bg-white/[0.1] text-white shadow-sm font-semibold"
                  : "text-[#8e98a8] hover:text-white"
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                viewMode === "month"
                  ? "bg-white/[0.1] text-white shadow-sm font-semibold"
                  : "text-[#8e98a8] hover:text-white"
              }`}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Main Calendar Card Structure */}
      <div className="w-full bg-[#08090c] border border-white/[0.08] rounded-xl sm:rounded-2xl overflow-hidden shadow-lg">
        {/* Days of Week Header Row (MON - SUN) */}
        <div className="grid grid-cols-7 border-b border-white/[0.06] bg-[#08090c]">
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className="py-2 sm:py-3 text-center text-[9px] sm:text-[11px] font-mono font-medium text-[#788290] tracking-wider border-r last:border-r-0 border-white/[0.04]"
            >
              {day}
            </div>
          ))}
        </div>

        {/* 5-Week Calendar Grid (Month View) */}
        {viewMode === "month" ? (
          <div className="grid grid-cols-7 auto-rows-fr">
            {calendarCells.map((cell, idx) => {
              const dayPosts = cell.isCurrentMonth
                ? posts.filter(
                    (p) =>
                      p.day === cell.day &&
                      p.month === month &&
                      p.year === year,
                  )
                : [];

              const isToday =
                cell.isCurrentMonth &&
                cell.day === todayDate &&
                month === todayMonth &&
                year === todayYear;

              return (
                <div
                  key={idx}
                  className={`min-h-[85px] sm:min-h-[120px] md:min-h-[135px] p-1 sm:p-2 md:p-2.5 border-b border-r last:border-r-0 border-white/[0.04] flex flex-col justify-between bg-[#08090c] ${
                    cell.isCurrentMonth ? "text-white" : "text-white/20"
                  }`}
                >
                  {/* Top Day Number */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[10px] sm:text-xs font-mono font-semibold ${
                        cell.isCurrentMonth
                          ? isToday
                            ? "w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#17A2C6] text-[#061d24] flex items-center justify-center font-bold text-[9.5px] sm:text-[11px]"
                            : "text-[#8e98a8]"
                          : "text-white/20"
                      }`}
                    >
                      {cell.day}
                    </span>
                  </div>

                  {/* Captured X Posts Container */}
                  <div className="flex flex-col gap-1 sm:gap-1.5 mt-auto">
                    {dayPosts.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => setPreviewPost(post)}
                        className="bg-white text-black rounded-[5px] sm:rounded-[8px] p-1 sm:p-2 flex flex-col gap-1 shadow-sm hover:scale-[1.02] transition-transform cursor-pointer"
                      >
                        {/* Top: Solid Black X Logo & Time */}
                        <div className="flex items-center justify-between">
                          <svg
                            className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 fill-black shrink-0"
                            viewBox="0 0 24 24"
                          >
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                          <span className="font-mono text-[7.5px] sm:text-[9px] font-medium text-neutral-500">
                            {post.time}
                          </span>
                        </div>

                        {/* Post Text snippet */}
                        <p className="text-[8.5px] sm:text-[10px] font-sans font-medium text-neutral-900 line-clamp-2 leading-snug">
                          {post.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Week View */
          <div className="grid grid-cols-7 min-h-[300px] sm:min-h-[360px]">
            {DAYS_OF_WEEK.map((dayName, dIdx) => (
              <div
                key={dayName}
                className="p-2 sm:p-3 bg-[#08090c] border-r last:border-r-0 border-white/[0.04] flex flex-col justify-start"
              >
                <div className="text-center pb-2 sm:pb-3 border-b border-white/[0.04] mb-2 sm:mb-3">
                  <span className="text-[10px] sm:text-xs font-mono text-[#8e98a8]">
                    {dIdx + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Post Preview Modal */}
      {previewPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setPreviewPost(null)}
          />
          <div className="relative w-full max-w-md bg-[#0c0d12] border border-white/[0.1] rounded-2xl p-5 sm:p-6 shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#8e98a8]">
                  X Contribution
                </span>
              </div>
              <span className="text-xs font-mono text-[#17A2C6]">
                {previewPost.time}
              </span>
            </div>

            <p className="text-sm text-white leading-relaxed mb-6 font-sans">
              {previewPost.text}
            </p>

            <button
              type="button"
              onClick={() => setPreviewPost(null)}
              className="w-full py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
