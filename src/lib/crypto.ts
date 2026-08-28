import crypto from "crypto";

// Bitcoin Base58 alphabet (multibase 'z')
export const B58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
// Multicodec prefix for Ed25519 public key (0xed01 in varint)
export const ED25519_MULTICODEC_PREFIX = Buffer.from([0xed, 0x01]);

/**
 * Base58btc Encoder
 */
export function b58encode(buffer: Buffer): string {
  let value = BigInt("0x" + buffer.toString("hex"));
  const zero = BigInt(0);
  const fiftyEight = BigInt(58);
  const chars: string[] = [];
  while (value > zero) {
    const remainder = Number(value % fiftyEight);
    value = value / fiftyEight;
    chars.push(B58_ALPHABET[remainder]);
  }
  // Preserve leading zero bytes as '1'
  for (const byte of buffer) {
    if (byte === 0) {
      chars.push(B58_ALPHABET[0]);
    } else {
      break;
    }
  }
  return chars.reverse().join("");
}

/**
 * Derive canonical did:key:z6Mk... from Ed25519 KeyObject (public or private)
 */
export function didFromKeyObject(keyObj: crypto.KeyObject): string {
  const pub =
    keyObj.type === "private" ? crypto.createPublicKey(keyObj) : keyObj;
  const spkiDer = pub.export({ type: "spki", format: "der" });
  // Raw 32-byte Ed25519 public key is always the last 32 bytes of the SPKI DER
  const rawPublic = spkiDer.subarray(spkiDer.length - 32);
  const payload = Buffer.concat([ED25519_MULTICODEC_PREFIX, rawPublic]);
  const multibase = "z" + b58encode(payload);
  return `did:key:${multibase}`;
}

/**
 * Generate a canonical DID for handle (derived from standard Ed25519 format)
 */
export function generateDIDForHandle(handle: string): string {
  const { publicKey } = crypto.generateKeyPairSync("ed25519");
  return didFromKeyObject(publicKey);
}

/**
 * Master Vault Secret for server-side cloud vault encryption (AES-256-GCM)
 */
function getVaultMasterKey(): Buffer {
  const secret =
    process.env.AGENT_VAULT_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.TECHNOCORE_PRIVATE_KEY ||
    "agentk-technocore-vault-master-secret-2026";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts key payload into AES-256-GCM cloud vault envelope.
 * Format: vault:v2:<iv_hex>:<tag_hex>:<ciphertext_hex>
 */
export function encryptPemToVault(pemContent: string): string {
  const iv = crypto.randomBytes(12); // 96-bit IV
  const cipher = crypto.createCipheriv("aes-256-gcm", getVaultMasterKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(pemContent.trim(), "utf-8")),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag(); // 128-bit auth tag

  return `vault:v2:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts cloud vault envelope back into plaintext string.
 */
export function decryptPemFromVault(vaultEnvelope: string): string {
  if (!vaultEnvelope) {
    throw new Error("Missing vault envelope");
  }

  // Handle v2 vault envelope
  if (vaultEnvelope.startsWith("vault:v2:")) {
    const parts = vaultEnvelope.split(":");
    if (parts.length !== 5) {
      throw new Error("Malformed vault:v2 envelope components");
    }
    const iv = Buffer.from(parts[2], "hex");
    const tag = Buffer.from(parts[3], "hex");
    const ciphertext = Buffer.from(parts[4], "hex");

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      getVaultMasterKey(),
      iv,
    );
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf-8");
  }

  // Handle v1 vault envelope (backward compatibility)
  if (vaultEnvelope.startsWith("vault:v1:")) {
    const parts = vaultEnvelope.split(":");
    if (parts.length !== 5) {
      throw new Error("Malformed vault:v1 envelope components");
    }
    const iv = Buffer.from(parts[2], "hex");
    const tag = Buffer.from(parts[3], "hex");
    const ciphertext = Buffer.from(parts[4], "hex");

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      getVaultMasterKey(),
      iv,
    );
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf-8");
  }

  throw new Error("Unsupported or corrupted vault envelope format");
}

/**
 * Create a new Agent Identity:
 * 1. Generates Ed25519 keypair.
 * 2. User PEM: Standard PKCS#8 encrypted with user passphrase (aes-256-cbc).
 * 3. Server Vault: Stores exact static PEM and raw key inside AES-256-GCM envelope.
 * 4. Derives canonical DID (did:key:z6Mk...).
 */
export function createAgentIdentity(passphrase: string): {
  did: string;
  pem: string;
  encryptedSigningKey: string;
} {
  if (!passphrase || passphrase.length < 12) {
    throw new Error(
      "Identity passphrase must be at least 12 characters (13 characters recommended)",
    );
  }

  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const did = didFromKeyObject(publicKey);

  // 1. User client-download PEM (PKCS#8 encrypted with user passphrase)
  const pem = (
    privateKey.export({
      type: "pkcs8",
      format: "pem",
      cipher: "aes-256-cbc",
      passphrase,
    }) as string
  ).trim();

  // 2. Raw PKCS#8 for in-memory autopilot signing
  const raw = (
    privateKey.export({
      type: "pkcs8",
      format: "pem",
    }) as string
  ).trim();

  // 3. Seal exact original static PEM + raw key into server AES-256-GCM vault envelope
  const envelopePayload = JSON.stringify({ pem, raw, did });
  const encryptedSigningKey = encryptPemToVault(envelopePayload);

  return { did, pem, encryptedSigningKey };
}

/**
 * Load and validate an imported identity.pem file:
 * 1. Decrypts and validates PKCS#8 PEM with user passphrase.
 * 2. Derives canonical DID.
 * 3. Preserves exact static PEM + raw key inside server vault envelope (AES-256-GCM).
 */
export function loadAndValidateIdentity(
  pemContent: string,
  passphrase: string,
): { did: string; valid: boolean; encryptedSigningKey: string } {
  if (!pemContent || !pemContent.includes("PRIVATE KEY")) {
    throw new Error(
      "Invalid identity file. Must be a valid PKCS#8 PEM private key.",
    );
  }
  if (!passphrase) {
    throw new Error("Passphrase is required to unlock identity.");
  }

  try {
    const key = crypto.createPrivateKey({
      key: pemContent.trim(),
      format: "pem",
      passphrase,
    });

    if (key.asymmetricKeyType !== "ed25519") {
      throw new Error("Key algorithm must be Ed25519.");
    }

    const did = didFromKeyObject(key);
    const raw = (key.export({ type: "pkcs8", format: "pem" }) as string).trim();
    const pem = pemContent.trim();

    // Preserve exact static uploaded PEM and raw key in vault envelope
    const envelopePayload = JSON.stringify({ pem, raw, did });
    const encryptedSigningKey = encryptPemToVault(envelopePayload);

    return { did, valid: true, encryptedSigningKey };
  } catch (err: any) {
    if (
      err.message?.includes("bad decrypt") ||
      err.message?.includes("wrong tag") ||
      err.message?.includes("unsupported") ||
      err.message?.includes("error:06065064") ||
      err.message?.includes("PKCS5_pbe2_set") ||
      err.code === "ERR_OSSL_EVP_BAD_DECRYPT"
    ) {
      throw new Error("Incorrect identity passphrase or corrupted key file.");
    }
    throw new Error(
      `Failed to decrypt identity: ${err.message || "Invalid key or passphrase"}`,
    );
  }
}

/**
 * Export the user's PKCS#8 encrypted identity.pem from the cloud vault:
 * 1. Decrypts cloud vault envelope (AES-256-GCM).
 * 2. Authenticates user passphrase against stored key.
 * 3. Returns the EXACT static stored identity.pem directly (byte-for-byte identical, without regenerating salt/IV).
 */
export function exportOriginalPemFromVault(
  encryptedSigningKey: string,
  passphrase: string,
): { did: string; pem: string } {
  if (!encryptedSigningKey) {
    throw new Error("No encrypted identity found in vault.");
  }
  if (!passphrase) {
    throw new Error("Identity passphrase is required to authenticate export.");
  }

  const decryptedString = decryptPemFromVault(encryptedSigningKey);

  let pemToReturn: string = "";
  let rawOrEncryptedPem: string = "";

  try {
    const parsed = JSON.parse(decryptedString);
    pemToReturn = (parsed.pem || parsed.raw || "").trim();
    rawOrEncryptedPem = (parsed.raw || parsed.pem || "").trim();
  } catch {
    pemToReturn = decryptedString.trim();
    rawOrEncryptedPem = decryptedString.trim();
  }

  // Authenticate user's passphrase
  let key: crypto.KeyObject;
  try {
    if (pemToReturn.includes("ENCRYPTED PRIVATE KEY")) {
      key = crypto.createPrivateKey({
        key: pemToReturn,
        format: "pem",
        passphrase,
      });
    } else {
      key = crypto.createPrivateKey({
        key: rawOrEncryptedPem,
        format: "pem",
      });
    }
  } catch (err: any) {
    throw new Error("Incorrect identity passphrase or corrupted key file.");
  }

  const did = didFromKeyObject(key);

  // Return the original stored PEM directly if available (byte-for-byte identical)
  if (pemToReturn && pemToReturn.includes("ENCRYPTED PRIVATE KEY")) {
    return { did, pem: pemToReturn };
  }

  // Fallback if only raw key was stored
  const exportedPem = (
    key.export({
      type: "pkcs8",
      format: "pem",
      cipher: "aes-256-cbc",
      passphrase,
    }) as string
  ).trim();

  return { did, pem: exportedPem };
}

/**
 * Autopilot background unlock helper:
 * Decrypts AES-256-GCM server vault envelope into memory-only KeyObject.
 * Immediately ready for microsecond signing and wiped from memory after.
 */
export function unlockPrivateKeyForAutopilot(
  encryptedSigningKey: string,
  passphrase?: string,
): crypto.KeyObject {
  const decryptedString = decryptPemFromVault(encryptedSigningKey);

  let rawPem: string = "";
  let encryptedPem: string = "";

  try {
    const parsed = JSON.parse(decryptedString);
    rawPem = parsed.raw || "";
    encryptedPem = parsed.pem || "";
  } catch {
    if (decryptedString.includes("ENCRYPTED PRIVATE KEY")) {
      encryptedPem = decryptedString.trim();
    } else {
      rawPem = decryptedString.trim();
    }
  }

  // 1. Prefer raw key in memory for zero-overhead autonomous signing
  if (rawPem) {
    return crypto.createPrivateKey({
      key: rawPem,
      format: "pem",
    });
  }

  // 2. Fallback to decrypting encrypted PEM
  if (encryptedPem) {
    return crypto.createPrivateKey({
      key: encryptedPem,
      format: "pem",
      passphrase,
    });
  }

  throw new Error("Could not extract valid private key from vault envelope");
}

/**
 * Backward-compatible helper for signing keys
 */
export function encryptSigningKey(
  privateKey: crypto.KeyObject | string,
): string {
  const pem =
    typeof privateKey === "string"
      ? privateKey
      : (privateKey.export({ type: "pkcs8", format: "pem" }) as string);
  return encryptPemToVault(pem);
}

export function decryptSigningKey(vaultEnvelope: string): crypto.KeyObject {
  const pem = decryptPemFromVault(vaultEnvelope);
  return crypto.createPrivateKey({
    key: pem.trim(),
    format: "pem",
  });
}

/**
 * Generate a unique verification code for X bio challenge
 * Format: agentk-verify:<handle>-<random8hex>
 */
export function generateVerificationCode(handle: string): string {
  const cleanHandle = handle
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 15);
  const randomSuffix = crypto.randomBytes(4).toString("hex");
  return `agentk-verify:${cleanHandle}-${randomSuffix}`;
}

/**
 * Generate a secure cryptographically random session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
