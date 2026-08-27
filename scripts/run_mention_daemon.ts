/**
 * Standalone 120-second Mention Watcher & Agent Auto-Reply Runner
 * Usage: npx tsx scripts/run_mention_daemon.ts
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
        // Override or set
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

const INTERVAL_MS = 120 * 1000; // 120 seconds

console.log(
  "==================================================================",
);
console.log(
  "  agentK: Mention Watcher & Autonomous Agent Reply Daemon (120s)  ",
);
console.log(
  "==================================================================",
);

const watcherCreds = getWatcherCredentials();
const agentCreds = getAgentCredentials();

import { isGroqConfigured } from "../src/lib/groq";

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
  `[Config] Groq LLM Model:        ${isGroqConfigured() ? "Active (qwen/qwen3.8-27b)" : "Key Missing (Fallback Heuristics)"}`,
);
console.log(`[Target] Monitoring mentions/tags of: @boomerxbc`);
console.log(`[Scope]  Registered Supabase Users Only`);
console.log(
  `[Action] Auto-reply attaching contribution-recorded-banner.png (NO text) if LLM evaluates TRUE`,
);
console.log(`[Loop]   Running every 120 seconds`);
console.log(
  "------------------------------------------------------------------\n",
);

let isRunning = false;

async function tick() {
  if (isRunning) {
    console.log("[Daemon] Previous cycle is still running. Skipping.");
    return;
  }

  isRunning = true;
  const time = new Date().toLocaleTimeString();
  console.log(`\n[${time}] >>> Starting 120s Monitoring Cycle...`);

  try {
    const summary = await runMentionMonitoringCycle("boomerxbc");
    console.log(
      `[${time}] <<< Cycle Complete: Checked ${summary.registeredUsersChecked} registered user(s), ` +
        `Found ${summary.totalMatchesFound} match(es), Confirmed ${summary.confirmedByLlm}, ` +
        `Replied Recorded: ${summary.repliesRecordedSent}, Replied Rejected: ${summary.repliesRejectedSent}.`,
    );
    if (summary.errors.length > 0) {
      console.warn(`[${time}] Warnings/Errors during cycle:`, summary.errors);
    }
  } catch (err: any) {
    console.error(`[${time}] Fatal cycle error:`, err.message);
  } finally {
    isRunning = false;
  }
}

// Initial execution
tick();

// 120-second interval loop
setInterval(tick, INTERVAL_MS);
