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

async function checkViewer() {
  const url = "https://x.com/i/api/graphql/k_gM4qQ1bE26kM73d1bX5g/Viewer";
  const res = await fetch(url, {
    headers: {
      Authorization:
        "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      "X-Csrf-Token": ct0!,
      "X-Twitter-Auth-Type": "OAuth2Session",
      "X-Twitter-Active-User": "yes",
      Origin: "https://x.com",
      Referer: "https://x.com/",
      Cookie: `auth_token=${authToken}; ct0=${ct0}`,
    },
  });

  console.log("Viewer GraphQL Status:", res.status);
  const json = await res.json();
  console.log("Viewer Response:", JSON.stringify(json).slice(0, 300));
}

checkViewer().catch(console.error);
