"use client";

import { useState } from "react";
import AsciiLogo from "./AsciiLogo";
import GithubIdenticon from "./GithubIdenticon";
import XScheduler from "./XScheduler";
import SettingsSection from "./SettingsSection";
import TestnetSection from "./TestnetSection";
import { useAuth } from "@/context/AuthContext";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"X" | "Testnet" | "Settings">("X");
  const { user } = useAuth();

  return (
    <div className="min-h-screen w-full bg-[#08090c] text-white flex flex-col justify-between select-none">
      {/* Dashboard Top Header */}
      <header className="w-full relative z-20">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 md:px-14 pt-7 pb-4 flex items-center justify-between">
          {/* Left Side: Brand Logo */}
          <div className="flex-1 flex items-center justify-start">
            <button
              type="button"
              onClick={() => setActiveTab("X")}
              className="cursor-pointer focus:outline-none"
            >
              <AsciiLogo size="md" />
            </button>
          </div>

          {/* Center: Navigation (X, Testnet, Settings) */}
          <div className="flex flex-1 items-center justify-center">
            <nav className="flex items-center gap-6 sm:gap-8">
              {(["X", "Testnet", "Settings"] as const).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`text-sm sm:text-[14px] font-normal transition-colors duration-150 cursor-pointer ${
                      isActive
                        ? "text-white font-medium"
                        : "text-[#8e98a8] hover:text-white"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Far Right: User's Actual X Profile Picture (or identicon fallback) */}
          <div className="flex flex-1 items-center justify-end">
            {user?.avatarUrl ? (
              <div className="relative group cursor-pointer">
                <img
                  src={user.avatarUrl}
                  alt={user.handle || "Profile"}
                  className="w-[32px] h-[32px] rounded-full object-cover border border-white/[0.15] hover:border-[#17A2C6] transition-colors"
                />
              </div>
            ) : (
              <GithubIdenticon size={30} />
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full flex items-center justify-center px-4 sm:px-6 md:px-8 py-6">
        {activeTab === "X" ? (
          <XScheduler />
        ) : activeTab === "Testnet" ? (
          <TestnetSection />
        ) : (
          <SettingsSection />
        )}
      </main>

      {/* Bottom spacer to balance viewport */}
      <footer className="w-full py-4 pointer-events-none" />
    </div>
  );
}
