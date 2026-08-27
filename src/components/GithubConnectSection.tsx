"use client";

import { useState } from "react";

export default function GithubConnectSection() {
  const [isConnecting, setIsConnecting] = useState(false);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center text-center select-none py-12 px-4 sm:px-6">
      {/* GitHub Brand Icon Box */}
      <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white mb-6">
        <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          />
        </svg>
      </div>

      <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.02em] mb-2.5">
        Connect GitHub
      </h2>

      <p className="text-xs sm:text-sm text-[#8e98a8] leading-relaxed max-w-sm mb-8 font-sans">
        Link your GitHub repositories to track and cryptographically seal your
        code contributions on autopilot.
      </p>

      {/* Connect GitHub Button */}
      <button
        type="button"
        onClick={() => {
          setIsConnecting(true);
          setTimeout(() => setIsConnecting(false), 1200);
        }}
        className="w-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] text-white font-semibold text-sm py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 shadow-md cursor-pointer transition-colors"
      >
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          />
        </svg>
        <span>{isConnecting ? "Connecting..." : "Connect GitHub"}</span>
      </button>

      <span className="font-mono text-[10px] text-[#788290] mt-4">
        [ OAuth integration in preview ]
      </span>
    </div>
  );
}
