"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth, UserProfile } from "@/context/AuthContext";

type ModalStep =
  | "connect"
  | "input"
  | "code_generated"
  | "verifying"
  | "error"
  | "choose_identity"
  | "create_identity"
  | "created_summary"
  | "import_identity"
  | "import_success";

export default function GetStartedModal({
  isOpen,
  onClose,
  onDone,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDone?: () => void;
}) {
  const { setUser } = useAuth();
  const isAccessEnabled =
    (
      process.env.NEXT_PUBLIC_ACCESS ||
      process.env.NEXT_PUBLIC_ACCESS_ENABLED ||
      process.env.NEXT_PUBLIC_AGENT_ACCESS ||
      "false"
    )
      .toLowerCase()
      .trim() === "true";

  // Primary navigation step
  const [step, setStep] = useState<ModalStep>("connect");

  // X Verification State
  const [username, setUsername] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<UserProfile | null>(null);

  // Identity Creation State
  const [createPassphrase, setCreatePassphrase] = useState("");
  const [showCreatePassphrase, setShowCreatePassphrase] = useState(false);
  const [createdDid, setCreatedDid] = useState("");
  const [createdPem, setCreatedPem] = useState("");
  const [isCreatingIdentity, setIsCreatingIdentity] = useState(false);
  const [pemDownloaded, setPemDownloaded] = useState(false);
  const [copiedDid, setCopiedDid] = useState(false);

  // Identity Import State
  const [importedPemContent, setImportedPemContent] = useState("");
  const [importedFileName, setImportedFileName] = useState("");
  const [importPassphrase, setImportPassphrase] = useState("");
  const [showImportPassphrase, setShowImportPassphrase] = useState(false);
  const [importDid, setImportDid] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when opening modal
  useEffect(() => {
    if (isOpen) {
      setStep("connect");
      setUsername("");
      setVerificationCode("");
      setErrorMessage("");
      setCopiedCode(false);
      setVerifiedUser(null);
      setCreatePassphrase("");
      setCreatedDid("");
      setCreatedPem("");
      setPemDownloaded(false);
      setCopiedDid(false);
      setImportedPemContent("");
      setImportedFileName("");
      setImportPassphrase("");
      setImportDid("");
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && step !== "verifying") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, step]);

  if (!isOpen) return null;

  // --- Handlers: X Bio Challenge ---
  const handleCopyCode = () => {
    if (!verificationCode) return;
    navigator.clipboard.writeText(verificationCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleGenerateCode = async () => {
    const cleanHandle = username.replace(/^@/, "").trim();
    if (!cleanHandle) return;

    setIsGenerating(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/x/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: cleanHandle }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.code) {
        setVerificationCode(data.code);
        setStep("code_generated");
      } else {
        setErrorMessage(
          data.error || "Failed to generate verification challenge.",
        );
        setStep("error");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setErrorMessage(`Connection error: ${msg}`);
      setStep("error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartVerification = async () => {
    const cleanHandle = username.replace(/^@/, "").trim();
    if (!cleanHandle || !verificationCode) return;

    setStep("verifying");
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/x/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: cleanHandle, code: verificationCode }),
      });

      const data = await res.json();

      if (res.ok && data.verified && data.user) {
        setVerifiedUser(data.user);
        // Advance directly to identity selection choice
        setStep("choose_identity");
      } else {
        setErrorMessage(
          data.error ||
            `Verification code was not found in @${cleanHandle}'s X bio. Please make sure your profile is saved on X and try again.`,
        );
        setStep("error");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setErrorMessage(`Verification check failed: ${msg}`);
      setStep("error");
    }
  };

  // --- Handlers: Create Identity ---
  const handleExecuteCreateIdentity = async () => {
    if (!createPassphrase || createPassphrase.length < 12) {
      setErrorMessage(
        "Passphrase must be at least 12 characters (13 recommended).",
      );
      return;
    }

    setIsCreatingIdentity(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/identity/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: verifiedUser?.handle || username,
          passphrase: createPassphrase,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.did && data.pem) {
        setCreatedDid(data.did);
        setCreatedPem(data.pem);
        setStep("created_summary");
      } else {
        setErrorMessage(data.error || "Failed to generate identity.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create identity.");
    } finally {
      setIsCreatingIdentity(false);
    }
  };

  const handleDownloadCreatedPem = () => {
    if (!createdPem) return;
    const blob = new Blob([createdPem], { type: "application/x-pem-file" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "identity.pem";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setPemDownloaded(true);
  };

  const handleCopyCreatedDid = () => {
    if (!createdDid) return;
    navigator.clipboard.writeText(createdDid);
    setCopiedDid(true);
    setTimeout(() => setCopiedDid(false), 2000);
  };

  // --- Handlers: Import Identity ---
  const handleFileChange = (file: File) => {
    if (!file) return;
    setImportedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportedPemContent(content || "");
    };
    reader.readAsText(file);
  };

  const handleExecuteImportIdentity = async () => {
    if (!importedPemContent) {
      setErrorMessage("Please upload your identity.pem file.");
      return;
    }
    if (!importPassphrase) {
      setErrorMessage("Please enter your identity passphrase.");
      return;
    }

    setIsImporting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/identity/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: verifiedUser?.handle || username,
          pem: importedPemContent,
          passphrase: importPassphrase,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.did) {
        setImportDid(data.did);
        setStep("import_success");
      } else {
        setErrorMessage(
          data.error || "Failed to unlock identity.pem. Check your passphrase.",
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to unlock identity.");
    } finally {
      setIsImporting(false);
    }
  };

  // Final confirmation: Set user and navigate to dashboard
  const handleFinalizeAndProceed = (finalDid: string) => {
    if (verifiedUser) {
      const updatedUser: UserProfile = {
        ...verifiedUser,
        did: finalDid || verifiedUser.did,
      };
      setUser(updatedUser);
    }
    if (onDone) {
      onDone();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => step !== "verifying" && onClose()}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-[#0c0d12] border border-white/[0.1] rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden z-10 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        {step !== "verifying" && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 sm:top-5 right-4 sm:right-5 text-[#8e98a8] hover:text-white transition-colors p-1.5 focus:outline-none rounded-lg hover:bg-white/[0.05] z-20 cursor-pointer"
            aria-label="Close modal"
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
        )}

        {/* --- ACCESS CLOSED VIEW (When NEXT_PUBLIC_ACCESS is false) --- */}
        {!isAccessEnabled ? (
          <div className="p-4 sm:p-7 md:p-8 flex flex-col items-center text-center max-w-lg mx-auto w-full">
            {/* Minimal ASCII Closed Art Element */}
            <div className="w-full bg-[#08090c] border border-white/[0.08] rounded-xl p-3.5 sm:p-5 mb-5 sm:mb-6 shadow-inner font-mono text-[10px] sm:text-[11.5px] leading-[1.35] select-none text-left overflow-x-auto">
              <pre className="text-center text-[#17A2C6] whitespace-pre font-mono font-medium drop-shadow-[0_0_8px_rgba(23,162,198,0.25)]">
                {`   .---------------------------------------.
  /   \\___/                           \\___/   \\
 |   ( -.- )    AGENT_00 // CLOSED   ( -.- )   |
  \\    /|\\                             /|\\    /
   '---------------------------------------'`}
              </pre>
            </div>

            <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.02em] mb-6">
              Access to Agent is Closed
            </h3>

            <button
              type="button"
              onClick={onClose}
              className="w-full bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.1] font-semibold text-sm sm:text-[15px] py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
            >
              <span>Dismiss</span>
            </button>
          </div>
        ) : (
          <>
            {/* --- STEP 1: CONNECT X ACCOUNT --- */}
            {step === "connect" && (
              <div className="p-6 sm:p-8 flex flex-col items-center text-center max-w-lg mx-auto">
                <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.02em] mb-2.5 mt-1">
                  Connect your X account
                </h3>
                <p className="text-xs sm:text-[13.5px] text-[#8e98a8] leading-relaxed mb-8">
                  agentK silently monitors your public X contributions and
                  pushes them to Flop Network under your personal DID.
                </p>
                <button
                  type="button"
                  onClick={() => setStep("input")}
                  className="w-full bg-[#17A2C6] hover:bg-[#1bb8df] text-[#061d24] font-semibold text-sm sm:text-[15px] py-3.5 px-6 rounded-xl flex items-center justify-center gap-2.5 shadow-md cursor-pointer transition-colors"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span>Connect X</span>
                </button>
              </div>
            )}

            {/* --- STEP 2: USERNAME INPUT --- */}
            {step === "input" && (
              <div className="p-6 sm:p-8 flex flex-col max-w-lg mx-auto w-full">
                <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.02em] mb-1.5 mt-1">
                  Enter your X Handle
                </h3>
                <p className="text-xs sm:text-[13px] text-[#8e98a8] leading-relaxed mb-6">
                  Provide your public username to generate your unique
                  verification payload.
                </p>
                <div className="mb-6">
                  <label className="block text-[11px] font-mono font-semibold text-[#8e98a8] uppercase tracking-wider mb-2">
                    X Username
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-[#8e98a8] font-mono text-sm">
                      @
                    </span>
                    <input
                      type="text"
                      placeholder="username"
                      value={username}
                      onChange={(e) =>
                        setUsername(e.target.value.replace(/^@/, "").trim())
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && username.trim()) {
                          handleGenerateCode();
                        }
                      }}
                      autoFocus
                      className="w-full bg-[#08090c] border border-white/[0.1] focus:border-[#17A2C6] rounded-xl pl-8 pr-4 py-3 text-sm text-white font-mono placeholder:text-white/20 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setStep("connect")}
                    className="flex-1 bg-white/[0.06] hover:bg-white/[0.1] text-[#9ea8b6] hover:text-white font-semibold text-sm py-3 px-4 rounded-xl cursor-pointer transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    disabled={!username.trim() || isGenerating}
                    className="flex-[2] bg-[#17A2C6] hover:bg-[#1bb8df] disabled:opacity-40 disabled:cursor-not-allowed text-[#061d24] font-semibold text-sm py-3 px-4 rounded-xl shadow-md cursor-pointer transition-colors"
                  >
                    {isGenerating ? "Generating..." : "Generate Code"}
                  </button>
                </div>
              </div>
            )}

            {/* --- STEP 3: CODE GENERATED & BIO INSTRUCTION --- */}
            {step === "code_generated" && (
              <div className="p-6 sm:p-8 flex flex-col max-w-lg mx-auto w-full">
                <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.02em] mb-1.5 mt-1">
                  Place Code in Bio
                </h3>
                <p className="text-xs sm:text-[13px] text-[#8e98a8] leading-relaxed mb-6">
                  Paste the exact verification payload below anywhere in your X
                  bio for{" "}
                  <span className="text-white font-mono font-medium">
                    @{username}
                  </span>
                  .
                </p>
                <div className="mb-6">
                  <label className="block text-[11px] font-mono font-semibold text-[#8e98a8] uppercase tracking-wider mb-2">
                    Verification Payload
                  </label>
                  <div className="bg-[#08090c] border border-white/[0.08] rounded-xl p-3.5 flex items-center justify-between gap-3">
                    <span className="font-mono text-xs text-[#17A2C6] truncate select-all">
                      {verificationCode}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="shrink-0 bg-white/[0.08] hover:bg-white/[0.14] text-white font-mono text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                    >
                      {copiedCode ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#788290] mt-2.5 leading-relaxed font-sans">
                    1. Copy the code above. <br />
                    2. Paste it into your X bio and save. <br />
                    3. Click <strong className="text-white">Verify</strong>{" "}
                    below.
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setStep("input")}
                    className="flex-1 bg-white/[0.06] hover:bg-white/[0.1] text-[#9ea8b6] hover:text-white font-semibold text-sm py-3 px-4 rounded-xl cursor-pointer transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleStartVerification}
                    className="flex-[2] bg-[#17A2C6] hover:bg-[#1bb8df] text-[#061d24] font-semibold text-sm py-3 px-4 rounded-xl shadow-md cursor-pointer transition-colors"
                  >
                    Verify
                  </button>
                </div>
              </div>
            )}

            {/* --- STEP 4: VERIFYING STATE --- */}
            {step === "verifying" && (
              <div className="py-16 px-6 flex flex-col items-center justify-center text-center">
                <h3 className="text-lg sm:text-xl font-semibold text-white tracking-[-0.01em] font-mono">
                  Verifying @{username}...
                </h3>
              </div>
            )}

            {/* --- STEP 5: ERROR STATE --- */}
            {step === "error" && (
              <div className="p-6 sm:p-8 flex flex-col items-center text-center max-w-lg mx-auto w-full">
                <div className="mb-4 select-none">
                  <span className="font-mono text-2xl font-bold text-rose-400">
                    [!]
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white tracking-tight mb-2">
                  Verification Failed
                </h3>
                <p className="text-xs sm:text-[13px] text-[#9ea8b6] leading-relaxed mb-6 font-sans">
                  {errorMessage}
                </p>
                <div className="flex items-center gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => setStep("code_generated")}
                    className="flex-1 bg-white/[0.06] hover:bg-white/[0.1] text-[#9ea8b6] hover:text-white font-semibold text-xs py-3 px-4 rounded-xl cursor-pointer transition-colors"
                  >
                    Back to Code
                  </button>
                  <button
                    type="button"
                    onClick={handleStartVerification}
                    className="flex-1 bg-[#17A2C6] hover:bg-[#1bb8df] text-[#061d24] font-semibold text-xs py-3 px-4 rounded-xl shadow-md cursor-pointer transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* --- STEP 6: CHOOSE AGENT IDENTITY (SIDE BY SIDE CARDS WITH ASCII ART) --- */}
            {step === "choose_identity" && (
              <div className="p-6 sm:p-8 flex flex-col">
                {/* Header with clean unboxed verified indicator */}
                <div className="text-center mb-6">
                  <div className="text-emerald-400 font-mono text-xs font-semibold mb-2">
                    [✓] @{verifiedUser?.handle || username} Verified
                  </div>
                  <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.02em] mb-1">
                    Choose Agent Identity
                  </h3>
                  <p className="text-xs sm:text-[13px] text-[#8e98a8]">
                    Select how you would like to provision your Technocore DID
                    identity.
                  </p>
                </div>

                {/* Side by Side Option Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
                  {/* Option 1: Create New Agent Identity */}
                  <div
                    onClick={() => setStep("create_identity")}
                    className="group relative bg-[#08090c] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-5 flex flex-col items-center text-center cursor-pointer transition-colors duration-150"
                  >
                    {/* Enlarged ASCII Glyph Box */}
                    <div className="w-full py-7 bg-[#050608] rounded-xl border border-white/[0.04] mb-4 flex items-center justify-center">
                      <span className="font-mono text-2xl sm:text-3xl font-bold text-[#17A2C6] tracking-wider select-none group-hover:scale-110 transition-transform">
                        [ + ]
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-white group-hover:text-[#17A2C6] transition-colors mb-1.5">
                      Create New Identity
                    </h4>
                    <p className="text-[11.5px] text-[#8e98a8] leading-relaxed mb-4">
                      Generate a fresh Ed25519 keypair and encrypted PKCS#8 PEM
                      envelope.
                    </p>

                    <div className="mt-auto w-full py-2 px-3 rounded-lg bg-white/[0.04] group-hover:bg-[#17A2C6]/15 text-[#17A2C6] text-xs font-mono font-semibold transition-colors">
                      &gt; Generate New
                    </div>
                  </div>

                  {/* Option 2: Import Existing Agent Identity */}
                  <div
                    onClick={() => setStep("import_identity")}
                    className="group relative bg-[#08090c] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-5 flex flex-col items-center text-center cursor-pointer transition-colors duration-150"
                  >
                    {/* Enlarged ASCII Glyph Box */}
                    <div className="w-full py-7 bg-[#050608] rounded-xl border border-white/[0.04] mb-4 flex items-center justify-center">
                      <span className="font-mono text-2xl sm:text-3xl font-bold text-[#17A2C6] tracking-wider select-none group-hover:scale-110 transition-transform">
                        [ ↓ ]
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-white group-hover:text-[#17A2C6] transition-colors mb-1.5">
                      Import Existing Identity
                    </h4>
                    <p className="text-[11.5px] text-[#8e98a8] leading-relaxed mb-4">
                      Upload an existing{" "}
                      <code className="text-white">identity.pem</code> file and
                      unlock with passphrase.
                    </p>

                    <div className="mt-auto w-full py-2 px-3 rounded-lg bg-white/[0.04] group-hover:bg-[#17A2C6]/15 text-[#17A2C6] text-xs font-mono font-semibold transition-colors">
                      &gt; Import PEM
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- STEP 7A: CREATE NEW AGENT IDENTITY (13-CHAR PASSPHRASE INPUT) --- */}
            {step === "create_identity" && (
              <div className="p-6 sm:p-8 flex flex-col max-w-lg mx-auto w-full">
                <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.02em] mb-1.5 mt-1">
                  Create Agent Identity
                </h3>
                <p className="text-xs sm:text-[13px] text-[#8e98a8] leading-relaxed mb-6 font-sans">
                  Enter a{" "}
                  <strong className="text-white">
                    13-character passphrase
                  </strong>{" "}
                  to encrypt your Ed25519 PKCS#8 PEM envelope with AES-256-CBC.
                </p>

                {/* Passphrase Input */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-mono font-semibold text-[#8e98a8] uppercase tracking-wider">
                      Identity Passphrase
                    </label>
                    <span
                      className={`font-mono text-[11px] ${
                        createPassphrase.length === 13
                          ? "text-emerald-400 font-semibold"
                          : createPassphrase.length >= 12
                            ? "text-[#17A2C6]"
                            : "text-[#788290]"
                      }`}
                    >
                      {createPassphrase.length} / 13 characters
                    </span>
                  </div>

                  <div className="relative flex items-center">
                    <input
                      type={showCreatePassphrase ? "text" : "password"}
                      placeholder="Enter 13-character passphrase"
                      value={createPassphrase}
                      onChange={(e) => setCreatePassphrase(e.target.value)}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          createPassphrase.length >= 12
                        ) {
                          handleExecuteCreateIdentity();
                        }
                      }}
                      autoFocus
                      className="w-full bg-[#08090c] border border-white/[0.1] focus:border-[#17A2C6] rounded-xl pl-4 pr-12 py-3 text-sm text-white font-mono placeholder:text-white/20 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowCreatePassphrase(!showCreatePassphrase)
                      }
                      className="absolute right-3 text-xs font-mono text-[#8e98a8] hover:text-white p-1"
                    >
                      {showCreatePassphrase ? "HIDE" : "SHOW"}
                    </button>
                  </div>

                  {errorMessage && (
                    <p className="text-rose-400 text-xs mt-2 font-mono">
                      {errorMessage}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage("");
                      setStep("choose_identity");
                    }}
                    className="flex-1 bg-white/[0.06] hover:bg-white/[0.1] text-[#9ea8b6] hover:text-white font-semibold text-sm py-3 px-4 rounded-xl cursor-pointer transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteCreateIdentity}
                    disabled={
                      createPassphrase.length < 12 || isCreatingIdentity
                    }
                    className="flex-[2] bg-[#17A2C6] hover:bg-[#1bb8df] disabled:opacity-40 disabled:cursor-not-allowed text-[#061d24] font-semibold text-sm py-3 px-4 rounded-xl shadow-md cursor-pointer transition-colors"
                  >
                    {isCreatingIdentity
                      ? "Generating Ed25519..."
                      : "Generate Identity"}
                  </button>
                </div>
              </div>
            )}

            {/* --- STEP 7B: CREATED SUMMARY & DOWNLOAD IDENTITY.PEM --- */}
            {step === "created_summary" && (
              <div className="p-6 sm:p-8 flex flex-col max-w-lg mx-auto w-full">
                <div className="text-center mb-5">
                  <span className="font-mono text-2xl font-bold text-emerald-400 block mb-1">
                    [✓]
                  </span>
                  <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.02em] mb-1">
                    Identity Generated
                  </h3>
                  <p className="text-xs text-[#8e98a8]">
                    Your Ed25519 keypair and canonical DID are ready.
                  </p>
                </div>

                {/* DID Key Details */}
                <div className="bg-[#08090c] border border-white/[0.08] rounded-xl p-4 mb-4 font-mono text-xs flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#8e98a8]">
                      CANONICAL DID
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCreatedDid}
                      className="text-[11px] text-[#17A2C6] hover:underline"
                    >
                      {copiedDid ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <div className="text-white text-xs truncate select-all">
                    {createdDid}
                  </div>
                  <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-[#8e98a8]">
                    <span>KEY ALGORITHM</span>
                    <span className="text-white">Ed25519 (0xed01)</span>
                  </div>
                </div>

                {/* Download Button */}
                <button
                  type="button"
                  onClick={handleDownloadCreatedPem}
                  className={`w-full py-3 px-4 rounded-xl border font-mono text-xs font-semibold flex items-center justify-center gap-2 mb-6 transition-colors cursor-pointer ${
                    pemDownloaded
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                      : "bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.1] text-white"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span>
                    {pemDownloaded
                      ? "✓ identity.pem Downloaded"
                      : "Download identity.pem"}
                  </span>
                </button>

                {/* Proceed to Dashboard CTA */}
                <button
                  type="button"
                  onClick={() => handleFinalizeAndProceed(createdDid)}
                  className="w-full bg-[#17A2C6] hover:bg-[#1bb8df] text-[#061d24] font-semibold text-sm py-3.5 px-6 rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  Continue to Dashboard
                </button>
              </div>
            )}

            {/* --- STEP 8A: IMPORT EXISTING AGENT IDENTITY --- */}
            {step === "import_identity" && (
              <div className="p-6 sm:p-8 flex flex-col max-w-lg mx-auto w-full">
                <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.02em] mb-1.5 mt-1">
                  Import Existing Identity
                </h3>
                <p className="text-xs sm:text-[13px] text-[#8e98a8] leading-relaxed mb-5 font-sans">
                  Drag &amp; drop your{" "}
                  <code className="text-white">identity.pem</code> file and
                  enter your passphrase.
                </p>

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files?.[0]) {
                      handleFileChange(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full py-5 px-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-colors mb-4 ${
                    importedPemContent
                      ? "bg-emerald-500/5 border-emerald-500/40"
                      : isDragging
                        ? "bg-[#17A2C6]/10 border-[#17A2C6]"
                        : "bg-[#08090c] border-white/[0.1] hover:border-white/[0.25]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pem,.key,.txt"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  <svg
                    className={`w-6 h-6 mb-2 ${
                      importedPemContent ? "text-emerald-400" : "text-[#8e98a8]"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>

                  <span className="text-xs font-medium text-white">
                    {importedFileName
                      ? importedFileName
                      : "Click to browse or drop identity.pem here"}
                  </span>
                  <span className="text-[11px] text-[#788290] mt-1 font-mono">
                    {importedPemContent
                      ? "✓ PEM Loaded"
                      : "Accepts PKCS#8 encrypted .pem"}
                  </span>
                </div>

                {/* Passphrase Input */}
                <div className="mb-5">
                  <label className="block text-[11px] font-mono font-semibold text-[#8e98a8] uppercase tracking-wider mb-1.5">
                    Passphrase
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showImportPassphrase ? "text" : "password"}
                      placeholder="Enter passphrase to unlock"
                      value={importPassphrase}
                      onChange={(e) => setImportPassphrase(e.target.value)}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          importPassphrase &&
                          importedPemContent
                        ) {
                          handleExecuteImportIdentity();
                        }
                      }}
                      className="w-full bg-[#08090c] border border-white/[0.1] focus:border-[#17A2C6] rounded-xl pl-4 pr-12 py-3 text-sm text-white font-mono placeholder:text-white/20 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowImportPassphrase(!showImportPassphrase)
                      }
                      className="absolute right-3 text-xs font-mono text-[#8e98a8] hover:text-white p-1"
                    >
                      {showImportPassphrase ? "HIDE" : "SHOW"}
                    </button>
                  </div>

                  {errorMessage && (
                    <p className="text-rose-400 text-xs mt-2 font-mono">
                      {errorMessage}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage("");
                      setStep("choose_identity");
                    }}
                    className="flex-1 bg-white/[0.06] hover:bg-white/[0.1] text-[#9ea8b6] hover:text-white font-semibold text-sm py-3 px-4 rounded-xl cursor-pointer transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteImportIdentity}
                    disabled={
                      !importedPemContent || !importPassphrase || isImporting
                    }
                    className="flex-[2] bg-[#17A2C6] hover:bg-[#1bb8df] disabled:opacity-40 disabled:cursor-not-allowed text-[#061d24] font-semibold text-sm py-3 px-4 rounded-xl shadow-md cursor-pointer transition-colors"
                  >
                    {isImporting ? "Decrypting..." : "Validate & Unlock"}
                  </button>
                </div>
              </div>
            )}

            {/* --- STEP 8B: IMPORT SUCCESS & CONFIRMATION --- */}
            {step === "import_success" && (
              <div className="p-6 sm:p-8 flex flex-col max-w-lg mx-auto w-full">
                <div className="text-center mb-5">
                  <span className="font-mono text-2xl font-bold text-emerald-400 block mb-1">
                    [✓]
                  </span>
                  <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.02em] mb-1">
                    Identity Validated
                  </h3>
                  <p className="text-xs text-[#8e98a8]">
                    Your existing Ed25519 identity has been decrypted and
                    verified.
                  </p>
                </div>

                {/* Decrypted DID */}
                <div className="bg-[#08090c] border border-white/[0.08] rounded-xl p-4 mb-6 font-mono text-xs flex flex-col gap-2">
                  <span className="text-[11px] text-[#8e98a8]">
                    DERIVED CANONICAL DID
                  </span>
                  <div className="text-white text-xs truncate select-all">
                    {importDid}
                  </div>
                  <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-[#8e98a8]">
                    <span>STATUS</span>
                    <span className="text-emerald-400 font-semibold">
                      VALID &amp; UNLOCKED
                    </span>
                  </div>
                </div>

                {/* Continue to Dashboard CTA */}
                <button
                  type="button"
                  onClick={() => handleFinalizeAndProceed(importDid)}
                  className="w-full bg-[#17A2C6] hover:bg-[#1bb8df] text-[#061d24] font-semibold text-sm py-3.5 px-6 rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  Continue to Dashboard
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
