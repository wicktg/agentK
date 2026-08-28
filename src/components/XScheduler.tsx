"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

interface TechnocorePayload {
  did: string;
  sig: string;
  nonce: string;
  text: string;
}

interface PostItem {
  id: string;
  day: number;
  month: number;
  year: number;
  time: string;
  text: string;
  likes: number;
  comments: number;
  author?: string;
  seq?: number | string;
  tweet_type?: "post" | "article" | "thread";
  url?: string;
  technocore_room?: string;
  technocore_url?: string;
  technocore_title?: string;
  technocore_payload?: TechnocorePayload;
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
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [previewPost, setPreviewPost] = useState<PostItem | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const now = new Date();
  const todayDate = now.getDate();
  const todayMonth = now.getMonth();
  const todayYear = now.getFullYear();

  // Fetch verified accepted posts with stored Technocore proofs from Supabase & Technocore API
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
                author: p.author || "0x_aleph",
                seq: p.seq !== undefined ? p.seq : p.technocore_payload?.seq,
                tweet_type: p.tweet_type || "post",
                url: p.tweet_url,
                technocore_room: p.technocore_room,
                technocore_url: p.technocore_url,
                technocore_title: p.technocore_title,
                technocore_payload: p.technocore_payload,
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

  // Calendar matrix calculation for Month View (Monday-first, 42 cells)
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const calendarCells: {
    day: number;
    month: number;
    year: number;
    isCurrentMonth: boolean;
  }[] = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarCells.push({
      day: prevMonthDays - i,
      month: month === 0 ? 11 : month - 1,
      year: month === 0 ? year - 1 : year,
      isCurrentMonth: false,
    });
  }

  for (let d = 1; d <= totalDaysInMonth; d++) {
    calendarCells.push({
      day: d,
      month,
      year,
      isCurrentMonth: true,
    });
  }

  const remaining = 42 - calendarCells.length;
  for (let d = 1; d <= remaining; d++) {
    calendarCells.push({
      day: d,
      month: month === 11 ? 0 : month + 1,
      year: month === 11 ? year + 1 : year,
      isCurrentMonth: false,
    });
  }

  // Navigation handlers (Monthly only)
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date(todayYear, todayMonth, 1));
  };

  const handleCopyPayload = () => {
    if (!previewPost?.technocore_payload) return;
    navigator.clipboard.writeText(
      JSON.stringify(previewPost.technocore_payload, null, 2),
    );
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-3 select-none">
      {/* Top Controls Toolbar (Minimal Month Navigator) */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-0.5 bg-[#12131a] p-1 rounded-xl border border-white/[0.06]">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 sm:p-1.5 rounded-lg hover:bg-white/[0.08] text-[#8e98a8] hover:text-white transition-colors cursor-pointer"
              title="Previous Month"
            >
              <svg
                className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 sm:p-1.5 rounded-lg hover:bg-white/[0.08] text-[#8e98a8] hover:text-white transition-colors cursor-pointer"
              title="Next Month"
            >
              <svg
                className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          <h2 className="text-sm sm:text-base font-semibold tracking-tight text-white ml-1 font-sans">
            {MONTH_NAMES[month]} {year}
          </h2>
        </div>
      </div>

      {/* Main Minimalist Monthly Calendar */}
      <div className="w-full bg-[#08090c] border border-white/[0.07] rounded-2xl overflow-hidden shadow-2xl">
        {/* Days of Week Header Row (MON - SUN) */}
        <div className="grid grid-cols-7 border-b border-white/[0.05] bg-[#08090c] text-center">
          {DAYS_OF_WEEK.map((dayName) => (
            <div
              key={dayName}
              className="py-2.5 text-[10px] sm:text-[10.5px] font-mono font-medium text-[#788290] tracking-wider border-r last:border-r-0 border-white/[0.03]"
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Month View Grid (6 Rows x 7 Cols = 42 Cells) */}
        <div className="grid grid-cols-7 auto-rows-fr">
          {calendarCells.map((cell, idx) => {
            const dayPosts = cell.isCurrentMonth
              ? posts.filter(
                  (p) =>
                    p.day === cell.day && p.month === month && p.year === year,
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
                className={`min-h-[85px] sm:min-h-[110px] md:min-h-[125px] p-1.5 sm:p-2 border-b border-r border-white/[0.03] [&:nth-child(7n)]:border-r-0 [&:nth-child(n+36)]:border-b-0 flex flex-col justify-start gap-1 bg-[#08090c] ${
                  cell.isCurrentMonth ? "text-white" : "text-white/15"
                }`}
              >
                {/* Top Day Number (Symmetrical clean height) */}
                <div className="flex items-center justify-between h-5 shrink-0">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-mono font-medium transition-colors ${
                      cell.isCurrentMonth
                        ? isToday
                          ? "bg-[#17A2C6] text-[#061d24] font-bold"
                          : "text-[#8e98a8]"
                        : "text-white/15"
                    }`}
                  >
                    {cell.day}
                  </span>
                </div>

                {/* Captured X Posts Container */}
                <div className="flex flex-col gap-1 w-full flex-1">
                  {dayPosts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => setPreviewPost(post)}
                      className="w-full bg-white text-black rounded-md sm:rounded-lg p-1.5 sm:p-2 flex flex-col justify-between gap-0.5 shadow-sm hover:scale-[1.02] transition-transform cursor-pointer min-h-[52px] sm:min-h-[58px]"
                    >
                      {/* Top: Solid Black X Logo & Time */}
                      <div className="flex items-center justify-between shrink-0">
                        <svg
                          className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-black shrink-0"
                          viewBox="0 0 24 24"
                        >
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        <span className="font-mono text-[7.5px] sm:text-[8.5px] font-medium text-neutral-500">
                          {post.time}
                        </span>
                      </div>

                      {/* Post Text snippet */}
                      <p className="text-[8.5px] sm:text-[9.5px] font-sans font-medium text-neutral-900 line-clamp-2 leading-tight">
                        {post.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stored Technocore Payload & Destination Modal */}
      {previewPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setPreviewPost(null)}
          />
          <div className="relative w-full max-w-xl bg-[#0c0d12] border border-white/[0.12] rounded-2xl p-5 sm:p-6 z-10 flex flex-col min-h-[460px] max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.08]">
              <span className="text-xs font-mono text-[#8e98a8]">
                At {previewPost.time}
              </span>
            </div>

            {/* Direct Destination Link CTA */}
            {previewPost.technocore_url && (
              <a
                href={previewPost.technocore_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full mb-4 py-2.5 px-4 rounded-xl bg-[#17A2C6] hover:bg-[#17A2C6]/90 text-[#061d24] font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <span>Open in Technocore x-contributions</span>
                <span className="font-mono text-sm">↗</span>
              </a>
            )}

            {/* Room Identifier Info */}
            <div className="flex flex-col gap-1 mb-4 bg-[#050608] border border-white/[0.06] rounded-xl p-3">
              <span className="text-[10px] font-mono text-[#687082] uppercase">
                Destination Lobby / Room
              </span>
              <span className="text-xs font-mono text-[#57cee9] font-medium break-all">
                {previewPost.technocore_room || "x-contributions"}
              </span>
            </div>

            {/* Cryptographic Stored Payload */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-[#8e98a8]">
                Stored Payload (RFC 8032 Canonical)
              </span>
              <button
                type="button"
                onClick={handleCopyPayload}
                className="text-[11px] font-mono text-[#17A2C6] hover:text-white transition-colors cursor-pointer"
              >
                {copiedPayload ? "✓ Copied!" : "Copy JSON"}
              </button>
            </div>

            <div className="bg-[#050608] border border-white/[0.08] rounded-xl p-3.5 mb-6 overflow-x-auto shadow-inner flex-1">
              <pre className="text-[11.5px] font-mono text-[#d6f3fa] leading-relaxed whitespace-pre-wrap break-all">
                {JSON.stringify(
                  previewPost.technocore_payload ?? {
                    did: "did:key:z6MkuV8...",
                    sig: "86-char-ed25519-signature...",
                    nonce: "1740681234000000000",
                    text: previewPost.text,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>

            {/* Actions */}
            <button
              type="button"
              onClick={() => setPreviewPost(null)}
              className="w-full py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white transition-colors cursor-pointer mt-auto"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
