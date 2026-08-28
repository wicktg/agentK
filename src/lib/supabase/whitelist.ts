import { getSupabaseAdmin } from "./server";

export interface WhitelistRecord {
  id: string;
  x_username: string;
  status: "whitelisted" | "blacklisted" | "pending";
  is_whitelisted: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Clean username format (removes @ and lowercases)
 */
export function normalizeXUsername(username: string): string {
  return username.trim().toLowerCase().replace(/^@/, "");
}

/**
 * Check if an X username is whitelisted
 */
export async function isUserWhitelisted(username: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    const cleanUser = normalizeXUsername(username);

    const { data, error } = await supabase
      .from("whitelist")
      .select("id, is_whitelisted, status")
      .eq("x_username", cleanUser)
      .single();

    if (error || !data) {
      return false;
    }

    return data.is_whitelisted === true && data.status === "whitelisted";
  } catch (err: any) {
    console.error("[Whitelist] Error checking whitelist status:", err.message);
    return false;
  }
}

/**
 * Get all whitelisted users
 */
export async function getWhitelistedUsers(): Promise<WhitelistRecord[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("whitelist")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Whitelist] Error fetching whitelist:", error.message);
      return [];
    }

    return (data as WhitelistRecord[]) || [];
  } catch (err: any) {
    console.error("[Whitelist] Error:", err.message);
    return [];
  }
}

/**
 * Add or update an X username in the whitelist
 */
export async function addToWhitelist(
  username: string,
  notes?: string,
): Promise<WhitelistRecord | null> {
  try {
    const supabase = getSupabaseAdmin();
    const cleanUser = normalizeXUsername(username);

    const { data, error } = await supabase
      .from("whitelist")
      .upsert(
        {
          x_username: cleanUser,
          status: "whitelisted",
          is_whitelisted: true,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "x_username" },
      )
      .select()
      .single();

    if (error) {
      console.error("[Whitelist] Error adding to whitelist:", error.message);
      return null;
    }

    return data as WhitelistRecord;
  } catch (err: any) {
    console.error("[Whitelist] Error:", err.message);
    return null;
  }
}

/**
 * Remove or blacklist an X username
 */
export async function removeFromWhitelist(username: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    const cleanUser = normalizeXUsername(username);

    const { error } = await supabase
      .from("whitelist")
      .update({
        status: "blacklisted",
        is_whitelisted: false,
        updated_at: new Date().toISOString(),
      })
      .eq("x_username", cleanUser);

    if (error) {
      console.error(
        "[Whitelist] Error removing from whitelist:",
        error.message,
      );
      return false;
    }

    return true;
  } catch (err: any) {
    console.error("[Whitelist] Error:", err.message);
    return false;
  }
}
