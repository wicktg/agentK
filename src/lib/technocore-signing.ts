import crypto from "crypto";
import { didFromKeyObject } from "./crypto";
import { enforceActionVerb } from "./groq";

// Unicode disallowed control/invisible categories to strip: Cc, Cf, Cs, Co, Zl, Zp
const DISALLOWED_UNICODE_REGEX = /[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Zl}\p{Zp}]/gu;

export const CANONICAL_TECHNOCORE_ROOM = "x-contributions";

export function normalizeTweetType(
  type?: string,
): "post" | "article" | "thread" {
  const lower = (type || "").toLowerCase().trim();
  if (lower === "article") return "article";
  if (lower === "thread") return "thread";
  return "post";
}

/**
 * Normalizes text into canonical single-line UTF-8 (NFC)
 * Strips invisible/control Unicode categories and collapses whitespace.
 */
export function normalizeLine(text: string, maxLength: number = 4096): string {
  if (!text) {
    throw new Error("Message text cannot be empty");
  }

  // 1. NFC normalization
  const normalized = text.normalize("NFC");

  // 2. Replace disallowed unicode categories with a single space
  const cleaned = normalized.replace(DISALLOWED_UNICODE_REGEX, " ");

  // 3. Collapse whitespace and trim
  const collapsed = cleaned.trim().replace(/\s+/g, " ");

  if (!collapsed) {
    throw new Error("Message text cannot be empty after normalization");
  }

  return collapsed.slice(0, maxLength);
}

/**
 * Generates a strictly monotonic 19-digit nanosecond Unix timestamp nonce
 */
let lastGeneratedNonce = BigInt(0);

export function generateNanosecondNonce(): string {
  const millis = BigInt(Date.now());
  const hrTime = process.hrtime();
  const nanos = BigInt(hrTime[1] % 1_000_000);
  let currentNonce = millis * BigInt(1_000_000) + nanos;

  if (currentNonce <= lastGeneratedNonce) {
    currentNonce = lastGeneratedNonce + BigInt(1);
  }
  lastGeneratedNonce = currentNonce;

  return currentNonce.toString();
}

/**
 * Encodes a buffer to unpadded Base64url (RFC 4648 §5, 86 chars for Ed25519 signature)
 */
export function base64urlUnpadded(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export interface TechnocoreSignedPayload {
  did: string;
  sig: string;
  nonce: string;
  text: string;
}

export interface TechnocoreRoomMessage {
  seq: number;
  ts: string;
  from?: string;
  did?: string;
  text: string;
  nonce: string | number;
}

/**
 * Signs payload bytes with Ed25519 KeyObject and outputs 86-char unpadded Base64url signature
 */
export function signPayloadBytes(
  privateKey: crypto.KeyObject,
  payloadBytes: Buffer,
): string {
  const signature = crypto.sign(null, payloadBytes, privateKey);
  return base64urlUnpadded(signature);
}

/**
 * Retrieves or instantiates the active Ed25519 signing key.
 * Strictly guarantees that privateKey mathematically matches the derived DID.
 */
export function getOrCreateSigningKey(): {
  privateKey: crypto.KeyObject;
  did: string;
} {
  const envKey =
    process.env.TECHNOCORE_PRIVATE_KEY ||
    process.env.AGENT_SIGNING_KEY ||
    process.env.AGENT_PRIVATE_KEY_PEM;

  if (envKey) {
    try {
      const privateKey = crypto.createPrivateKey({
        key: envKey.includes("-----BEGIN")
          ? envKey
          : Buffer.from(envKey, "base64"),
        format: envKey.includes("-----BEGIN") ? "pem" : "der",
        type: "pkcs8",
      });
      const did = didFromKeyObject(privateKey);
      return { privateKey, did };
    } catch (err: any) {
      console.warn(
        "[Technocore] Could not load env private key, generating keypair:",
        err.message,
      );
    }
  }

  // Generate an authentic Ed25519 keypair and derive its exact corresponding DID
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const did = didFromKeyObject(publicKey);
  return { privateKey, did };
}

/**
 * Formats standard Technocore contribution text:
 * "I published an X contribution: https://x.com/<author>/status/<id> where I <10-12 words summary>."
 */
export function formatContributionText(
  authorHandle: string,
  tweetId: string,
  summary: string = "break down key ecosystem tokenomics and incentive mechanisms for Flop Network",
): string {
  const cleanHandle = authorHandle.replace(/^@/, "").trim();
  const cleanSummary = enforceActionVerb(summary || "");

  // Format: "I published an X contribution: https://x.com/<author>/status/<id> where I 10-12 words here."
  return `I published an X contribution: https://x.com/${cleanHandle}/status/${tweetId} where I ${cleanSummary}.`;
}

export function formatStandardContributionText(
  authorHandle: string,
  tweetId: string,
  summary?: string,
): string {
  return formatContributionText(authorHandle, tweetId, summary);
}

/**
 * Constructs the canonical wire string and generates the cryptographic proof.
 * Wire format: <room>|<nonce>|<normalized_text>
 */
export function buildSignedTechnocorePayload(
  privateKey: crypto.KeyObject,
  room: string = CANONICAL_TECHNOCORE_ROOM,
  text: string,
  nonce?: string,
): TechnocoreSignedPayload {
  const cleanText = normalizeLine(text);
  const activeNonce = nonce || generateNanosecondNonce();
  const did = didFromKeyObject(privateKey);

  // 1. Construct canonical UTF-8 wire string: <room>|<nonce>|<normalized_text>
  const wireString = `${room}|${activeNonce}|${cleanText}`;
  const wireBytes = Buffer.from(wireString, "utf-8");

  // 2. Cryptographic signature (86-character unpadded Base64url)
  const sig = signPayloadBytes(privateKey, wireBytes);

  return {
    did,
    sig,
    nonce: activeNonce,
    text: cleanText,
  };
}

/**
 * Canonical Technocore room destination URL: https://technocore.chat/r/<room>
 */
export function getTechnocoreDestinationUrl(
  room: string = CANONICAL_TECHNOCORE_ROOM,
): string {
  const baseUrl = (
    process.env.TECHNOCORE_BASE_URL || "https://technocore.chat"
  ).replace(/\/$/, "");
  return `${baseUrl}/r/${room}`;
}

/**
 * Fetch live messages from Technocore room to resolve real assigned sequence numbers
 */
export async function fetchTechnocoreRoomMessages(
  room: string = CANONICAL_TECHNOCORE_ROOM,
): Promise<TechnocoreRoomMessage[]> {
  try {
    const baseUrl = (
      process.env.TECHNOCORE_BASE_URL || "https://technocore.chat"
    ).replace(/\/$/, "");
    const endpoint = `${baseUrl}/r/${room}?format=json`;
    const res = await fetch(endpoint, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.messages)) {
        return data.messages;
      }
    }
  } catch (err: any) {
    console.warn(
      `[Technocore] Could not fetch room messages from /r/${room}:`,
      err.message,
    );
  }
  return [];
}

/**
 * Autonomous Technocore network push dispatcher.
 * Dispatches to POST https://technocore.chat/r/<room>?format=json.
 * Returns true success and assigned sequence number on HTTP 200/201.
 */
export async function pushContributionToTechnocore(
  room: string = CANONICAL_TECHNOCORE_ROOM,
  payload: TechnocoreSignedPayload,
): Promise<{
  success: boolean;
  url: string;
  room: string;
  seq?: number;
  error?: string;
}> {
  const baseUrl = (
    process.env.TECHNOCORE_BASE_URL || "https://technocore.chat"
  ).replace(/\/$/, "");
  const destinationUrl = getTechnocoreDestinationUrl(room);
  const endpoint = `${baseUrl}/r/${room}?format=json`;

  console.log(`[Technocore] Dispatching signed payload to ${endpoint}...`);
  console.log(`[Technocore] DID: ${payload.did}`);
  console.log(`[Technocore] Nonce: ${payload.nonce}`);
  console.log(`[Technocore] Text: ${payload.text}`);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const assignedSeq = typeof data.seq === "number" ? data.seq : undefined;
      console.log(
        `[Technocore] Successfully pushed contribution to /r/${room}! Assigned SEQ #${assignedSeq ?? "pending"}`,
      );
      return {
        success: true,
        url: destinationUrl,
        room,
        seq: assignedSeq,
      };
    }

    const errBody = await res.text().catch(() => "");
    const errorMsg = `HTTP ${res.status}: ${errBody || res.statusText}`;
    console.error(`[Technocore] Push failed to /r/${room}: ${errorMsg}`);

    return {
      success: false,
      url: destinationUrl,
      room,
      error: errorMsg,
    };
  } catch (err: any) {
    const errorMsg = err.message || "Network request failed";
    console.error(`[Technocore] Push exception to /r/${room}: ${errorMsg}`);
    return {
      success: false,
      url: destinationUrl,
      room,
      error: errorMsg,
    };
  }
}
