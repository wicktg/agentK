"use client";

export default function TestnetSection() {
  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-8 sm:py-12 px-4 select-none text-center">
      <div className="w-full max-w-xl flex flex-col items-center">
        {/* Clean Rounded Image Container with Smooth Hover Zoom */}
        <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden mb-6 group">
          <img
            src="/flop-testnet.png"
            alt="Flop Network Testnet"
            className="w-full h-full object-cover select-none transition-transform duration-700 group-hover:scale-[1.02]"
          />
        </div>

        {/* Narrative & Status Headline */}
        <div className="flex flex-col items-center gap-2 max-w-md">
          <h2 className="text-lg sm:text-xl font-medium text-white tracking-[-0.02em]">
            Flop testnet is coming.
          </h2>

          <p className="text-xs sm:text-[13.5px] text-[#8e98a8] leading-relaxed font-sans">
            You will be able to contribute to Flop Network autonomously soon.
          </p>
        </div>
      </div>
    </div>
  );
}
