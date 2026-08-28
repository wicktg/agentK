/**
 * 300-Second (5-Minute) Background Mention Daemon
 * Runs every 300 seconds to scan registered Supabase accounts for @boomerxbc mentions.
 */

import {
  runMentionMonitoringCycle,
  CycleSummary,
} from "../lib/mention-monitor";

const INTERVAL_MS = 300 * 1000; // 300 seconds (5 minutes)
let isRunning = false;
let intervalHandle: NodeJS.Timeout | null = null;
let lastCycleSummary: CycleSummary | null = null;

export async function executeWatcherStep() {
  if (isRunning) {
    console.log("[Daemon] Previous cycle is still running. Skipping overlap.");
    return;
  }

  isRunning = true;
  try {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`\n======================================================`);
    console.log(
      `[Daemon] [${timestamp}] Running 300s Mention Monitoring Cycle`,
    );
    console.log(`======================================================`);

    const target = process.env.TARGET_MENTION_HANDLE || "haxexbc";
    lastCycleSummary = await runMentionMonitoringCycle(target);
  } catch (err: any) {
    console.error("[Daemon] Uncaught error in monitoring cycle:", err.message);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the 300-second background daemon loop
 */
export function startMentionWatcherDaemon() {
  if (intervalHandle) {
    console.log("[Daemon] Daemon is already running.");
    return;
  }

  console.log(`[Daemon] Starting 300-second Mention Watcher Daemon...`);
  // Run immediately on start
  executeWatcherStep();

  // Schedule recurring 300-second interval
  intervalHandle = setInterval(executeWatcherStep, INTERVAL_MS);
}

/**
 * Stop the background daemon
 */
export function stopMentionWatcherDaemon() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log("[Daemon] Mention Watcher Daemon stopped.");
  }
}

export function getDaemonStatus() {
  return {
    active: Boolean(intervalHandle),
    isProcessing: isRunning,
    intervalSeconds: 300,
    lastSummary: lastCycleSummary,
  };
}
