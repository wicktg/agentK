import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed
        .slice(eqIdx + 1)
        .trim()
        .replace(/^["']|["']$/g, "")
        .replace(/\r$/, "");
      process.env[key] = val;
    }
  }
}

const authToken = process.env.AGENT_TWITTER_AUTH_TOKEN;
const ct0 = process.env.AGENT_TWITTER_CT0;

const BEARER =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

async function testInitWithBody() {
  const uploadEndpoint = "https://upload.twitter.com/1.1/media/upload.json";
  const filePath = path.join(
    process.cwd(),
    "public",
    "contribution-recorded-banner.png",
  );
  const fileBuffer = fs.readFileSync(filePath);

  const initParams = new URLSearchParams({
    command: "INIT",
    total_bytes: fileBuffer.length.toString(),
    media_type: "image/png",
    media_category: "tweet_image",
  });

  console.log("Sending INIT with parameters in POST BODY...");
  const res = await fetch(uploadEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BEARER}`,
      "User-Agent": USER_AGENT,
      "X-Csrf-Token": ct0!,
      "X-Twitter-Auth-Type": "OAuth2Session",
      "X-Twitter-Active-User": "yes",
      "X-Twitter-Client-Language": "en",
      Origin: "https://x.com",
      Referer: "https://x.com/",
      Cookie: `auth_token=${authToken}; ct0=${ct0}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: initParams.toString(),
  });

  console.log("Status:", res.status);
  const data = await res.text();
  console.log("Response:", data);
}

testInitWithBody().catch(console.error);
