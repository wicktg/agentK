import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed
        .slice(eqIdx + 1)
        .trim()
        .replace(/^["']|["']$/g, "")
        .replace(/\r$/, "");
      process.env[key] = val;
    }
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function whitelistUser(username: string) {
  const cleanUser = username.trim().toLowerCase().replace(/^@/, "");
  console.log(`Whitelisting @${cleanUser} in Supabase...`);

  const { data, error } = await supabase
    .from("whitelist")
    .upsert(
      {
        x_username: cleanUser,
        status: "whitelisted",
        is_whitelisted: true,
        notes: "Admin whitelisted",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "x_username" },
    )
    .select()
    .single();

  if (error) {
    console.error("Error whitelisting user:", error.message);
    process.exit(1);
  }

  console.log(`✓ Successfully whitelisted @${cleanUser}! Record:`, data);
}

const targetUser = process.argv[2] || "valor0x";
whitelistUser(targetUser).catch(console.error);
