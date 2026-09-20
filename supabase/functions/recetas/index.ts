// GET    /api/recetas       -> lista las recetas del usuario autenticado
// GET    /api/recetas/:id   -> detalle de una receta
// PATCH  /api/recetas/:id   -> edita campos de una receta
// DELETE /api/recetas/:id   -> borra una receta (y sus imágenes en Storage)

import { jsonResponse, manejarPreflight } from "../_shared/cors.ts";
import { autenticar } from "../_shared/auth.ts";

const PLATAFORMAS_VALIDAS = ["instagram", "facebook", "youtube", "whatsapp", "web", "manual"];
const ESTADOS_VALIDOS = ["borrador", "revisada"];

// Campos que el usuario puede editar manualmente (RF-06.1).
const CAMPOS_EDITABLES = [
  "titulo",
  "texto_crudo",
  "imagenes",
  "fuente_plataforma",
  "fuente_url",
  "etiquetas",
  "notas_personales",
  "estado",
  "ingredientes",
  "pasos",
] as const;

function extraerId(req: Request): string | null {
  const url = new URL(req.url);
  const segmentos = url.pathname.split("/").filter(Boolean);
  const indice = segmentos.indexOf("recetas");
  if (indice === -1 || indice === segmentos.length - 1) return null;
  return segmentos[indice + 1];
}

Deno.serve(async (req) => {
  const preflight = manejarPreflight(req);
  if (preflight) return preflight;

  const auth = await autenticar(req);
  if (!auth.ok) return auth.respuesta;
  const { supabase } = auth;

  const id = extraerId(req);

  if (req.method === "GET" && !id) {
    const { data, error } = await supabase
      .from("recetas")
      .select("*")
      .order("fecha_captura", { ascending: false });

    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ recetas: data }, 200);
  }

  if (req.method === "GET" && id) {
    const { data, error } = await supabase.from("recetas").select("*").eq("id", id).maybeSingle();
    if (error) return jsonResponse({ error: error.message }, 500);
    if (!data) return jsonResponse({ error: "Receta no encontrada" }, 404);
    return jsonResponse({ receta: data }, 200);
  }

  if (req.method === "PATCH" && id) {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "JSON inválido" }, 400);
    }

    if (body.fuente_plataforma !== undefined && !PLATAFORMAS_VALIDAS.includes(body.fuente_plataforma as string)) {
      return jsonResponse({ error: "fuente_plataforma inválida" }, 400);
    }
    if (body.estado !== undefined && !ESTADOS_VALIDOS.includes(body.estado as string)) {
      return jsonResponse({ error: "estado inválido" }, 400);
    }

    const cambios: Record<string, unknown> = {};
    for (const campo of CAMPOS_EDITABLES) {
      if (body[campo] !== undefined) cambios[campo] = body[campo];
    }

    if (Object.keys(cambios).length === 0) {
      return jsonResponse({ error: "No se ha enviado ningún campo editable" }, 400);
    }

    const { data, error } = await supabase
      .from("recetas")
      .update(cambios)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) return jsonResponse({ error: error.message }, 500);
    if (!data) return jsonResponse({ error: "Receta no encontrada" }, 404);
    return jsonResponse({ receta: data }, 200);
  }

  if (req.method === "DELETE" && id) {
    const { data: receta, error: fetchError } = await supabase
      .from("recetas")
      .select("imagenes")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) return jsonResponse({ error: fetchError.message }, 500);
    if (!receta) return jsonResponse({ error: "Receta no encontrada" }, 404);

    if (receta.imagenes.length > 0) {
      await supabase.storage.from("imagenes").remove(receta.imagenes);
    }

    const { error: deleteError } = await supabase.from("recetas").delete().eq("id", id);
    if (deleteError) return jsonResponse({ error: deleteError.message }, 500);

    return jsonResponse({ ok: true }, 200);
  }

  return jsonResponse({ error: "Ruta o método no soportado" }, 404);
});
