import { NextRequest, NextResponse } from "next/server";
import { runMentionMonitoringCycle } from "@/lib/mention-monitor";
import { getDaemonStatus, executeWatcherStep } from "@/services/mention-daemon";

export async function GET() {
  const status = getDaemonStatus();
  return NextResponse.json({
    success: true,
    daemon: status,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const target =
      body?.targetHandle || process.env.TARGET_MENTION_HANDLE || "tryagentk";

    const summary = await runMentionMonitoringCycle(target);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to run monitoring cycle",
      },
      { status: 500 },
    );
  }
}
