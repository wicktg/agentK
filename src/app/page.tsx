"use client";

import { useState, useEffect } from "react";
import GridCanvas from "@/components/GridCanvas";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import AboutSection from "@/components/AboutSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import FaqSection from "@/components/FaqSection";
import Footer from "@/components/Footer";
import GetStartedModal from "@/components/GetStartedModal";
import FullscreenLoader from "@/components/FullscreenLoader";
import Dashboard from "@/components/Dashboard";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [view, setView] = useState<"landing" | "loading" | "dashboard">(
    "landing",
  );

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && view === "landing") {
        setView("dashboard");
      } else if (
        !isAuthenticated &&
        (view === "dashboard" || view === "loading")
      ) {
        setView("landing");
      }
    }
  }, [isAuthenticated, isLoading, view]);

  if (view === "loading") {
    return <FullscreenLoader onComplete={() => setView("dashboard")} />;
  }

  if (view === "dashboard") {
    return <Dashboard />;
  }

  return (
    <main className="relative w-full bg-[#08090c] overflow-x-hidden">
      {/* Hero Section Container */}
      <div className="relative min-h-screen w-full overflow-hidden flex flex-col justify-between">
        {/* Background Matrix Grid for Hero */}
        <GridCanvas />

        {/* Navigation Header */}
        <Navbar onGetStarted={() => setModalOpen(true)} />

        {/* Center Hero Content */}
        <Hero />

        {/* Bottom spacing to balance Hero viewport */}
        <div className="h-6 sm:h-10 pointer-events-none relative z-10" />
      </div>

      {/* Clean, Plain About Section */}
      <AboutSection />

      {/* How It Works Section with 3 ASCII Cards */}
      <HowItWorksSection />

      {/* FAQs Accordion Section */}
      <FaqSection />

      {/* Minimal Footer */}
      <Footer />

      {/* Get Started Verification Modal */}
      <GetStartedModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onDone={() => {
          setModalOpen(false);
          setView("loading");
        }}
      />
    </main>
  );
}
