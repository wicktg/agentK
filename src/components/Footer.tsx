"use client";

import Link from "next/link";
import AsciiLogo from "./AsciiLogo";

export default function Footer() {
  return (
    <footer className="relative w-full bg-[#08090c] pt-14 pb-10 overflow-hidden select-none flex flex-col items-center justify-center text-center">
      {/* Brand Name in ASCII Logo */}
      <Link href="/" className="group cursor-pointer mb-3.5">
        <AsciiLogo size="md" />
      </Link>

      {/* Minimal Social Icon */}
      <div className="flex items-center justify-center gap-3 mb-7">
        <a
          href="https://x.com/tryagentk"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#8e98a8] hover:text-[#17A2C6] transition-colors p-1.5 focus:outline-none"
          aria-label="X (formerly Twitter)"
        >
          <svg
            className="w-4 h-4 fill-current"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
      </div>

      {/* All Rights Reserved Copyright Line */}
      <div className="w-full max-w-7xl mx-auto px-6 text-center">
        <p className="text-[11.5px] sm:text-xs font-normal text-[#788290] tracking-normal antialiased">
          © 2026 agentK. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
