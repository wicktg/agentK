import { getSupabaseAdmin, isSupabaseConfigured } from "./server";

export interface RegisteredUser {
  id: string;
  did: string;
  x_handle: string;
  x_name?: string;
  x_verified?: boolean;
}

export interface ContributionRecord {
  id?: string;
  tweet_id: string;
  tweet_url: string;
  user_handle: string;
  did?: string;
  profile_id?: string;
  content?: string;
  tweet_type?: "post" | "reply" | "thread" | "article" | "quote";
  posted_at?: string;
  status?: "detected" | "replied" | "rejected" | "ignored" | "failed";
  rejection_reason?: string;
  is_relevant?: boolean;
  llm_model?: string;
  llm_response?: string;
  llm_evaluated_at?: string;
  reply_tweet_id?: string;
  reply_media_id?: string;
  reply_at?: string;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch all registered and verified user accounts from Supabase.
 * The watcher will ONLY monitor mentions and posts from these registered accounts.
 */
export async function getRegisteredUsers(): Promise<RegisteredUser[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, did, x_handle, x_name, x_verified")
      .not("x_handle", "is", null)
      .eq("x_verified", true);

    if (error) {
      console.error("[Supabase] Error fetching registered users:", error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      did: row.did,
      x_handle: row.x_handle.replace(/^@/, "").toLowerCase().trim(),
      x_name: row.x_name,
      x_verified: row.x_verified,
    }));
  } catch (err: any) {
    console.error("[Supabase] Exception in getRegisteredUsers:", err.message);
    return [];
  }
}

/**
 * Get existing contribution record by tweet ID
 */
export async function getExistingContribution(
  tweetId: string
): Promise<ContributionRecord | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("x_contributions")
      .select("*")
      .eq("tweet_id", tweetId)
      .maybeSingle();

    if (error) {
      return null;
    }

    return (data as ContributionRecord) || null;
  } catch {
    return null;
  }
}

/**
 * Check if user has already made a successful recorded contribution on a given calendar day (YYYY-MM-DD)
 * Spam control: allows ONLY 1 recorded contribution per calendar day.
 */
export async function hasUserContributedOnDate(
  userHandle: string,
  dateStr: string, // "YYYY-MM-DD"
  excludeTweetId?: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const supabase = getSupabaseAdmin();
    const cleanHandle = userHandle.toLowerCase().replace(/^@/, "").trim();

    // Query contributions for this user
    let query = supabase
      .from("x_contributions")
      .select("id, tweet_id, status, is_relevant, posted_at, created_at")
      .eq("user_handle", cleanHandle)
      .eq("status", "replied"); // only count successful recorded contributions

    if (excludeTweetId) {
      query = query.neq("tweet_id", excludeTweetId);
    }

    const { data, error } = await query;
    if (error || !data) return false;

    // Check matching calendar date YYYY-MM-DD
    return data.some((row: any) => {
      const rowDate = (row.posted_at || row.created_at || "").split("T")[0];
      return rowDate === dateStr;
    });
  } catch (err: any) {
    console.warn("[Supabase] Warning checking daily contribution limit:", err.message);
    return false;
  }
}

/**
 * Check if a tweet has already been recorded and completely finished
 */
export async function isTweetRecorded(tweetId: string): Promise<boolean> {
  const existing = await getExistingContribution(tweetId);
  if (!existing) return false;
  // If already replied, rejected, or ignored, consider it finished
  return (
    existing.status === "replied" ||
    existing.status === "rejected" ||
    existing.is_relevant === false
  );
}

/**
 * Record a newly detected mention/tag in Supabase.
 */
export async function recordNewContribution(
  contribution: ContributionRecord
): Promise<{ success: boolean; record?: ContributionRecord; isNew: boolean }> {
  if (!isSupabaseConfigured()) {
    return { success: true, record: contribution, isNew: true };
  }

  try {
    const supabase = getSupabaseAdmin();

    const payload = {
      tweet_id: contribution.tweet_id,
      tweet_url: contribution.tweet_url,
      user_handle: contribution.user_handle.toLowerCase().replace(/^@/, ""),
      did: contribution.did || null,
      profile_id: contribution.profile_id || null,
      content: contribution.content || "",
      tweet_type: contribution.tweet_type || "post",
      posted_at: contribution.posted_at || new Date().toISOString(),
      status: contribution.status || "detected",
      rejection_reason: contribution.rejection_reason || null,
      is_relevant: contribution.is_relevant ?? false,
      llm_model: contribution.llm_model || null,
      llm_response: contribution.llm_response || null,
      llm_evaluated_at: contribution.llm_evaluated_at || null,
      reply_tweet_id: contribution.reply_tweet_id || null,
      reply_media_id: contribution.reply_media_id || null,
      reply_at: contribution.reply_at || null,
      error_message: contribution.error_message || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("x_contributions")
      .upsert(payload, { onConflict: "tweet_id" })
      .select()
      .single();

    if (error) {
      console.error("[Supabase] Error recording contribution:", error.message);
      return { success: false, isNew: false };
    }

    return { success: true, record: data as ContributionRecord, isNew: true };
  } catch (err: any) {
    console.error("[Supabase] Exception recording contribution:", err.message);
    return { success: false, isNew: false };
  }
}

/**
 * Update contribution record with LLM evaluation and agent reply result
 */
export async function updateContributionReplyStatus(
  tweetId: string,
  updates: {
    status: "replied" | "rejected" | "failed" | "ignored";
    rejection_reason?: string;
    is_relevant?: boolean;
    llm_model?: string;
    llm_response?: string;
    llm_evaluated_at?: string;
    reply_tweet_id?: string;
    reply_media_id?: string;
    reply_at?: string;
    error_message?: string;
  }
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return true;
  }

  try {
    const supabase = getSupabaseAdmin();
    const updatePayload: Record<string, any> = {
      status: updates.status,
      updated_at: new Date().toISOString(),
    };

    if (updates.rejection_reason !== undefined) updatePayload.rejection_reason = updates.rejection_reason;
    if (updates.is_relevant !== undefined) updatePayload.is_relevant = updates.is_relevant;
    if (updates.llm_model !== undefined) updatePayload.llm_model = updates.llm_model;
    if (updates.llm_response !== undefined) updatePayload.llm_response = updates.llm_response;
    if (updates.llm_evaluated_at !== undefined) updatePayload.llm_evaluated_at = updates.llm_evaluated_at;
    if (updates.reply_tweet_id !== undefined) updatePayload.reply_tweet_id = updates.reply_tweet_id;
    if (updates.reply_media_id !== undefined) updatePayload.reply_media_id = updates.reply_media_id;
    if (updates.reply_at !== undefined) updatePayload.reply_at = updates.reply_at;
    if (updates.error_message !== undefined) updatePayload.error_message = updates.error_message;

    const { error } = await supabase
      .from("x_contributions")
      .update(updatePayload)
      .eq("tweet_id", tweetId);

    if (error) {
      console.error("[Supabase] Error updating contribution status:", error.message);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error("[Supabase] Exception updating contribution status:", err.message);
    return false;
  }
}

/**
 * Fetch confirmed/relevant contributions for dashboard calendar display
 */
export async function getContributions(userHandle?: string): Promise<ContributionRecord[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("x_contributions")
      .select("*")
      .order("posted_at", { ascending: false });

    if (userHandle) {
      const clean = userHandle.toLowerCase().replace(/^@/, "").trim();
      query = query.eq("user_handle", clean);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[Supabase] Error fetching contributions:", error.message);
      return [];
    }

    return (data || []) as ContributionRecord[];
  } catch (err: any) {
    console.error("[Supabase] Exception fetching contributions:", err.message);
    return [];
  }
}
