/**
 * Mention Watcher Continuous Runner (Daemon Loop)
 * Usage:
 *   npx tsx scripts/run_mention_monitor.ts
 */

import fs from "fs";
import path from "path";

// Native environment variable loader with Windows CRLF handling
function loadEnvFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        val = val.replace(/\r$/, "").trim();
        process.env[key] = val;
      }
    }
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env.local"));
loadEnvFile(path.resolve(process.cwd(), ".env"));

import { runMentionMonitoringCycle } from "../src/lib/mention-monitor";
import { getWatcherCredentials } from "../src/lib/x-watcher";
import { getAgentCredentials } from "../src/lib/x-agent";
import { isSupabaseConfigured } from "../src/lib/supabase/server";
import { isGroqConfigured } from "../src/lib/groq";

const INTERVAL_SECONDS = 300;
const INTERVAL_MS = INTERVAL_SECONDS * 1000;

console.log(
  "==================================================================",
);
console.log(
  "  agentK: Continuous Mention Watcher & Auto-Reply Engine         ",
);
console.log(
  "==================================================================",
);

const watcherCreds = getWatcherCredentials();
const agentCreds = getAgentCredentials();

console.log(
  `[Config] Supabase Configured:   ${isSupabaseConfigured() ? "YES" : "NO"}`,
);
console.log(
  `[Config] Watcher Account Token: ${watcherCreds.authToken ? "Configured (●●●●)" : "Missing"}`,
);
console.log(
  `[Config] Agent Account Token:   ${agentCreds.authToken ? "Configured (●●●●)" : "Missing"}`,
);
console.log(
  `[Config] Groq LLM Model:        ${isGroqConfigured() ? "Active (qwen/qwen3.8-27b)" : "Missing"}`,
);
const TARGET_HANDLE = process.env.TARGET_MENTION_HANDLE || "tryagentk";
console.log(
  `[Loop]   Active — Continuous watch every ${INTERVAL_SECONDS} seconds (Press Ctrl+C to stop)`,
);
console.log(
  "------------------------------------------------------------------\n",
);

let isRunning = false;
let cycleCount = 0;

async function executeCycle() {
  if (isRunning) {
    console.log(
      `[${new Date().toLocaleTimeString()}] Previous cycle is still running. Skipping...`,
    );
    return;
  }

  isRunning = true;
  cycleCount++;
  const startTime = new Date().toLocaleTimeString();
  console.log(`[${startTime}] >>> Starting Watch Cycle #${cycleCount}...`);

  try {
    const summary = await runMentionMonitoringCycle(TARGET_HANDLE);
    console.log(
      `Checked ${summary.registeredUsersChecked} user(s), ` +
        `Found ${summary.totalMatchesFound} mention(s), ` +
        `Confirmed ${summary.confirmedByLlm}, ` +
        `Recorded Replies: ${summary.repliesRecordedSent}, ` +
        `Rejected Replies: ${summary.repliesRejectedSent}.`,
    );

    if (summary.errors.length > 0) {
      console.warn(
        `[${new Date().toLocaleTimeString()}] Cycle Warnings/Errors:`,
        summary.errors,
      );
    }
  } catch (err: any) {
    console.error(
      `[${new Date().toLocaleTimeString()}] Fatal cycle error:`,
      err.message,
    );
  } finally {
    isRunning = false;
    console.log(
      `[${new Date().toLocaleTimeString()}] Next cycle in ${INTERVAL_SECONDS}s...\n`,
    );
  }
}

// Run immediately on launch
executeCycle();

// Set recurring continuous loop
setInterval(executeCycle, INTERVAL_MS);
