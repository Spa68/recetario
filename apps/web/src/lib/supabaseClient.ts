import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Copia apps/web/.env.example a apps/web/.env y rellénalas.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const SUPABASE_URL = supabaseUrl;
