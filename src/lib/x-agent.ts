/**
 * X (Twitter) Agent Posting Engine
 * Powered by AGENT_TWITTER_AUTH_TOKEN and AGENT_TWITTER_CT0.
 * Responsibilities:
 * 1. Uploading media (contribution-recorded-banner.png or contribution-rejected-banner.png) to X upload API.
 * 2. Replying to matched tweets using CreateTweet GraphQL mutation with ONLY the banner image and NO text.
 */

import fs from "fs";
import path from "path";

const DEFAULT_BEARER =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

export interface AgentPostResult {
  success: boolean;
  replyTweetId?: string;
  mediaId?: string;
  inReplyToTweetId?: string;
  createdAt?: string;
  error?: string;
}

const FALLBACK_CREATE_TWEET_QID = "WXTdKnLddrQOunD6MhWi3g";
let _cachedCreateTweetQid: string = "WXTdKnLddrQOunD6MhWi3g";
const _cachedMediaUploads: Record<string, { mediaId: string; expiresAt: number }> = {};

const TWEET_FEATURES = {
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  creator_subscriptions_quote_tweet_preview_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  rweb_video_timestamps_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_enhance_cards_enabled: false,
};

/**
 * Retrieve agent credentials from environment variables
 */
export function getAgentCredentials(): { authToken: string; ct0: string } {
  const authToken = (process.env.AGENT_TWITTER_AUTH_TOKEN || "")
    .replace(/\r$/, "")
    .trim();
  const ct0 = (process.env.AGENT_TWITTER_CT0 || "")
    .replace(/\r$/, "")
    .trim();
  return { authToken, ct0 };
}

/**
 * Check if agent credentials are configured
 */
export function isAgentConfigured(): boolean {
  const { authToken, ct0 } = getAgentCredentials();
  return Boolean(authToken && ct0);
}

/**
 * Build browser session request headers for Agent account
 */
export function makeAgentHeaders(): Record<string, string> {
  const { authToken, ct0 } = getAgentCredentials();
  return {
    Authorization: `Bearer ${DEFAULT_BEARER}`,
    "User-Agent": DEFAULT_USER_AGENT,
    "X-Csrf-Token": ct0,
    "X-Twitter-Auth-Type": "OAuth2Session",
    "X-Twitter-Active-User": "yes",
    "X-Twitter-Client-Language": "en",
    Referer: "https://x.com/",
    Cookie: `auth_token=${authToken}; ct0=${ct0}`,
  };
}

/**
 * Discover the active CreateTweet GraphQL queryId
 */
export async function discoverCreateTweetQid(): Promise<string> {
  if (_cachedCreateTweetQid) return _cachedCreateTweetQid;

  const { authToken, ct0 } = getAgentCredentials();
  if (!authToken || !ct0) return FALLBACK_CREATE_TWEET_QID;

  try {
    const res = await fetch("https://x.com/explore", {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: `auth_token=${authToken}; ct0=${ct0}`,
      },
    });

    if (res.ok) {
      const html = await res.text();
      const scriptUrls: string[] = [];

      const scriptRegex1 = /src="(https:\/\/abs\.twimg\.com[^"]+\.js)"/g;
      let match: RegExpExecArray | null;
      while ((match = scriptRegex1.exec(html)) !== null) {
        scriptUrls.push(match[1]);
      }

      const scriptRegex2 = /"(\/x-web\/[^"]+?\.js)"/g;
      while ((match = scriptRegex2.exec(html)) !== null) {
        scriptUrls.push(`https://abs.twimg.com${match[1]}`);
      }

      for (const url of scriptUrls) {
        try {
          const sRes = await fetch(url, {
            headers: { "User-Agent": DEFAULT_USER_AGENT },
          });
          if (sRes.ok) {
            const body = await sRes.text();
            const m1 = /queryId:"([\w-]{15,})",operationName:"CreateTweet"/.exec(body);
            if (m1) {
              _cachedCreateTweetQid = m1[1];
              return m1[1];
            }
            const m2 = /operationName:"CreateTweet",queryId:"([\w-]{15,})"/.exec(body);
            if (m2) {
              _cachedCreateTweetQid = m2[1];
              return m2[1];
            }
          }
        } catch {}
      }
    }
  } catch (err) {
    console.warn("[Agent] Dynamic queryId discovery failed, using fallback:", err);
  }

  _cachedCreateTweetQid = FALLBACK_CREATE_TWEET_QID;
  return FALLBACK_CREATE_TWEET_QID;
}

/**
 * Upload a banner image to X using the chunked / multipart media upload endpoint
 */
export async function uploadBannerMediaToX(
  variantOrPath: "recorded" | "rejected" | string = "recorded"
): Promise<string> {
  let filePath: string;
  if (variantOrPath === "recorded") {
    filePath = path.join(process.cwd(), "public", "contribution-recorded-banner.png");
  } else if (variantOrPath === "rejected") {
    filePath = path.join(process.cwd(), "public", "contribution-rejected-banner.png");
  } else {
    filePath = variantOrPath;
  }

  // Check cache
  const cached = _cachedMediaUploads[filePath];
  if (cached && Date.now() < cached.expiresAt) {
    return cached.mediaId;
  }

  if (!fs.existsSync(/* turbopackIgnore: true */ filePath)) {
    throw new Error(`Banner file not found at path: ${filePath}`);
  }

  const fileBuffer = fs.readFileSync(/* turbopackIgnore: true */ filePath);
  const totalBytes = fileBuffer.length;
  const mimeType = "image/png";

  const { authToken, ct0 } = getAgentCredentials();
  if (!authToken || !ct0) {
    throw new Error(
      "Agent credentials (AGENT_TWITTER_AUTH_TOKEN / AGENT_TWITTER_CT0) are not configured."
    );
  }

  const uploadEndpoint = "https://upload.twitter.com/1.1/media/upload.json";

  // STEP 1: INIT
  const initParams = new URLSearchParams({
    command: "INIT",
    total_bytes: totalBytes.toString(),
    media_type: mimeType,
    media_category: "tweet_image",
  });

  const initRes = await fetch(`${uploadEndpoint}?${initParams.toString()}`, {
    method: "POST",
    headers: {
      ...makeAgentHeaders(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!initRes.ok) {
    const errText = await initRes.text();
    throw new Error(`X Media Upload INIT failed (${initRes.status}): ${errText}`);
  }

  const initData = await initRes.json();
  const mediaId = initData.media_id_string || String(initData.media_id);
  if (!mediaId) {
    throw new Error("Failed to receive media_id from X INIT endpoint");
  }

  // STEP 2: APPEND
  const boundary = `----WebKitFormBoundary${Date.now().toString(16)}`;
  const formHeader = `--${boundary}\r\nContent-Disposition: form-data; name="media"; filename="banner.png"\r\nContent-Type: image/png\r\n\r\n`;
  const formFooter = `\r\n--${boundary}--\r\n`;

  const appendBody = Buffer.concat([
    Buffer.from(formHeader, "utf-8"),
    fileBuffer,
    Buffer.from(formFooter, "utf-8"),
  ]);

  const appendUrl = `${uploadEndpoint}?command=APPEND&media_id=${mediaId}&segment_index=0`;
  const appendRes = await fetch(appendUrl, {
    method: "POST",
    headers: {
      ...makeAgentHeaders(),
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body: appendBody,
  });

  if (!appendRes.ok) {
    const errText = await appendRes.text();
    throw new Error(`X Media Upload APPEND failed (${appendRes.status}): ${errText}`);
  }

  // STEP 3: FINALIZE
  const finalizeParams = new URLSearchParams({
    command: "FINALIZE",
    media_id: mediaId,
  });

  const finalizeRes = await fetch(`${uploadEndpoint}?${finalizeParams.toString()}`, {
    method: "POST",
    headers: {
      ...makeAgentHeaders(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!finalizeRes.ok) {
    const errText = await finalizeRes.text();
    throw new Error(`X Media Upload FINALIZE failed (${finalizeRes.status}): ${errText}`);
  }

  // Cache media_id for 15 minutes
  _cachedMediaUploads[filePath] = {
    mediaId,
    expiresAt: Date.now() + 15 * 60 * 1000,
  };

  return mediaId;
}

/**
 * Send an in-thread reply to a specific tweet ID attaching ONLY the banner image with NO text
 * @param inReplyToTweetId - Target Tweet ID
 * @param variant - "recorded" (open eye) or "rejected" (closed eye)
 */
export async function replyToTweetWithBannerOnly(
  inReplyToTweetId: string,
  variant: "recorded" | "rejected" | string = "recorded"
): Promise<AgentPostResult> {
  const cleanTweetId = inReplyToTweetId.trim();
  if (!cleanTweetId) {
    return { success: false, error: "Target tweet ID is required." };
  }

  if (!isAgentConfigured()) {
    return {
      success: false,
      error: "AGENT_TWITTER_AUTH_TOKEN and AGENT_TWITTER_CT0 are not configured.",
    };
  }

  try {
    // 1. Upload or reuse banner media on X
    const mediaId = await uploadBannerMediaToX(variant);

    // 2. Discover active CreateTweet queryId
    const qid = await discoverCreateTweetQid();
    const url = `https://x.com/i/api/graphql/${qid}/CreateTweet`;

    // 3. Construct CreateTweet payload with ONLY media and NO text
    const variables: Record<string, any> = {
      tweet_text: "", // NO TEXT as requested
      dark_request: false,
      media: {
        media_entities: [
          {
            media_id: mediaId,
            tagged_users: [],
          },
        ],
        possibly_sensitive: false,
      },
      reply: {
        in_reply_to_tweet_id: cleanTweetId,
        exclude_reply_user_ids: [],
      },
      semantic_annotation_ids: [],
    };

    const body = {
      variables,
      features: TWEET_FEATURES,
      queryId: qid,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...makeAgentHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return {
        success: false,
        error: `CreateTweet GraphQL error (${res.status}): ${errBody.slice(0, 300)}`,
        mediaId,
        inReplyToTweetId: cleanTweetId,
      };
    }

    const data = await res.json();
    const createTweetObj = data?.data?.create_tweet;
    const createResult = createTweetObj?.tweet_results?.result;
    const errors = data?.errors || [];

    if (!createTweetObj && errors.length > 0) {
      const errMsg = JSON.stringify(errors);
      return {
        success: false,
        error: `CreateTweet failed: ${errMsg}`,
        mediaId,
        inReplyToTweetId: cleanTweetId,
      };
    }

    const legacy = createResult?.legacy || {};
    const replyTweetId =
      createResult?.rest_id ||
      legacy.id_str ||
      `reply-${Date.now()}`;
    const createdAt = legacy.created_at || new Date().toISOString();

    return {
      success: true,
      replyTweetId,
      mediaId,
      inReplyToTweetId: cleanTweetId,
      createdAt,
    };
  } catch (err: any) {
    console.error("[Agent] Error replying to tweet:", err);
    return {
      success: false,
      error: err.message || "Failed to reply to tweet",
      inReplyToTweetId: cleanTweetId,
    };
  }
}
