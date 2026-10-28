import { createClient } from "@supabase/supabase-js";

// These are Supabase's browser-safe URL and publishable key, never a service-role secret.
// RLS is the security boundary; Vercel variables can override the public defaults.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://kljkwigtvogmjgmnjjhl.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_H0N-E2HcNvMY3R9aI5eR0Q_ZkLE4LOV";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
