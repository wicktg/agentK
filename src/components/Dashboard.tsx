"use client";

import { useState, useRef, useEffect } from "react";
import AsciiLogo from "./AsciiLogo";
import GithubIdenticon from "./GithubIdenticon";
import XScheduler from "./XScheduler";
import SettingsSection from "./SettingsSection";
import TestnetSection from "./TestnetSection";
import { useAuth } from "@/context/AuthContext";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"X" | "Testnet" | "Settings">("X");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();

  // Close dropdown on click outside or ESC key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    }

    if (profileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileMenuOpen]);

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await logout();
  };

  return (
    <div className="min-h-screen w-full bg-[#08090c] text-white flex flex-col justify-between select-none">
      {/* Dashboard Top Header */}
      <header className="w-full relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-14 pt-5 sm:pt-7 pb-3 sm:pb-4 flex items-center justify-between gap-2">
          {/* Left Side: Brand Logo */}
          <div className="flex-1 flex items-center justify-start shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("X")}
              className="cursor-pointer focus:outline-none"
            >
              <AsciiLogo size="md" />
            </button>
          </div>

          {/* Center: Navigation (X, Testnet, Settings) */}
          <div className="flex items-center justify-center">
            <nav className="flex items-center gap-4 sm:gap-8 bg-white/[0.03] sm:bg-transparent px-3 py-1 sm:p-0 rounded-full sm:rounded-none border border-white/[0.06] sm:border-0">
              {(["X", "Testnet", "Settings"] as const).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`text-xs sm:text-sm font-medium transition-colors duration-150 cursor-pointer py-1 px-1.5 sm:p-0 ${
                      isActive
                        ? "text-white font-semibold"
                        : "text-[#8e98a8] hover:text-white"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Far Right: User's Profile Picture with minimal single-option Logout dropdown */}
          <div
            className="flex-1 flex items-center justify-end shrink-0 relative"
            ref={dropdownRef}
          >
            <button
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-[#17A2C6]/40 cursor-pointer"
              aria-expanded={profileMenuOpen}
              aria-label="User profile menu"
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.handle || "Profile"}
                  className="w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] rounded-full object-cover border border-white/[0.15] hover:border-[#17A2C6] transition-colors"
                />
              ) : (
                <div className="w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] rounded-full bg-white/[0.08] border border-white/[0.15] hover:border-[#17A2C6] flex items-center justify-center">
                  <GithubIdenticon size={26} />
                </div>
              )}
            </button>

            {/* Minimal Dropdown Menu (Contains ONLY ONE Option: "Logout") */}
            {profileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-36 bg-[#0c0d12] border border-white/[0.12] rounded-xl shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-150 select-none">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer text-left"
                >
                  <svg
                    className="w-3.5 h-3.5 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full flex items-center justify-center px-2 sm:px-6 md:px-8 py-4 sm:py-6">
        {activeTab === "X" ? (
          <XScheduler />
        ) : activeTab === "Testnet" ? (
          <TestnetSection />
        ) : (
          <SettingsSection />
        )}
      </main>

      {/* Bottom spacer to balance viewport */}
      <footer className="w-full py-2 sm:py-4 pointer-events-none" />
    </div>
  );
}
