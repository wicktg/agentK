"use client";

export default function AsciiLogo({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "text-xs sm:text-sm",
    md: "text-sm sm:text-base",
    lg: "text-base sm:text-lg",
  };

  return (
    <span
      className={`inline-flex items-center font-mono font-bold tracking-wider select-none ${sizeClasses[size]} ${className}`}
    >
      <span className="text-[#17A2C6] mr-1.5 font-bold">&gt;</span>
      <span className="text-white tracking-tight">agent</span>
      <span className="text-[#17A2C6]">K</span>
    </span>
  );
}
