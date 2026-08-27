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

        {/* Mobile menu toggle button */}
        <div className="sm:hidden flex items-center">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-[#9ea3b5] hover:text-white p-2 rounded-lg hover:bg-white/[0.05] transition-colors focus:outline-none cursor-pointer"
            aria-label="Toggle Menu"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Absolute Dropdown (Does NOT push Hero section down) */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop overlay to close on outside tap */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] sm:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Absolute Menu Panel */}
          <div className="absolute top-full left-0 right-0 z-50 px-5 pt-3 pb-6 bg-[#08090c]/98 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_20px_40px_rgba(0,0,0,0.8)] sm:hidden flex flex-col gap-3.5 animate-in fade-in slide-in-from-top-2 duration-150">
            <Link
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[14px] text-[#9ea3b5] hover:text-white py-2 px-3 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              About
            </Link>
            <Link
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[14px] text-[#9ea3b5] hover:text-white py-2 px-3 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              How it works
            </Link>
            <Link
              href="#faqs"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[14px] text-[#9ea3b5] hover:text-white py-2 px-3 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              FAQs
            </Link>

            <div className="pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onGetStarted?.();
                }}
                className="w-full bg-[#17A2C6] hover:bg-[#1bb8df] text-[#061d24] font-semibold text-sm py-2.5 rounded-lg cursor-pointer transition-colors shadow-sm"
              >
                Get started
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
