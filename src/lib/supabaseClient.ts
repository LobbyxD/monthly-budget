import { createClient } from "@supabase/supabase-js";
import type { Session } from "@supabase/supabase-js";

// Strongly typed access to your Vite env
const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = import.meta.env;

// Fail FAST so you don't ship a blank page when keys are missing at runtime
if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Add them to your .env (Vite exposes only VITE_*)."
  );
}

export const supabase = createClient(
  VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // handles OAuth callbacks
      storageKey: "budgetme.auth",
    },
  }
);

export type { Session };
