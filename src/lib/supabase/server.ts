import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _cachedClient: SupabaseClient | null = null;
let _cachedUrl: string | null = null;
let _cachedKey: string | null = null;

function getCleanCredentials() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "")
    .replace(/\r$/, "")
    .trim();
  const serviceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  )
    .replace(/\r$/, "")
    .trim();

  return { url, serviceKey };
}

// Check if real Supabase credentials are provided
export const isSupabaseConfigured = (): boolean => {
  const { url, serviceKey } = getCleanCredentials();
  return Boolean(
    url &&
      url.startsWith("http") &&
      !url.includes("placeholder") &&
      !url.includes("your-project") &&
      serviceKey &&
      !serviceKey.includes("placeholder") &&
      !serviceKey.includes("your-anon-key")
  );
};

export const getSupabaseAdmin = (): SupabaseClient => {
  const { url, serviceKey } = getCleanCredentials();

  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }

  // Reuse client if credentials have not changed
  if (_cachedClient && _cachedUrl === url && _cachedKey === serviceKey) {
    return _cachedClient;
  }

  _cachedClient = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  _cachedUrl = url;
  _cachedKey = serviceKey;

  return _cachedClient;
};
