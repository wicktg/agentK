"use client";

import React from "react";
import { AuthProvider } from "@/context/AuthContext";
import DesktopModeGuard from "./DesktopModeGuard";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DesktopModeGuard />
      {children}
    </AuthProvider>
  );
}
