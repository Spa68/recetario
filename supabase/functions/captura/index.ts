// POST /api/captura
// Recibe texto crudo y/o URL, y opcionalmente imágenes en base64.
// Guarda siempre el texto crudo; además, best-effort y sin IA, intenta obtener el contenido
// de la URL (Open Graph + readability) y extraer título/ingredientes/pasos/hashtags (regex).
// Si cualquiera de estos pasos falla, la receta se guarda igualmente (RF-04.5).

import { jsonResponse, manejarPreflight } from "../_shared/cors.ts";
import { autenticar } from "../_shared/auth.ts";
import { analizarTexto } from "../_shared/parser.ts";
import { extraerDeUrl } from "../_shared/extraccionUrl.ts";

const PLATAFORMAS_VALIDAS = ["instagram", "facebook", "youtube", "whatsapp", "web", "manual"];

interface ImagenEntrada {
  data: string; // base64 sin el prefijo "data:...;base64,"
  content_type: string; // p.ej. "image/jpeg"
}

interface CuerpoCaptura {
  texto_crudo?: string;
  fuente_url?: string;
  fuente_plataforma?: string;
  imagenes_base64?: ImagenEntrada[];
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

  let body: CuerpoCaptura;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "JSON inválido" }, 400);
  }

  const textoCrudoUsuario = (body.texto_crudo ?? "").trim();
  const fuenteUrl = body.fuente_url?.trim() || null;

  if (!textoCrudoUsuario && !fuenteUrl) {
    return jsonResponse({ error: "Debes enviar texto_crudo o fuente_url" }, 400);
  }

  const fuentePlataforma = PLATAFORMAS_VALIDAS.includes(body.fuente_plataforma ?? "")
    ? (body.fuente_plataforma as string)
    : "manual";

  // RF-02 (best-effort): si hay URL, intenta sacar título Open Graph y el texto del artículo.
  // Nunca bloquea la captura: si falla (timeout, sitio bloqueado, red social sin scraping, etc.)
  // simplemente no aporta nada y seguimos con lo que el usuario haya pegado.
  let ogTitulo: string | null = null;
  let textoCrudoFinal = textoCrudoUsuario;

  if (fuenteUrl) {
    const extraido = await extraerDeUrl(fuenteUrl);
    ogTitulo = extraido.ogTitulo;
    if (!textoCrudoFinal && extraido.textoArticulo) {
      textoCrudoFinal = extraido.textoArticulo;
    }
  }

  // Último recurso: si no hay texto propio ni extraído, guardamos al menos la URL como texto crudo.
  if (!textoCrudoFinal) {
    textoCrudoFinal = fuenteUrl ?? "";
  }

  // RF-04 (best-effort): parser regex sobre el texto crudo final, sin IA.
  const analisis = analizarTexto(textoCrudoFinal);

  // Si el usuario pegó su propio texto, su primera línea manda sobre el título; si no, preferimos
  // el og:title (suele ser más limpio que el primer párrafo de un artículo extraído).
  const tituloFinal = textoCrudoUsuario ? analisis.titulo ?? ogTitulo : ogTitulo ?? analisis.titulo;

  // Sube las imágenes tal cual, sin procesarlas ni analizarlas.
  const rutasImagenes: string[] = [];
  for (const imagen of body.imagenes_base64 ?? []) {
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
    rutasImagenes.push(ruta);
  }

  const { data: receta, error: insertError } = await supabase
    .from("recetas")
    .insert({
      user_id: userId,
      titulo: tituloFinal,
      texto_crudo: textoCrudoFinal,
      imagenes: rutasImagenes,
      fuente_plataforma: fuentePlataforma,
      fuente_url: fuenteUrl,
      etiquetas: analisis.etiquetas,
      ingredientes: analisis.ingredientes,
      pasos: analisis.pasos,
      estado: "borrador",
    })
    .select()
    .single();

  if (insertError) {
    return jsonResponse({ error: `Error guardando receta: ${insertError.message}` }, 500);
  }

  return jsonResponse({ receta }, 201);
});
