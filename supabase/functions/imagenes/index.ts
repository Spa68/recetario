// POST /api/imagenes
// Añade o reemplaza imágenes de una receta ya existente. Las imágenes se guardan tal cual, sin procesarlas.

import { jsonResponse, manejarPreflight } from "../_shared/cors.ts";
import { autenticar } from "../_shared/auth.ts";

interface ImagenEntrada {
  data: string; // base64 sin el prefijo "data:...;base64,"
  content_type: string;
}

interface CuerpoImagenes {
  receta_id?: string;
  imagenes_base64?: ImagenEntrada[];
  modo?: "añadir" | "reemplazar";
}

Deno.serve(async (req) => {
  const preflight = manejarPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método no permitido" }, 405);
  }

  const auth = await autenticar(req);
  if (!auth.ok) return auth.respuesta;
  const { supabase, userId } = auth;

  let body: CuerpoImagenes;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "JSON inválido" }, 400);
  }

  const recetaId = body.receta_id;
  const imagenesNuevas = body.imagenes_base64 ?? [];
  const modo = body.modo === "reemplazar" ? "reemplazar" : "añadir";

  if (!recetaId) {
    return jsonResponse({ error: "Debes indicar receta_id" }, 400);
  }
  if (imagenesNuevas.length === 0) {
    return jsonResponse({ error: "Debes enviar al menos una imagen en imagenes_base64" }, 400);
  }

  // RLS garantiza que solo se puede leer/editar una receta propia.
  const { data: receta, error: fetchError } = await supabase
    .from("recetas")
    .select("imagenes")
    .eq("id", recetaId)
    .maybeSingle();

  if (fetchError) return jsonResponse({ error: fetchError.message }, 500);
  if (!receta) return jsonResponse({ error: "Receta no encontrada" }, 404);

  const rutasSubidas: string[] = [];
  for (const imagen of imagenesNuevas) {
    let bytes: Uint8Array;
    try {
      bytes = Uint8Array.from(atob(imagen.data), (c) => c.charCodeAt(0));
    } catch {
      return jsonResponse({ error: "Imagen en base64 inválida" }, 400);
    }

    const extension = imagen.content_type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    const ruta = `${userId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("imagenes")
      .upload(ruta, bytes, { contentType: imagen.content_type, upsert: false });

    if (uploadError) {
      return jsonResponse({ error: `Error subiendo imagen: ${uploadError.message}` }, 500);
    }
    rutasSubidas.push(ruta);
  }

  let imagenesFinales: string[];
  if (modo === "reemplazar") {
    if (receta.imagenes.length > 0) {
      await supabase.storage.from("imagenes").remove(receta.imagenes);
    }
    imagenesFinales = rutasSubidas;
  } else {
    imagenesFinales = [...receta.imagenes, ...rutasSubidas];
  }

  const { data: recetaActualizada, error: updateError } = await supabase
    .from("recetas")
    .update({ imagenes: imagenesFinales })
    .eq("id", recetaId)
    .select()
    .single();

  if (updateError) return jsonResponse({ error: updateError.message }, 500);

  return jsonResponse({ receta: recetaActualizada }, 200);
});
