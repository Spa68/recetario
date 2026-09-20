import { supabase, SUPABASE_URL } from "./supabaseClient";
import type { Receta } from "../types";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result es "data:image/jpeg;base64,AAAA..." -> nos quedamos solo con la parte base64.
      const resultado = reader.result as string;
      resolve(resultado.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function accessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("No hay sesión activa. Inicia sesión de nuevo.");
  return token;
}

async function llamarFuncion<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const token = await accessToken();
  const respuesta = await fetch(`${SUPABASE_URL}/functions/v1/${ruta}`, {
    ...opciones,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...opciones.headers,
    },
  });

  const cuerpo = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(cuerpo.error ?? "Error desconocido");
  }
  return cuerpo as T;
}

export interface DatosCaptura {
  textoCrudo: string;
  fuenteUrl: string;
  fuentePlataforma: string;
  imagenes: File[];
}

export async function enviarCaptura(datos: DatosCaptura): Promise<Receta> {
  const imagenesBase64 = await Promise.all(
    datos.imagenes.map(async (file) => ({
      data: await fileToBase64(file),
      content_type: file.type || "image/jpeg",
    })),
  );

  const { receta } = await llamarFuncion<{ receta: Receta }>("captura", {
    method: "POST",
    body: JSON.stringify({
      texto_crudo: datos.textoCrudo,
      fuente_url: datos.fuenteUrl || undefined,
      fuente_plataforma: datos.fuentePlataforma,
      imagenes_base64: imagenesBase64,
    }),
  });
  return receta;
}

export async function listarRecetas(): Promise<Receta[]> {
  const { recetas } = await llamarFuncion<{ recetas: Receta[] }>("recetas");
  return recetas;
}

export async function buscarRecetas(q: string): Promise<Receta[]> {
  const { recetas } = await llamarFuncion<{ recetas: Receta[] }>(`buscar?q=${encodeURIComponent(q)}`);
  return recetas;
}

export async function obtenerReceta(id: string): Promise<Receta> {
  const { receta } = await llamarFuncion<{ receta: Receta }>(`recetas/${id}`);
  return receta;
}

export async function actualizarReceta(id: string, cambios: Partial<Receta>): Promise<Receta> {
  const { receta } = await llamarFuncion<{ receta: Receta }>(`recetas/${id}`, {
    method: "PATCH",
    body: JSON.stringify(cambios),
  });
  return receta;
}

export async function eliminarReceta(id: string): Promise<void> {
  await llamarFuncion(`recetas/${id}`, { method: "DELETE" });
}

export async function anadirImagenes(recetaId: string, imagenes: File[]): Promise<Receta> {
  const imagenesBase64 = await Promise.all(
    imagenes.map(async (file) => ({
      data: await fileToBase64(file),
      content_type: file.type || "image/jpeg",
    })),
  );

  const { receta } = await llamarFuncion<{ receta: Receta }>("imagenes", {
    method: "POST",
    body: JSON.stringify({ receta_id: recetaId, imagenes_base64: imagenesBase64, modo: "añadir" }),
  });
  return receta;
}

export async function urlFirmadaImagen(ruta: string, segundos = 300): Promise<string | null> {
  const { data } = await supabase.storage.from("imagenes").createSignedUrl(ruta, segundos);
  return data?.signedUrl ?? null;
}
