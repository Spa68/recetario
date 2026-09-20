// GET /api/buscar?q=...
// Búsqueda de texto completo (RF-05.2) sobre título, texto crudo y etiquetas.
// Usa la columna generada `busqueda` (tsvector) de la tabla recetas, en español.

import { jsonResponse, manejarPreflight } from "../_shared/cors.ts";
import { autenticar } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const preflight = manejarPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "GET") {
    return jsonResponse({ error: "Método no permitido" }, 405);
  }

  const auth = await autenticar(req);
  if (!auth.ok) return auth.respuesta;
  const { supabase } = auth;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();

  if (!q) {
    return jsonResponse({ error: "Debes indicar el parámetro q" }, 400);
  }

  const { data, error } = await supabase
    .from("recetas")
    .select("*")
    .textSearch("busqueda", q, { type: "websearch", config: "spanish" })
    .order("fecha_captura", { ascending: false });

  if (error) return jsonResponse({ error: error.message }, 500);

  return jsonResponse({ recetas: data, q }, 200);
});
