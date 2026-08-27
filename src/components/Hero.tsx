"use client";

export default function Hero() {
  return (
    <section className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 py-12 sm:py-16 md:py-20 select-none">
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        <h1 className="text-[30px] xs:text-[36px] sm:text-[46px] md:text-[56px] lg:text-[64px] font-medium tracking-[-0.03em] text-white/95 leading-[1.15] sm:leading-[1.12] antialiased">
          Contribute to Flop Network
          <br className="hidden xs:inline" />{" "}
          <span className="inline">on </span>
          <span className="text-[#17A2C6] inline-block font-medium">autopilot.</span>
        </h1>
      </div>
    </section>
  );
}
