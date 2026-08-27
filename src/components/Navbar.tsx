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
    <header className="w-full relative z-20 select-none">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 md:px-14 pt-7 pb-4 flex items-center justify-between">
        {/* Left Side: Brand Name in ASCII */}
        <div className="flex-1 flex items-center justify-start">
          <Link href="/" className="group cursor-pointer">
            <AsciiLogo size="md" />
          </Link>
        </div>

        {/* Center: Navigation Links */}
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

        {/* Right Side: "Get started" CTA Button */}
        <div className="hidden sm:flex flex-1 items-center justify-end">
          <button
            type="button"
            onClick={onGetStarted}
            className="bg-[#17A2C6] hover:bg-[#1bb8df] active:scale-[0.98] text-[#061d24] font-semibold text-[13px] sm:text-[13.5px] px-4 sm:px-5 py-1.5 sm:py-2 rounded-[6px] transition-all duration-200 shadow-sm cursor-pointer"
          >
            Get started
          </button>
        </div>

        {/* Mobile menu toggle */}
        <div className="sm:hidden flex items-center">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-[#9ea3b5] hover:text-white p-1.5 focus:outline-none"
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

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden px-6 pt-2 pb-6 bg-[#08090c]/95 backdrop-blur-md border-b border-[#252838] flex flex-col gap-4">
          <Link
            href="#about"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm text-[#9ea3b5] hover:text-white py-1"
          >
            About
          </Link>
          <Link
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm text-[#9ea3b5] hover:text-white py-1"
          >
            How it works
          </Link>
          <Link
            href="#faqs"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm text-[#9ea3b5] hover:text-white py-1"
          >
            FAQs
          </Link>
          <div className="pt-2 border-t border-[#252838]">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onGetStarted?.();
              }}
              className="w-full bg-[#17A2C6] text-[#061d24] font-semibold text-sm py-2 rounded-[6px] cursor-pointer"
            >
              Get started
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
