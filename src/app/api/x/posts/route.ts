import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const userCookie = req.cookies.get("agentk_user")?.value;
    let handle = "";
    if (userCookie) {
      try {
        const user = JSON.parse(userCookie);
        handle = user.handle?.toLowerCase()?.replace(/^@/, "");
      } catch {}
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ posts: [] });
    }

    const supabase = getSupabaseAdmin();

    // 1. Fetch confirmed contributions from x_contributions table
    let contribQuery = supabase
      .from("x_contributions")
      .select("*")
      .or("is_relevant.eq.true,status.eq.replied")
      .order("posted_at", { ascending: false });

    if (handle) {
      contribQuery = contribQuery.eq("user_handle", handle);
    }

    const { data: contributions, error: contribError } = await contribQuery;

    // 2. Fetch from x_posts table
    let postsQuery = supabase
      .from("x_posts")
      .select("*")
      .order("scheduled_for", { ascending: true });

    if (handle) {
      postsQuery = postsQuery.eq("x_handle", handle);
    }

    const { data: posts } = await postsQuery;

    // Map confirmed contributions to calendar items
    const mappedContributions = (contributions || []).map((c: any) => ({
      id: c.tweet_id || c.id,
      text: c.content || `Confirmed contribution mentioning @boomerxbc`,
      scheduled_for: c.posted_at
        ? new Date(c.posted_at).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      time_label: c.posted_at
        ? new Date(c.posted_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Recorded",
      status: "published",
      tweet_url: c.tweet_url,
      reply_tweet_id: c.reply_tweet_id,
      tweet_type: c.tweet_type,
    }));

    const combined = [...mappedContributions, ...(posts || [])];

    return NextResponse.json({ posts: combined });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching posts";
    return NextResponse.json({ posts: [], error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userCookie = req.cookies.get("agentk_user")?.value;
    let handle = "";
    if (userCookie) {
      try {
        const user = JSON.parse(userCookie);
        handle = user.handle;
      } catch {}
    }

    const body = await req.json();
    const { text, scheduledFor, timeLabel } = body;

    if (!text || !scheduledFor) {
      return NextResponse.json(
        { success: false, error: "Text and scheduled date are required." },
        { status: 400 },
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        post: {
          id: `local-${Date.now()}`,
          text,
          scheduled_for: scheduledFor,
          time_label: timeLabel || "12:00 PM",
          status: "scheduled",
          likes_count: 0,
          comments_count: 0,
        },
      });
    }

    const supabase = getSupabaseAdmin();
    const { data: post, error } = await supabase
      .from("x_posts")
      .insert({
        x_handle: handle || "anonymous",
        text,
        scheduled_for: scheduledFor,
        time_label: timeLabel || "12:00 PM",
        status: "scheduled",
        likes_count: 0,
        comments_count: 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, post });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error creating post";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
