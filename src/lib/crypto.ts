import crypto from "crypto";

// Bitcoin Base58 alphabet (multibase 'z')
export const B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
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
 * Create a new Technocore Agent Identity:
 * 1. Generates Ed25519 keypair
 * 2. Encrypts into standard PKCS#8 PEM with AES-256-CBC using user passphrase
 * 3. Derives 56-character canonical did:key:z6Mk...
 */
export function createAgentIdentity(passphrase: string): {
  did: string;
  pem: string;
} {
  if (!passphrase || passphrase.length < 12) {
    throw new Error("Identity passphrase must be at least 12 characters (13 characters recommended)");
  }

  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const did = didFromKeyObject(publicKey);

  const pem = privateKey.export({
    type: "pkcs8",
    format: "pem",
    cipher: "aes-256-cbc",
    passphrase,
  }) as string;

  return { did, pem };
}

/**
 * Load and validate an existing identity.pem with passphrase
 */
export function loadAndValidateIdentity(
  pemContent: string,
  passphrase: string
): { did: string; valid: boolean } {
  if (!pemContent || !pemContent.includes("PRIVATE KEY")) {
    throw new Error("Invalid identity file. Must be a valid PKCS#8 PEM private key.");
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
    return { did, valid: true };
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
    throw new Error(`Failed to decrypt identity: ${err.message || "Invalid key or passphrase"}`);
  }
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
