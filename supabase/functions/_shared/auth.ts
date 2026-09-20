import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse } from "./cors.ts";

interface AutenticacionOk {
  ok: true;
  supabase: SupabaseClient;
  userId: string;
}

interface AutenticacionError {
  ok: false;
  respuesta: Response;
}

// Crea un cliente de Supabase con el JWT del usuario (respeta RLS) y verifica que es válido.
export async function autenticar(req: Request): Promise<AutenticacionOk | AutenticacionError> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { ok: false, respuesta: jsonResponse({ error: "No autenticado" }, 401) };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { ok: false, respuesta: jsonResponse({ error: "Token inválido o caducado" }, 401) };
  }

  return { ok: true, supabase, userId: data.user.id };
}
