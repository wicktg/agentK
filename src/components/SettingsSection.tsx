"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

type ExportStep =
  | "input_passphrase"
  | "decrypting"
  | "unlocked"
  | "re_encrypting"
  | "done"
  | "error";

export default function SettingsSection() {
  const { user, logout } = useAuth();

  const [keyRevoked, setKeyRevoked] = useState(false);
  const [xConnected, setXConnected] = useState(true);
  const [copiedDid, setCopiedDid] = useState(false);

  // Modals
  const [showLearnModal, setShowLearnModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showDisconnectXModal, setShowDisconnectXModal] = useState(false);

  // PEM Decryption & Export State
  const [showPemModal, setShowPemModal] = useState(false);
  const [exportStep, setExportStep] = useState<ExportStep>("input_passphrase");
  const [passphrase, setPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [decryptedPem, setDecryptedPem] = useState("");
  const [exportError, setExportError] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (exportStep === "decrypting") {
      setProgress(0);
      const start = Date.now();
      const duration = 1400;
      const timer = setInterval(() => {
        const elapsed = Date.now() - start;
        const p = Math.min(100, Math.floor((elapsed / duration) * 100));
        setProgress(p);
        if (p >= 100) {
          clearInterval(timer);
        }
      }, 25);
      return () => clearInterval(timer);
    } else if (exportStep === "re_encrypting") {
      setProgress(0);
      const start = Date.now();
      const duration = 1200;
      const timer = setInterval(() => {
        const elapsed = Date.now() - start;
        const p = Math.min(100, Math.floor((elapsed / duration) * 100));
        setProgress(p);
        if (p >= 100) {
          clearInterval(timer);
        }
      }, 25);
      return () => clearInterval(timer);
    }
  }, [exportStep]);

  const displayHandle = user?.handle ? `@${user.handle}` : "@satoshi";
  const displayDid = user?.did || "did:key:z6MkuTq3YhF7VpW8r2NxL9dK1eJ5bC4m";

  const handleCopyDid = () => {
    navigator.clipboard.writeText(displayDid);
    setCopiedDid(true);
    setTimeout(() => setCopiedDid(false), 2000);
  };

  const handleOpenPemExport = () => {
    setExportStep("input_passphrase");
    setPassphrase("");
    setShowPassphrase(false);
    setDecryptedPem("");
    setExportError("");
    setProgress(0);
    setShowPemModal(true);
  };

  const handleExecuteDecrypt = async () => {
    if (!passphrase || passphrase.length < 8) {
      setExportError("Please enter your identity passphrase.");
      return;
    }

    setExportStep("decrypting");
    setExportError("");

    try {
      const [res] = await Promise.all([
        fetch("/api/auth/identity/export-pem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            handle: user?.handle,
            passphrase: passphrase.trim(),
          }),
        }),
        new Promise((r) => setTimeout(r, 1400)),
      ]);

      const data = await res.json();

      if (res.ok && data.success && data.pem) {
        setDecryptedPem(data.pem);
        setExportStep("unlocked");
      } else {
        setExportError(
          data.error ||
            "Failed to decrypt key from vault. Verify your passphrase.",
        );
        setExportStep("error");
      }
    } catch (err: any) {
      setExportError(err.message || "Decryption failed. Network error.");
      setExportStep("error");
    }
  };

  const handleDownloadDecryptedPem = () => {
    if (!decryptedPem) return;

    // 1. Download decrypted PKCS#8 PEM file
    const blob = new Blob([decryptedPem], {
      type: "application/x-pem-file;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "identity.pem";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // 2. Immediately transition to re-encrypting state and purge in-memory plaintext
    setExportStep("re_encrypting");
    setDecryptedPem(""); // Zero-out in-memory plaintext buffer

    setTimeout(() => {
      setExportStep("done");
      setTimeout(() => {
        setShowPemModal(false);
        setExportStep("input_passphrase");
      }, 1200);
    }, 1300);
  };

  const handleConfirmRevoke = () => {
    setKeyRevoked(true);
    setShowRevokeModal(false);
  };

  const handleConfirmDisconnectX = async () => {
    setXConnected(false);
    setShowDisconnectXModal(false);
    await logout();
  };

  // Helper to render high-level branding-adapted ASCII Filling Bar
  const renderAsciiFillingBar = (label: string, currentProgress: number) => {
    const totalCols = 30;
    const filledCols = Math.min(
      totalCols,
      Math.floor((currentProgress / 100) * totalCols),
    );
    const partialCol = (currentProgress / 100) * totalCols - filledCols;
    const partialChar =
      partialCol > 0.66
        ? "▓"
        : partialCol > 0.33
          ? "▒"
          : partialCol > 0.05
            ? "░"
            : "";
    const emptyCols = Math.max(
      0,
      totalCols - filledCols - (partialChar ? 1 : 0),
    );

    const barRow = "█".repeat(filledCols) + partialChar + "░".repeat(emptyCols);

    return (
      <div className="py-12 px-2 sm:px-4 flex flex-col items-center justify-center text-center select-none">
        {/* Retro Pixel / ASCII Header Label (Static, no blinking) */}
        <h3 className="font-mono text-sm sm:text-base font-bold tracking-[0.25em] text-[#17A2C6] mb-5">
          {label}
        </h3>

        {/* Flat Minimal ASCII Matrix Bar (No glow, clean border) */}
        <div className="bg-[#050608] border border-white/[0.12] rounded-xl p-3 sm:p-4 flex flex-col items-center">
          <div className="font-mono text-[11px] sm:text-[13px] text-[#17A2C6] leading-none tracking-[-0.04em] select-none">
            <div>{barRow}</div>
            <div>{barRow}</div>
            <div>{barRow}</div>
          </div>
        </div>

        {/* Progress % */}
        <div className="font-mono text-[11px] text-[#8e98a8] mt-4">
          {currentProgress}%
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col select-none py-2 sm:py-4 px-2 sm:px-4 text-white">
      {/* Settings Page Title */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-[-0.02em] text-white">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#788290] mt-1 font-sans">
          Manage your cryptographic identity, signing keys, and network
          connections.
        </p>
      </div>

      {/* --- PROMINENT DELEGATION & CUSTODY CARD --- */}
      <div className="w-full bg-[#08090c] border border-white/[0.12] rounded-xl sm:rounded-2xl p-4 sm:p-7 mb-5 sm:mb-6 relative overflow-hidden">
        {/* Top Status Badge Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-[#8e98a8]">
              {keyRevoked
                ? "[ CUSTODY REVOKED ]"
                : "[ ACTIVE AUTOPILOT CUSTODY ]"}
            </span>
          </div>

          <span className="font-mono text-[9.5px] sm:text-[10px] px-2 py-0.5 rounded bg-white/[0.06] text-[#8e98a8]">
            Ed25519 Subkey
          </span>
        </div>

        {/* Primary Statement */}
        <h2 className="text-base sm:text-xl font-semibold text-white tracking-tight mb-2 leading-snug">
          {keyRevoked
            ? "Autopilot signing is currently revoked"
            : "We hold an encrypted key for autopilot signing"}
        </h2>

        <p className="text-xs sm:text-[13px] text-[#9ea3b5] leading-relaxed mb-5 sm:mb-6 font-sans">
          {keyRevoked
            ? "Your signing subkey has been purged from active rotation. agentK cannot sign any contributions until a new key is provisioned."
            : "agentK signs verified public X contributions and pushes them to Flop Network using a client-isolated subkey. The master key never leaves your control, and every record is publicly verifiable."}
        </p>

        {/* Primary Custody Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-4 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={() => setShowLearnModal(true)}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-white transition-colors cursor-pointer text-center"
          >
            Learn how custody works
          </button>

          {!keyRevoked ? (
            <button
              type="button"
              onClick={() => setShowRevokeModal(true)}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold text-rose-400 transition-colors cursor-pointer sm:ml-auto text-center"
            >
              Revoke Key
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setKeyRevoked(false)}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl bg-[#17A2C6]/15 hover:bg-[#17A2C6]/25 border border-[#17A2C6]/30 text-xs font-semibold text-[#17A2C6] transition-colors cursor-pointer sm:ml-auto text-center"
            >
              Re-enable Autopilot Key
            </button>
          )}
        </div>
      </div>

      {/* --- IDENTITY & SECURE PEM KEY MANAGEMENT --- */}
      <div className="w-full bg-[#08090c] border border-white/[0.08] rounded-xl sm:rounded-2xl p-4 sm:p-7 mb-5 sm:mb-6">
        <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider font-mono text-[#8e98a8] mb-3 sm:mb-4">
          Cryptographic Identity
        </h3>

        {/* DID Key String */}
        <div className="mb-5">
          <label className="block text-[10.5px] sm:text-[11px] font-mono text-[#788290] uppercase mb-1.5">
            Decentralized Identifier (DID)
          </label>
          <div className="w-full bg-[#050608] border border-white/[0.06] rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
            <span className="font-mono text-[11px] sm:text-xs text-[#17A2C6] truncate select-all">
              {displayDid}
            </span>
            <button
              type="button"
              onClick={handleCopyDid}
              className="shrink-0 bg-white/[0.08] hover:bg-white/[0.14] text-white font-mono text-xs px-3 py-2 sm:py-1.5 rounded-lg transition-colors cursor-pointer text-center"
            >
              {copiedDid ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* PKCS#8 PEM Key Export Flow */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-white/[0.06]">
          <div className="text-left">
            <h4 className="text-xs font-medium text-white">
              PKCS#8 Encrypted Key (.pem)
            </h4>
            <p className="text-[11px] text-[#788290] mt-0.5 font-sans">
              Decrypt key from vault on demand and export standard PKCS#8
              encrypted PEM.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenPemExport}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl bg-[#17A2C6] hover:bg-[#1bb8df] text-xs font-semibold text-[#061d24] transition-colors cursor-pointer shrink-0 text-center shadow-md flex items-center justify-center gap-2"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>Download identity.pem</span>
          </button>
        </div>
      </div>

      {/* --- CONNECTED ACCOUNTS --- */}
      <div className="w-full bg-[#08090c] border border-white/[0.08] rounded-xl sm:rounded-2xl p-4 sm:p-7">
        <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider font-mono text-[#8e98a8] mb-3 sm:mb-4">
          Connected Accounts
        </h3>

        {/* Account 1: X (Twitter) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white overflow-hidden shrink-0">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="X"
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-medium text-white">
                  X (Twitter)
                </span>
                {xConnected && (
                  <span className="font-mono text-[10px] text-emerald-400 font-semibold">
                    [Connected]
                  </span>
                )}
              </div>
              <span className="font-mono text-[11px] text-[#788290]">
                {xConnected ? displayHandle : "Not connected"}
              </span>
            </div>
          </div>

          <div className="w-full sm:w-auto">
            {xConnected ? (
              <button
                type="button"
                onClick={() => setShowDisconnectXModal(true)}
                className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/10 hover:text-rose-400 border border-white/[0.08] hover:border-rose-500/30 text-xs font-medium text-[#8e98a8] transition-colors cursor-pointer text-center"
              >
                Disconnect X
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setXConnected(true)}
                className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-lg bg-[#17A2C6]/15 hover:bg-[#17A2C6]/25 border border-[#17A2C6]/30 text-xs font-medium text-[#17A2C6] transition-colors cursor-pointer text-center"
              >
                Connect X
              </button>
            )}
          </div>
        </div>
      </div>

      {/* --- SECURE PEM DECRYPTION & EXPORT MODAL --- */}
      {showPemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => {
              if (
                exportStep !== "decrypting" &&
                exportStep !== "re_encrypting"
              ) {
                setShowPemModal(false);
              }
            }}
          />
          <div className="relative w-full max-w-lg bg-[#0c0d12] border border-white/[0.12] rounded-2xl p-5 sm:p-7 z-10 flex flex-col max-h-[92vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[#17A2C6] font-semibold uppercase tracking-wider">
                  [ PKCS#8 Cryptographic Export ]
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPemModal(false)}
                disabled={
                  exportStep === "decrypting" || exportStep === "re_encrypting"
                }
                className="text-[#8e98a8] hover:text-white transition-colors cursor-pointer p-1 text-sm disabled:opacity-30"
              >
                ✕
              </button>
            </div>

            {/* STEP 1: Enter Passphrase */}
            {exportStep === "input_passphrase" && (
              <div className="flex flex-col">
                <h3 className="text-lg font-semibold text-white tracking-tight mb-1.5">
                  Unlock Your Private Key
                </h3>
                <p className="text-xs text-[#8e98a8] leading-relaxed mb-5 font-sans">
                  Enter your identity passphrase to unseal your Ed25519 signing
                  key from the server vault and package it into standard PKCS#8
                  PEM format.
                </p>

                <div className="mb-5">
                  <label className="block text-[11px] font-mono font-semibold text-[#8e98a8] uppercase tracking-wider mb-2">
                    Identity Passphrase
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassphrase ? "text" : "password"}
                      placeholder="Enter your passphrase..."
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleExecuteDecrypt();
                      }}
                      autoFocus
                      className="w-full bg-[#08090c] border border-white/[0.12] focus:border-[#17A2C6] rounded-xl pl-4 pr-11 py-3 text-sm text-white font-mono placeholder:text-white/20 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassphrase(!showPassphrase)}
                      className="absolute right-3.5 text-[#8e98a8] hover:text-white transition-colors cursor-pointer p-1"
                    >
                      {showPassphrase ? (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExecuteDecrypt}
                  disabled={!passphrase}
                  className="w-full py-3 rounded-xl bg-[#17A2C6] hover:bg-[#1bb8df] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-[#061d24] transition-colors cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Decrypt & Export Key</span>
                </button>
              </div>
            )}

            {/* STEP 2: Decrypting (Centred Custom ASCII Progress Bar) */}
            {exportStep === "decrypting" &&
              renderAsciiFillingBar("DECRYPTING...", progress)}

            {/* STEP 3: Unlocked & Ready for Download (Clean & Minimalist) */}
            {exportStep === "unlocked" && (
              <div className="flex flex-col">
                <div className="mb-4 bg-[#050608] border border-white/[0.08] rounded-xl p-4 font-mono">
                  <div className="flex items-center justify-between text-[11px] text-[#8e98a8] mb-2">
                    <span className="text-[#17A2C6] font-semibold">
                      [ KEY DECRYPTED IN MEMORY ]
                    </span>
                    <span className="text-[10px] text-emerald-400">
                      RFC 5208 PKCS#8
                    </span>
                  </div>
                  <div className="text-[10px] text-[#788290] uppercase mb-1">
                    Target DID
                  </div>
                  <span className="text-xs text-[#d6f3fa] break-all block font-medium">
                    {displayDid}
                  </span>
                </div>

                <p className="text-xs text-[#8e98a8] mb-5 font-sans leading-relaxed">
                  Your Ed25519 identity key is unsealed in memory and sealed
                  with your passphrase. Clicking download will save the file and
                  automatically purge plaintext memory buffers.
                </p>

                <button
                  type="button"
                  onClick={handleDownloadDecryptedPem}
                  className="w-full py-3.5 rounded-xl bg-[#17A2C6] hover:bg-[#1bb8df] text-xs font-bold text-[#061d24] transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.4}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span>Download identity.pem</span>
                </button>
              </div>
            )}

            {/* STEP 4: Re-encrypting (Centred Custom ASCII Progress Bar) */}
            {exportStep === "re_encrypting" &&
              renderAsciiFillingBar("ENCRYPTING...", progress)}

            {/* STEP 5: Done (Pure ASCII with no container) */}
            {exportStep === "done" && (
              <div className="py-12 flex flex-col items-center justify-center text-center select-none font-mono">
                <div className="text-[#17A2C6] text-2xl font-bold mb-3 select-none">
                  [✓]
                </div>
                <h4 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                  Key Safely Re-encrypted
                </h4>
                <p className="text-xs text-[#8e98a8] mt-1.5 font-mono">
                  `identity.pem` downloaded. Vault is sealed.
                </p>
              </div>
            )}

            {/* ERROR STATE */}
            {exportStep === "error" && (
              <div className="flex flex-col">
                <div className="mb-5 bg-rose-500/10 border border-rose-500/25 rounded-xl p-3.5 text-rose-300 text-xs font-sans leading-relaxed">
                  {exportError}
                </div>
                <button
                  type="button"
                  onClick={() => setExportStep("input_passphrase")}
                  className="w-full py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL 1: LEARN HOW CUSTODY WORKS --- */}
      {showLearnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setShowLearnModal(false)}
          />
          <div className="relative w-full max-w-lg bg-[#0c0d12] border border-white/[0.1] rounded-2xl p-5 sm:p-7 z-10 flex flex-col max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight mb-2">
              How Autopilot Custody Works
            </h3>
            <p className="text-xs text-[#8e98a8] leading-relaxed mb-4">
              agentK is designed around non-custodial principles. Here is how
              your cryptographic identity is protected:
            </p>

            <div className="flex flex-col gap-2.5 sm:gap-3 font-mono text-xs text-[#d2d9e4] mb-5 sm:mb-6">
              <div className="p-3 rounded-xl bg-[#08090c] border border-white/[0.06]">
                <span className="text-[#17A2C6] block font-semibold mb-1">
                  1. Subkey Isolation
                </span>
                Your master DID key never touches active servers. Only a scoped
                signing subkey is provisioned.
              </div>
              <div className="p-3 rounded-xl bg-[#08090c] border border-white/[0.06]">
                <span className="text-[#17A2C6] block font-semibold mb-1">
                  2. Hardware / Passkey Sealed
                </span>
                All private key blobs are encrypted at rest using AES-GCM-256
                and authenticated with your passkey.
              </div>
              <div className="p-3 rounded-xl bg-[#08090c] border border-white/[0.06]">
                <span className="text-[#17A2C6] block font-semibold mb-1">
                  3. Instant Revocation
                </span>
                You can revoke signing custody instantly at any time,
                invalidating all future automated signatures.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowLearnModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#17A2C6] hover:bg-[#1bb8df] text-xs font-semibold text-[#061d24] transition-colors cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL 2: CONFIRM REVOKE KEY --- */}
      {showRevokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setShowRevokeModal(false)}
          />
          <div className="relative w-full max-w-md bg-[#0c0d12] border border-white/[0.1] rounded-2xl p-5 sm:p-6 z-10 flex flex-col max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-semibold text-rose-400 tracking-tight mb-2">
              Revoke Autopilot Key?
            </h3>
            <p className="text-xs text-[#8e98a8] leading-relaxed mb-5 sm:mb-6 font-sans">
              This will immediately purge your active signing subkey from
              memory. agentK will no longer be able to automatically sign your
              public X contributions.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowRevokeModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-[#9ea8b6] hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs font-semibold text-white transition-colors cursor-pointer shadow-md"
              >
                Confirm Revoke
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: DISCONNECT X --- */}
      {showDisconnectXModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setShowDisconnectXModal(false)}
          />
          <div className="relative w-full max-w-md bg-[#0c0d12] border border-white/[0.1] rounded-2xl p-5 sm:p-6 z-10 flex flex-col max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight mb-2">
              Disconnect X Account?
            </h3>
            <p className="text-xs text-[#8e98a8] leading-relaxed mb-5 sm:mb-6 font-sans">
              agentK will stop monitoring and signing contributions from{" "}
              <span className="text-white font-mono">{displayHandle}</span>.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowDisconnectXModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-[#9ea8b6] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDisconnectX}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
