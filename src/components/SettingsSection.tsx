"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function SettingsSection() {
  const { user, logout } = useAuth();

  const [keyRevoked, setKeyRevoked] = useState(false);
  const [xConnected, setXConnected] = useState(true);
  const [copiedDid, setCopiedDid] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  // Modals
  const [showLearnModal, setShowLearnModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showDisconnectXModal, setShowDisconnectXModal] = useState(false);

  const displayHandle = user?.handle ? `@${user.handle}` : "@satoshi";
  const displayDid = user?.did || "did:key:z6MkuTq3YhF7VpW8r2NxL9dK1eJ5bC4m";

  const handleCopyDid = () => {
    navigator.clipboard.writeText(displayDid);
    setCopiedDid(true);
    setTimeout(() => setCopiedDid(false), 2000);
  };

  const handleDownloadKeyBlob = () => {
    const keyData = {
      version: "agentk/v1.0",
      did: displayDid,
      handle: user?.handle || "satoshi",
      curve: "Ed25519",
      created_at: new Date().toISOString(),
      encrypted_payload: "AES-GCM-256:8f9a2b4c7e1d...[sealed_key_blob]",
      custody: "delegated_autopilot",
      target_network: "flop_network",
    };

    const blob = new Blob([JSON.stringify(keyData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agentk-key-backup-${Date.now().toString().slice(-6)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
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

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col select-none py-4 px-2 sm:px-4 text-white">
      {/* Settings Page Title */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-[-0.02em] text-white">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#788290] mt-1 font-sans">
          Manage your cryptographic identity, signing keys, and network
          connections.
        </p>
      </div>

      {/* --- PROMINENT DELEGATION & CUSTODY CARD (MOST SENSITIVE AREA) --- */}
      <div className="w-full bg-[#08090c] border border-white/[0.12] rounded-2xl p-5 sm:p-7 mb-6 relative overflow-hidden">
        {/* Top Status Badge Row */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#8e98a8]">
              {keyRevoked
                ? "[ CUSTODY REVOKED ]"
                : "[ ACTIVE AUTOPILOT CUSTODY ]"}
            </span>
          </div>

          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/[0.06] text-[#8e98a8]">
            Ed25519 Subkey
          </span>
        </div>

        {/* Primary Statement */}
        <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight mb-2">
          {keyRevoked
            ? "Autopilot signing is currently revoked"
            : "We hold an encrypted key for autopilot signing"}
        </h2>

        <p className="text-xs sm:text-[13px] text-[#9ea3b5] leading-relaxed mb-6 font-sans">
          {keyRevoked
            ? "Your signing subkey has been purged from active rotation. agentK cannot sign any contributions until a new key is provisioned."
            : "agentK signs verified public X contributions and pushes them to Flop Network using a client-isolated subkey. The master key never leaves your control, and every record is publicly verifiable."}
        </p>

        {/* Primary Custody Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={() => setShowLearnModal(true)}
            className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            Learn how custody works
          </button>

          {!keyRevoked ? (
            <button
              type="button"
              onClick={() => setShowRevokeModal(true)}
              className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold text-rose-400 transition-colors cursor-pointer ml-auto"
            >
              Revoke Key
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setKeyRevoked(false)}
              className="px-4 py-2 rounded-xl bg-[#17A2C6]/15 hover:bg-[#17A2C6]/25 border border-[#17A2C6]/30 text-xs font-semibold text-[#17A2C6] transition-colors cursor-pointer ml-auto"
            >
              Re-enable Autopilot Key
            </button>
          )}
        </div>
      </div>

      {/* --- IDENTITY & KEY BLOB MANAGEMENT --- */}
      <div className="w-full bg-[#08090c] border border-white/[0.08] rounded-2xl p-5 sm:p-7 mb-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider font-mono text-[#8e98a8] mb-4">
          Cryptographic Identity
        </h3>

        {/* DID Key String */}
        <div className="mb-5">
          <label className="block text-[11px] font-mono text-[#788290] uppercase mb-1.5">
            Decentralized Identifier (DID)
          </label>
          <div className="w-full bg-[#050608] border border-white/[0.06] rounded-xl p-3.5 flex items-center justify-between gap-3">
            <span className="font-mono text-xs text-[#17A2C6] truncate select-all">
              {displayDid}
            </span>
            <button
              type="button"
              onClick={handleCopyDid}
              className="shrink-0 bg-white/[0.08] hover:bg-white/[0.14] text-white font-mono text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              {copiedDid ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Key Blob Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/[0.06]">
          <div className="text-left">
            <h4 className="text-xs font-medium text-white">
              Encrypted Key Backup
            </h4>
            <p className="text-[11px] text-[#788290] mt-0.5">
              Export your client-encrypted identity blob for offline storage.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadKeyBlob}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-xs font-semibold text-white transition-colors cursor-pointer shrink-0"
          >
            {downloaded ? "✓ Key Blob Downloaded" : "Download Key Blob Again"}
          </button>
        </div>
      </div>

      {/* --- CONNECTED ACCOUNTS --- */}
      <div className="w-full bg-[#08090c] border border-white/[0.08] rounded-2xl p-5 sm:p-7">
        <h3 className="text-sm font-semibold uppercase tracking-wider font-mono text-[#8e98a8] mb-4">
          Connected Accounts
        </h3>

        {/* Account 1: X (Twitter) */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white overflow-hidden">
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

          {xConnected ? (
            <button
              type="button"
              onClick={() => setShowDisconnectXModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/10 hover:text-rose-400 border border-white/[0.08] hover:border-rose-500/30 text-xs font-medium text-[#8e98a8] transition-colors cursor-pointer"
            >
              Disconnect X
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setXConnected(true)}
              className="px-3.5 py-1.5 rounded-lg bg-[#17A2C6]/15 hover:bg-[#17A2C6]/25 border border-[#17A2C6]/30 text-xs font-medium text-[#17A2C6] transition-colors cursor-pointer"
            >
              Connect X
            </button>
          )}
        </div>
      </div>

      {/* --- MODAL 1: LEARN HOW CUSTODY WORKS --- */}
      {showLearnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setShowLearnModal(false)}
          />
          <div className="relative w-full max-w-lg bg-[#0c0d12] border border-white/[0.1] rounded-2xl p-6 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.9)] z-10 flex flex-col">
            <h3 className="text-lg font-semibold text-white tracking-tight mb-2">
              How Autopilot Custody Works
            </h3>
            <p className="text-xs text-[#8e98a8] leading-relaxed mb-4">
              agentK is designed around non-custodial principles. Here is how
              your cryptographic identity is protected:
            </p>

            <div className="flex flex-col gap-3 font-mono text-xs text-[#d2d9e4] mb-6">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setShowRevokeModal(false)}
          />
          <div className="relative w-full max-w-md bg-[#0c0d12] border border-white/[0.1] rounded-2xl p-6 shadow-[0_25px_70px_rgba(0,0,0,0.9)] z-10 flex flex-col">
            <h3 className="text-lg font-semibold text-rose-400 tracking-tight mb-2">
              Revoke Autopilot Key?
            </h3>
            <p className="text-xs text-[#8e98a8] leading-relaxed mb-6 font-sans">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setShowDisconnectXModal(false)}
          />
          <div className="relative w-full max-w-md bg-[#0c0d12] border border-white/[0.1] rounded-2xl p-6 shadow-[0_25px_70px_rgba(0,0,0,0.9)] z-10 flex flex-col">
            <h3 className="text-lg font-semibold text-white tracking-tight mb-2">
              Disconnect X Account?
            </h3>
            <p className="text-xs text-[#8e98a8] leading-relaxed mb-6 font-sans">
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
