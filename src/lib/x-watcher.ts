/**
 * X (Twitter) Watcher Engine
 * Powered by WATCHER_TWITTER_AUTH_TOKEN and WATCHER_TWITTER_CT0.
 * Responsibilities:
 * 1. Bio verification for newly registered users.
 * 2. Scanning registered Supabase user profiles for mentions, image/photo tags, replies, and threads of @boomerxbc.
 */

import { isGroqConfigured } from "./groq";

export interface XProfile {
  handle: string;
  name: string;
  bio: string;
  avatarUrl: string;
  restId?: string;
}

export interface VerificationResult {
  success: boolean;
  verified: boolean;
  error?: string;
  user?: XProfile;
}

export interface DetectedTweetMatch {
  tweetId: string;
  tweetUrl: string;
  authorHandle: string;
  content: string;
  tweetType: "post" | "reply" | "thread" | "article" | "quote";
  postedAt: string;
}

export const DEFAULT_BEARER =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

// Active GraphQL Query IDs
let _cachedUserTweetsQid: string = "SXVCYB8XHSS25nzIljNtZA";
let _cachedUserByScreenNameQid: string = "Gb-d6r0vxPOADdG62OEBpQ";

/**
 * Retrieve watcher credentials from environment variables
 */
export function getWatcherCredentials(): { authToken: string; ct0: string } {
  const authToken = (
    process.env.WATCHER_TWITTER_AUTH_TOKEN ||
    process.env.TWITTER_AUTH_TOKEN ||
    process.env.X_AUTH_TOKEN ||
    ""
  )
    .replace(/\r$/, "")
    .trim();

  const ct0 = (
    process.env.WATCHER_TWITTER_CT0 ||
    process.env.TWITTER_CT0 ||
    process.env.X_CT0 ||
    ""
  )
    .replace(/\r$/, "")
    .trim();

  return { authToken, ct0 };
}

/**
 * Build browser session request headers for Watcher account
 */
export function makeWatcherHeaders(): Record<string, string> {
  const { authToken, ct0 } = getWatcherCredentials();
  return {
    Authorization: `Bearer ${DEFAULT_BEARER}`,
    "User-Agent": DEFAULT_USER_AGENT,
    "Content-Type": "application/json",
    "X-Csrf-Token": ct0,
    "X-Twitter-Auth-Type": "OAuth2Session",
    "X-Twitter-Active-User": "yes",
    "X-Twitter-Client-Language": "en",
    Referer: "https://x.com/",
    Cookie: `auth_token=${authToken}; ct0=${ct0}`,
  };
}

/**
 * Fetch live user profile from X using Watcher GraphQL session or Syndication API fallback
 */
export async function fetchXProfile(handle: string): Promise<XProfile | null> {
  const cleanHandle = handle.replace(/^@/, "").trim();
  if (!cleanHandle) return null;

  const { authToken, ct0 } = getWatcherCredentials();

  // 1. Try GraphQL UserByScreenName if watcher credentials are configured
  if (authToken && ct0) {
    try {
      const queryId = _cachedUserByScreenNameQid || "Gb-d6r0vxPOADdG62OEBpQ";
      const variables = JSON.stringify({
        screen_name: cleanHandle,
        withSafetyModeUserFields: true,
      });
      const features = JSON.stringify({
        hidden_profile_likes_enabled: true,
        hidden_profile_subscriptions_enabled: true,
        responsive_web_graphql_exclude_directive_enabled: true,
        verified_phone_label_enabled: false,
        subscriptions_verification_info_is_identity_verified_enabled: true,
        subscriptions_verification_info_verified_since_enabled: true,
        responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        responsive_web_graphql_timeline_navigation_enabled: true,
      });

      const url = `https://x.com/i/api/graphql/${queryId}/UserByScreenName?variables=${encodeURIComponent(
        variables,
      )}&features=${encodeURIComponent(features)}`;

      const res = await fetch(url, {
        headers: makeWatcherHeaders(),
        cache: "no-store",
      });

      if (res.ok) {
        const json = await res.json();
        const userRes = json?.data?.user?.result;
        if (userRes) {
          const legacy =
            userRes.legacy || userRes.core?.user_results?.result?.legacy || {};
          const name = userRes.core?.name || legacy.name || cleanHandle;
          const bio =
            userRes.profile_bio?.description ||
            legacy.description ||
            userRes.core?.user_results?.result?.legacy?.description ||
            "";
          let avatarUrl =
            userRes.avatar?.image_url || legacy.profile_image_url_https || "";
          avatarUrl = avatarUrl.replace("_normal.", "_400x400.");

          return {
            handle: userRes.core?.screen_name || cleanHandle,
            name,
            bio,
            avatarUrl: avatarUrl || `https://unavatar.io/x/${cleanHandle}`,
            restId: userRes.rest_id,
          };
        }
      }
    } catch (err) {
      console.warn("[Watcher] UserByScreenName error, trying fallback:", err);
    }
  }

  // 2. Public Syndication API Fallback
  try {
    const syndicationUrl = `https://cdn.syndication.twimg.com/widgets/followbutton/info.json?screen_names=${cleanHandle}`;
    const res = await fetch(syndicationUrl, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const user = data[0];
        let avatarUrl = user.profile_image_url_https || "";
        avatarUrl = avatarUrl.replace("_normal.", "_400x400.");

        return {
          handle: user.screen_name || cleanHandle,
          name: user.name || cleanHandle,
          bio: user.description || "",
          avatarUrl: avatarUrl || `https://unavatar.io/x/${cleanHandle}`,
          restId: user.id_str,
        };
      }
    }
  } catch (err) {
    console.warn("[Watcher] Syndication fallback error:", err);
  }

  // 3. Fallback unavatar
  return {
    handle: cleanHandle,
    name: cleanHandle,
    bio: "",
    avatarUrl: `https://unavatar.io/x/${cleanHandle}`,
  };
}

/**
 * Verify that the exact challenge code exists in the target user's X bio
 */
export async function verifyXBioChallenge(
  handle: string,
  expectedCode: string,
): Promise<VerificationResult> {
  const cleanHandle = handle.replace(/^@/, "").trim();
  const cleanExpectedCode = expectedCode.trim();

  if (!cleanHandle) {
    return { success: false, verified: false, error: "X handle is required." };
  }
  if (!cleanExpectedCode) {
    return {
      success: false,
      verified: false,
      error: "Verification challenge code is required.",
    };
  }

  const profile = await fetchXProfile(cleanHandle);
  if (!profile) {
    return {
      success: false,
      verified: false,
      error: `Could not retrieve X profile for @${cleanHandle}. Please ensure account is public.`,
    };
  }

  const bioText = (profile.bio || "").trim();
  const isPresent =
    bioText.includes(cleanExpectedCode) ||
    bioText.toLowerCase().includes(cleanExpectedCode.toLowerCase());

  if (isPresent) {
    return { success: true, verified: true, user: profile };
  }

  return {
    success: false,
    verified: false,
    error: `Verification code was not found in @${cleanHandle}'s bio. Please paste [${cleanExpectedCode}] into your bio, save profile, and try again.`,
    user: profile,
  };
}

/**
 * Check if text contains mentions/tags of target handle (@haxexbc)
 */
export function isMentioningTarget(
  text: string,
  targetHandle: string = process.env.TARGET_MENTION_HANDLE || "haxexbc",
): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  const target = targetHandle.toLowerCase().replace(/^@/, "");

  const regex = new RegExp(`(@|#|\\b)${target}\\b`, "i");
  return regex.test(lower);
}

/**
 * Robust checker that detects:
 * 1. Direct text mentions / hashtag mentions
 * 2. entities.user_mentions
 * 3. Photo / image tags in extended_entities.media (features.all.tags, tagged_users)
 * 4. In-reply-to screen name
 * 5. Quoted tweet tags/mentions
 */
export function hasTargetMentionOrTag(
  tweetResult: any,
  targetHandle: string = process.env.TARGET_MENTION_HANDLE || "haxexbc",
): boolean {
  if (!tweetResult) return false;
  const target = targetHandle.toLowerCase().replace(/^@/, "").trim();
  const legacy = tweetResult.legacy || tweetResult.tweet?.legacy || {};

  // 1. Text & Note Tweet check
  const fullText = (
    tweetResult.note_tweet?.note_tweet_results?.result?.text ||
    legacy.full_text ||
    ""
  ).toLowerCase();

  if (isMentioningTarget(fullText, target)) {
    return true;
  }

  // 2. User Mentions entity check
  const mentions = legacy.entities?.user_mentions || [];
  if (
    mentions.some(
      (m: any) =>
        (m.screen_name || "").toLowerCase() === target ||
        (m.name || "").toLowerCase().includes(target),
    )
  ) {
    return true;
  }

  // 3. In-reply-to check
  if ((legacy.in_reply_to_screen_name || "").toLowerCase() === target) {
    return true;
  }

  // 4. Image / Photo Tags in Media Entities
  const mediaList = [
    ...(legacy.extended_entities?.media || []),
    ...(legacy.entities?.media || []),
  ];

  for (const m of mediaList) {
    // Check features.all.tags (Standard X photo tag structure)
    const allTags = m.features?.all?.tags || [];
    if (
      allTags.some(
        (t: any) =>
          (t.screen_name || "").toLowerCase() === target ||
          (t.name || "").toLowerCase().includes(target),
      )
    ) {
      return true;
    }

    // Check size-specific tags
    for (const size of ["orig", "large", "medium", "small"]) {
      const sizeTags = m.features?.[size]?.tags || [];
      if (
        sizeTags.some(
          (t: any) =>
            (t.screen_name || "").toLowerCase() === target ||
            (t.name || "").toLowerCase().includes(target),
        )
      ) {
        return true;
      }
    }

    // Check direct tagged_users array
    const directTags = m.tagged_users || [];
    if (
      directTags.some(
        (t: any) =>
          (t.screen_name || "").toLowerCase() === target ||
          (t.name || "").toLowerCase().includes(target),
      )
    ) {
      return true;
    }
  }

  // 5. Quoted tweet recursive check
  const quoted =
    tweetResult.quoted_status_result?.result || legacy.quoted_status;
  if (quoted && hasTargetMentionOrTag(quoted, target)) {
    return true;
  }

  return false;
}

/**
 * Scan registered user's real-time timeline for mentions and photo tags of target handle (@haxexbc)
 */
export async function scanUserForTargetMentions(
  authorHandle: string,
  targetHandle: string = process.env.TARGET_MENTION_HANDLE || "haxexbc",
): Promise<DetectedTweetMatch[]> {
  const cleanAuthor = authorHandle.replace(/^@/, "").trim();
  const cleanTarget = targetHandle.replace(/^@/, "").trim();
  const { authToken, ct0 } = getWatcherCredentials();

  if (!cleanAuthor) return [];

  const matches: DetectedTweetMatch[] = [];
  const seenTweetIds = new Set<string>();

  if (!authToken || !ct0) {
    console.warn("[Watcher] Watcher credentials are not configured.");
    return [];
  }

  try {
    const profile = await fetchXProfile(cleanAuthor);
    const restId = profile?.restId;

    if (restId) {
      const queryId = _cachedUserTweetsQid || "SXVCYB8XHSS25nzIljNtZA";
      const variables = JSON.stringify({
        userId: restId,
        count: 20,
        includePromotedContent: false,
        withVoice: false,
      });

      const url = `https://x.com/i/api/graphql/${queryId}/UserTweets?variables=${encodeURIComponent(
        variables,
      )}`;

      const res = await fetch(url, {
        headers: makeWatcherHeaders(),
        cache: "no-store",
      });

      if (res.ok) {
        const json = await res.json();
        const instructions =
          json?.data?.user?.result?.timeline_v2?.timeline?.instructions ||
          json?.data?.user?.result?.timeline?.timeline?.instructions ||
          [];

        for (const inst of instructions) {
          const entries = inst.entries || [];
          for (const entry of entries) {
            const tweetResult =
              entry.content?.itemContent?.tweet_results?.result ||
              entry.item?.itemContent?.tweet_results?.result;
            if (!tweetResult) continue;

            const legacy =
              tweetResult.legacy || tweetResult.tweet?.legacy || {};
            const tweetId =
              tweetResult.rest_id || legacy.id_str || entry.entryId;
            if (!tweetId || seenTweetIds.has(tweetId)) continue;

            // Check if tweet mentions or tags @boomerxbc (in text, entities, or photo tags)
            if (hasTargetMentionOrTag(tweetResult, cleanTarget)) {
              seenTweetIds.add(tweetId);

              const fullText =
                tweetResult.note_tweet?.note_tweet_results?.result?.text ||
                legacy.full_text ||
                "";

              // Determine tweet type
              let tweetType: "post" | "reply" | "thread" | "article" | "quote" =
                "post";
              if (legacy.in_reply_to_status_id_str) {
                tweetType = "reply";
              } else if (tweetResult.note_tweet || legacy.article) {
                tweetType = "article";
              } else if (legacy.is_quote_status) {
                tweetType = "quote";
              }

              matches.push({
                tweetId: String(tweetId),
                tweetUrl: `https://x.com/${cleanAuthor}/status/${tweetId}`,
                authorHandle: cleanAuthor,
                content: fullText,
                tweetType,
                postedAt: legacy.created_at
                  ? new Date(legacy.created_at).toISOString()
                  : new Date().toISOString(),
              });
            }
          }
        }
      } else {
        console.warn(
          `[Watcher] UserTweets returned HTTP ${res.status} for @${cleanAuthor}`,
        );
      }
    }
  } catch (err: any) {
    console.error(
      `[Watcher] Error scanning user @${cleanAuthor}:`,
      err.message,
    );
  }

  return matches;
}

/**
 * Fetch full comprehensive text of a tweet (including longform note tweets / articles)
 */
export async function fetchFullTweetText(tweetId: string): Promise<string> {
  const cleanId = tweetId.trim();
  if (!cleanId) return "";

  const { authToken, ct0 } = getWatcherCredentials();

  if (authToken && ct0) {
    try {
      const qid = "XMOz5h24KAZ86qKffKTLdQ"; // Active TweetDetail queryId
      const variables = JSON.stringify({
        focalTweetId: cleanId,
        with_rux_injections: false,
        includePromotedContent: false,
        withCommunity: false,
        withQuickPromoteEligibilityTweetFields: false,
        withBirdwatchNotes: false,
        withVoice: false,
        withV2Timeline: true,
      });

      const url = `https://x.com/i/api/graphql/${qid}/TweetDetail?variables=${encodeURIComponent(
        variables,
      )}`;

      const res = await fetch(url, {
        headers: makeWatcherHeaders(),
        cache: "no-store",
      });

      if (res.ok) {
        const json = await res.json();
        const instructions =
          json?.data?.threaded_conversation_with_injections_v2?.instructions ||
          [];

        for (const inst of instructions) {
          for (const entry of inst.entries || []) {
            const tr =
              entry.content?.itemContent?.tweet_results?.result ||
              entry.item?.itemContent?.tweet_results?.result;
            if (tr) {
              const noteText = tr.note_tweet?.note_tweet_results?.result?.text;
              const legacyText = tr.legacy?.full_text;
              if (noteText || legacyText) {
                return noteText || legacyText;
              }
            }
          }
        }
      }
    } catch {}
  }

  return "";
}
