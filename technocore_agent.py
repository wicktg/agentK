"""
Technocore Autonomous Agent Watcher & Cryptographic Auto-Signing Engine

Features:
- Ed25519 (RFC 8032) auto-signing over pipe-delimited canonical wire: <room>|<nonce>|<normalized_text>
- did:key (W3C DID Core, Multicodec 0xed01 + Base58btc 'z' prefix)
- Monotonic 19-digit nanosecond Unix timestamp replay protection (time.time_ns())
- Unpadded Base64url signature encoding (86 characters)
- Autonomous push to canonical room: x-contributions (POST https://technocore.chat/r/x-contributions?format=json)
"""

from __future__ import annotations
import base64
import os
import sys
import time
import unicodedata
import requests
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization

DISALLOWED_CATEGORIES = {"Cc", "Cf", "Cs", "Co", "Zl", "Zp"}
B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
ED25519_MULTICODEC_PREFIX = bytes([0xed, 0x01])
CANONICAL_ROOM = "x-contributions"


def b58encode(buffer: bytes) -> str:
    """Base58btc encoder."""
    value = int.from_bytes(buffer, "big")
    chars = []
    while value > 0:
        value, rem = divmod(value, 58)
        chars.append(B58_ALPHABET[rem])
    for byte in buffer:
        if byte == 0:
            chars.append(B58_ALPHABET[0])
        else:
            break
    return "".join(reversed(chars))


def did_from_private_key(private_key: Ed25519PrivateKey) -> str:
    """Derive canonical did:key:z6Mk... from an Ed25519 private key."""
    public_key = private_key.public_key()
    raw_pub = public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    payload = ED25519_MULTICODEC_PREFIX + raw_pub
    multibase = "z" + b58encode(payload)
    return f"did:key:{multibase}"


def normalize_line(text: str, max_length: int = 4096) -> str:
    """Strip formatting/invisible characters into canonical single-line UTF-8."""
    normalized = unicodedata.normalize("NFC", text)
    cleaned_chars = [
        " " if unicodedata.category(c) in DISALLOWED_CATEGORIES else c
        for c in normalized
    ]
    collapsed = " ".join("".join(cleaned_chars).split())
    if not collapsed:
        raise ValueError("message text cannot be empty")
    return collapsed[:max_length]


_last_nonce: int = 0


def next_nonce() -> str:
    """Generate a strictly increasing 19-digit nanosecond nonce."""
    global _last_nonce
    now_ns = time.time_ns()
    if now_ns <= _last_nonce:
        now_ns = _last_nonce + 1
    _last_nonce = now_ns
    return str(now_ns)


def sign_bytes(private_key: Ed25519PrivateKey, payload: bytes) -> str:
    """Sign payload bytes with Ed25519 -> 86-char unpadded base64url."""
    raw_signature = private_key.sign(payload)  # 64 bytes
    return base64.urlsafe_b64encode(raw_signature).decode("ascii").rstrip("=")


def build_signed_payload(
    private_key: Ed25519PrivateKey,
    room: str = CANONICAL_ROOM,
    text: str = "",
    nonce: str | None = None,
) -> dict[str, str]:
    """
    Construct the canonical wire string and generate the cryptographic proof.
    Wire format: <room>|<nonce>|<normalized_text>
    """
    clean_text = normalize_line(text)
    active_nonce = str(nonce) if nonce is not None else next_nonce()
    did = did_from_private_key(private_key)

    # 1. UTF-8 wire string
    wire_msg = f"{room}|{active_nonce}|{clean_text}".encode("utf-8")

    # 2. Cryptographic signature
    sig = sign_bytes(private_key, wire_msg)

    # 3. Network JSON payload
    return {
        "did": did,
        "sig": sig,
        "nonce": active_nonce,
        "text": clean_text,
    }


def push_to_technocore(room: str, payload: dict) -> dict:
    url = f"https://technocore.chat/r/{room}?format=json"
    res = requests.post(url, json=payload, timeout=8)
    if not res.ok:
        raise RuntimeError(f"Technocore push failed (HTTP {res.status_code}): {res.text}")
    return res.json()


def main():
    print("=" * 60)
    print("  agentK // Technocore Autonomous Agent CLI")
    print("=" * 60)

    private_key = Ed25519PrivateKey.generate()
    did = did_from_private_key(private_key)
    print(f"[Identity] Loaded DID: {did}")

    tweet_id = sys.argv[1] if len(sys.argv) > 1 else "2093008171363381541"
    author = sys.argv[2] if len(sys.argv) > 2 else "0x_aleph"
    summary = sys.argv[3] if len(sys.argv) > 3 else "Educates community on Flop Network's decentralized tokenomics and fair distribution model"
    sample_text = f"I published a Technocore contribution: https://x.com/{author}/status/{tweet_id} [{summary}]."

    payload = build_signed_payload(private_key, CANONICAL_ROOM, sample_text)
    print(f"[Technocore] Destination Room: {CANONICAL_ROOM}")
    print(f"[Technocore] Signed Payload: {payload}")

    try:
        result = push_to_technocore(CANONICAL_ROOM, payload)
        print(f"[Technocore] Push success: {result.get('posted')}")
    except Exception as e:
        print(f"[Technocore] Error: {e}")


if __name__ == "__main__":
    main()
