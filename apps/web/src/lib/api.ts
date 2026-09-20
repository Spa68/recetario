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

export interface DatosCaptura {
  textoCrudo: string;
  fuenteUrl: string;
  fuentePlataforma: string;
  imagenes: File[];
}

export async function enviarCaptura(datos: DatosCaptura): Promise<Receta> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error("No hay sesión activa. Inicia sesión de nuevo.");
  }

  const imagenesBase64 = await Promise.all(
    datos.imagenes.map(async (file) => ({
      data: await fileToBase64(file),
      content_type: file.type || "image/jpeg",
    })),
  );

  const respuesta = await fetch(`${SUPABASE_URL}/functions/v1/captura`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      texto_crudo: datos.textoCrudo,
      fuente_url: datos.fuenteUrl || undefined,
      fuente_plataforma: datos.fuentePlataforma,
      imagenes_base64: imagenesBase64,
    }),
  });

  const cuerpo = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(cuerpo.error ?? "Error desconocido al guardar la receta");
  }

  return cuerpo.receta as Receta;
}
