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

const BEARER =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

async function testCredentials(name: string, authToken?: string, ct0?: string) {
  console.log(`\n--- Testing ${name} ---`);
  console.log(
    `Auth Token: ${authToken ? authToken.slice(0, 8) + "..." : "MISSING"}`,
  );
  console.log(`CT0:        ${ct0 ? ct0.slice(0, 12) + "..." : "MISSING"}`);

  if (!authToken || !ct0) return;

  const res = await fetch(
    "https://x.com/i/api/1.1/account/verify_credentials.json",
    {
      headers: {
        Authorization: `Bearer ${BEARER}`,
        "User-Agent": USER_AGENT,
        "X-Csrf-Token": ct0,
        "X-Twitter-Auth-Type": "OAuth2Session",
        "X-Twitter-Active-User": "yes",
        Cookie: `auth_token=${authToken}; ct0=${ct0}`,
      },
    },
  );

  console.log(`Status: ${res.status}`);
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    if (json.screen_name) {
      console.log(`✓ Authenticated as: @${json.screen_name} (${json.name})`);
    } else {
      console.log(`Response:`, json);
    }
  } catch {
    console.log(`Response:`, text.slice(0, 200));
  }
}

async function run() {
  await testCredentials(
    "WATCHER ACCOUNT",
    process.env.WATCHER_TWITTER_AUTH_TOKEN,
    process.env.WATCHER_TWITTER_CT0,
  );
  await testCredentials(
    "AGENT ACCOUNT",
    process.env.AGENT_TWITTER_AUTH_TOKEN,
    process.env.AGENT_TWITTER_CT0,
  );
}

run().catch(console.error);
