"use client";

import { useState } from "react";

interface FaqItem {
  id: string;
  num: string;
  question: string;
  answer: string;
}

const FAQS_DATA: FaqItem[] = [
  {
    id: "faq-1",
    num: "01",
    question: "Do you ever see my raw private key?",
    answer:
      "Your key is encrypted before it ever reaches our servers. We hold an encrypted copy so the agent can sign on autopilot - we never see the decrypted key, and it's zeroed from memory immediately after each signature.",
  },
  {
    id: "faq-2",
    num: "02",
    question: "Why do you need to hold my key at all?",
    answer:
      "Autopilot means signing minutes after you post on X, with nobody watching. That requires a key available server-side. It's a real tradeoff - full custody or full automation, not both without one - and we chose to be upfront about it.",
  },
  {
    id: "faq-3",
    num: "03",
    question: "What counts as a valid X contribution?",
    answer:
      "Real content - high-signal threads, guides, breakdowns, or ecosystem research on X that meaningfully contribute to Flop Network. Simple mentions, spam, or keyword-stuffed posts don't qualify. Every post is filtered before it's signed and pushed.",
  },
  {
    id: "faq-4",
    num: "04",
    question: "What is cooking for Flop Network testnet?",
    answer:
      "An autonomous testnet contribution pipeline is actively in the lab. agentK will enable users to participate in the Flop testnet on autopilot without manual friction. Exact specifications and mechanisms will be unveiled alongside testnet rollout.",
  },
  {
    id: "faq-5",
    num: "05",
    question: "Can I revoke access anytime?",
    answer:
      "Yes. Revoking deletes your encrypted key from our servers immediately and stops all future signing. Anything already signed and pushed to Flop Network stays on the immutable record - revocation stops new activity, it doesn't erase history.",
  },
  {
    id: "faq-6",
    num: "06",
    question: "Does this guarantee me a $FLOP allocation?",
    answer:
      "No. Recording contributions makes your work provable, nothing more. Eligibility and rewards are entirely Flop Labs' call, published on their own terms. We don't control, promise, or influence any allocation.",
  },
  {
    id: "faq-7",
    num: "07",
    question: "Can anyone fake a contribution under my name?",
    answer:
      "No. Every record is Ed25519-signed and tied to your DID - a signature only your key could produce. Anyone can independently verify it; nobody can forge it, including us.",
  },
];

export default function FaqSection() {
  const [openId, setOpenId] = useState<string | null>("faq-1");

  const toggleFaq = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section
      id="faqs"
      className="relative w-full bg-[#08090c] py-24 sm:py-32 md:py-40 px-6 sm:px-10 md:px-16 lg:px-20 select-none scroll-mt-6"
    >
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        {/* Centered Small-Caps Kicker Heading matching How It Works */}
        <div className="text-center mb-12 sm:mb-16 md:mb-20">
          <h2 className="text-sm sm:text-base font-medium text-[#17A2C6] [font-variant:small-caps] tracking-widest antialiased">
            faqs?
          </h2>
        </div>

        {/* Vertical Stacked FAQ Accordion with Clean ASCII Details */}
        <div className="w-full flex flex-col gap-3 sm:gap-4">
          {FAQS_DATA.map((faq) => {
            const isOpen = openId === faq.id;

            return (
              <div
                key={faq.id}
                className={`w-full rounded-xl border transition-colors duration-200 overflow-hidden ${
                  isOpen
                    ? "bg-[#0e0f14] border-[#17A2C6]/30"
                    : "bg-[#0c0d12] border-white/[0.06] hover:border-white/[0.14]"
                }`}
              >
                {/* Accordion Header / Trigger */}
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 sm:gap-4 flex-1">
                    {/* ASCII Index Number */}
                    <span className="text-xs font-mono font-bold text-[#17A2C6] tracking-wider shrink-0">
                      [{faq.num}]
                    </span>
                    {/* Question Title */}
                    <h3 className="text-sm sm:text-base md:text-[16.5px] font-medium text-white tracking-[-0.01em] antialiased group-hover:text-white/90">
                      {faq.question}
                    </h3>
                  </div>

                  {/* Clean ASCII Toggle Indicator (No Container Box) */}
                  <span className="shrink-0 font-mono text-xs font-bold text-[#17A2C6] select-none">
                    {isOpen ? "[ - ]" : "[ + ]"}
                  </span>
                </button>

                {/* Accordion Expandable Content (Clean, No Vertical Border Line) */}
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 sm:px-6 pb-6 pt-1">
                      <div className="pl-8 sm:pl-9 text-xs sm:text-sm md:text-[14.5px] leading-relaxed text-[#9ca7b5] antialiased">
                        {faq.answer}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
