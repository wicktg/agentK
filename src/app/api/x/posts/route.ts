import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  CANONICAL_TECHNOCORE_ROOM,
  formatContributionText,
  normalizeTweetType,
  buildSignedTechnocorePayload,
  getOrCreateSigningKey,
  getTechnocoreDestinationUrl,
  fetchTechnocoreRoomMessages,
} from "@/lib/technocore-signing";

export async function GET(req: NextRequest) {
  try {
    const userCookie = req.cookies.get("agentk_user")?.value;
    let handle = "";
    if (userCookie) {
      try {
        const user = JSON.parse(userCookie);
        handle = user.handle?.toLowerCase()?.replace(/^@/, "")?.trim();
      } catch {}
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ posts: [] });
    }

    const supabase = getSupabaseAdmin();

    // Fetch ONLY accepted, true contributions (is_relevant=true and status="replied", never rejected)
    let contribQuery = supabase
      .from("x_contributions")
      .select("*")
      .eq("is_relevant", true)
      .eq("status", "replied")
      .neq("status", "rejected")
      .order("posted_at", { ascending: false });

    if (handle) {
      contribQuery = contribQuery.eq("user_handle", handle);
    }

    const { data: contributions, error: contribError } = await contribQuery;

    if (contribError) {
      console.error(
        "[API /api/x/posts] Error fetching contributions:",
        contribError.message,
      );
    }

    // Fetch real live room history from Technocore x-contributions
    const liveMessages = await fetchTechnocoreRoomMessages(
      CANONICAL_TECHNOCORE_ROOM,
    );

    // Map only verified accepted contributions with stored/canonical Technocore payload
    const mappedContributions = (contributions || [])
      .filter(
        (c: any) =>
          c.is_relevant === true &&
          c.status === "replied" &&
          c.status !== "rejected",
      )
      .map((c: any) => {
        const tweetId = c.tweet_id || c.id;
        const authorHandle = c.user_handle || handle || "user";
        const room = c.technocore_room || CANONICAL_TECHNOCORE_ROOM;
        const technocoreUrl =
          c.technocore_url || getTechnocoreDestinationUrl(room);
        const tweetType = normalizeTweetType(c.tweet_type);

        // Find exact matching live Technocore message by tweetId, nonce, or seq
        const matchingLiveMsg = liveMessages.find((m) => {
          if (m.text && m.text.includes(tweetId)) return true;
          if (
            c.technocore_payload?.nonce &&
            String(m.nonce) === String(c.technocore_payload.nonce)
          )
            return true;
          if (c.technocore_seq && m.seq === c.technocore_seq) return true;
          return false;
        });

        const resolvedSeq =
          matchingLiveMsg?.seq ??
          c.technocore_seq ??
          c.technocore_payload?.seq ??
          undefined;

        const standardText =
          matchingLiveMsg?.text ||
          c.technocore_title ||
          formatContributionText(
            authorHandle,
            tweetId,
            "Flop Network decentralized tokenomics, 51.2% miner allocation and supply curve",
          );

        let technocorePayload = c.technocore_payload;
        if (!technocorePayload || !technocorePayload.sig) {
          const signingKey = getOrCreateSigningKey();
          technocorePayload = buildSignedTechnocorePayload(
            signingKey.privateKey,
            room,
            standardText,
          );
        }

        if (resolvedSeq !== undefined && technocorePayload) {
          technocorePayload.seq = resolvedSeq;
        }

        const originalTweetText = (c.content || "").trim();

        return {
          id: tweetId,
          text: originalTweetText || technocorePayload.text || standardText,
          tweet_content: originalTweetText,
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
          author: authorHandle,
          tweet_url: c.tweet_url,
          reply_tweet_id: c.reply_tweet_id,
          tweet_type: tweetType,
          seq: resolvedSeq,
          technocore_room: room,
          technocore_url: technocoreUrl,
          technocore_title: standardText,
          technocore_payload: technocorePayload,
          technocore_pushed_at: c.technocore_pushed_at || c.posted_at,
        };
      });

    return NextResponse.json({ posts: mappedContributions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching posts";
    return NextResponse.json({ posts: [], error: message }, { status: 500 });
  }
}
