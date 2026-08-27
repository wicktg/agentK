"use client";

import Link from "next/link";
import { useState } from "react";
import AsciiLogo from "./AsciiLogo";

export default function Navbar({
  onGetStarted,
}: {
  onGetStarted?: () => void;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="w-full relative z-30 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-14 pt-5 sm:pt-7 pb-3 sm:pb-4 flex items-center justify-between">
        {/* Left Side: Brand Name in ASCII */}
        <div className="flex-1 flex items-center justify-start">
          <Link href="/" className="group cursor-pointer">
            <AsciiLogo size="md" />
          </Link>
        </div>

        {/* Center: Navigation Links (Desktop) */}
        <div className="hidden md:flex flex-1 items-center justify-center">
          <nav className="flex items-center gap-8">
            <Link
              href="#about"
              className="text-[13.5px] font-normal text-[#9ea3b5] hover:text-white transition-colors duration-200"
            >
              About
            </Link>
            <Link
              href="#how-it-works"
              className="text-[13.5px] font-normal text-[#9ea3b5] hover:text-white transition-colors duration-200"
            >
              How it works
            </Link>
            <Link
              href="#faqs"
              className="text-[13.5px] font-normal text-[#9ea3b5] hover:text-white transition-colors duration-200"
            >
              FAQs
            </Link>
          </nav>
        </div>

        {/* Right Side: "Get started" CTA Button (Desktop & Tablet) */}
        <div className="hidden sm:flex flex-1 items-center justify-end">
          <button
            type="button"
            onClick={onGetStarted}
            className="bg-[#17A2C6] hover:bg-[#1bb8df] active:scale-[0.98] text-[#061d24] font-semibold text-[13px] sm:text-[13.5px] px-4 sm:px-5 py-1.5 sm:py-2 rounded-[6px] transition-all duration-200 shadow-sm cursor-pointer"
          >
            Get started
          </button>
        </div>

        {/* Mobile menu toggle button (3 bars) */}
        <div className="sm:hidden flex items-center">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="text-[#9ea3b5] hover:text-white p-2 rounded-lg hover:bg-white/[0.05] transition-colors focus:outline-none cursor-pointer"
            aria-label="Open Menu"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Topmost Sliding Overlay (Slides from absolute top-0, no blur, slight dim) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* Slight Dim Backdrop (No blur effect) */}
          <div
            className="fixed inset-0 bg-black/60 transition-opacity duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Topmost Menu Container (Covers from top-0 downwards) */}
          <div className="relative w-full bg-[#08090c] border-b border-white/[0.1] shadow-2xl z-10 flex flex-col animate-in slide-in-from-top duration-200">
            {/* Top Bar inside Overlay matching Header Layout */}
            <div className="px-4 pt-5 pb-3 flex items-center justify-between border-b border-white/[0.04]">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="group cursor-pointer"
              >
                <AsciiLogo size="md" />
              </Link>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#9ea3b5] hover:text-white p-2 rounded-lg hover:bg-white/[0.06] transition-colors focus:outline-none cursor-pointer"
                aria-label="Close Menu"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Navigation Links */}
            <div className="px-4 py-4 flex flex-col gap-2">
              <Link
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[14.5px] font-medium text-[#9ea3b5] hover:text-white py-2 px-3 rounded-lg hover:bg-white/[0.04] transition-colors"
              >
                About
              </Link>
              <Link
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[14.5px] font-medium text-[#9ea3b5] hover:text-white py-2 px-3 rounded-lg hover:bg-white/[0.04] transition-colors"
              >
                How it works
              </Link>
              <Link
                href="#faqs"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[14.5px] font-medium text-[#9ea3b5] hover:text-white py-2 px-3 rounded-lg hover:bg-white/[0.04] transition-colors"
              >
                FAQs
              </Link>

              <div className="pt-3 mt-1 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onGetStarted?.();
                  }}
                  className="w-full bg-[#17A2C6] hover:bg-[#1bb8df] active:scale-[0.99] text-[#061d24] font-semibold text-[14px] py-3 rounded-lg cursor-pointer transition-all shadow-sm"
                >
                  Get started
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
