import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Receta } from "../types";

interface Props {
  recargarSenal: number;
}

interface RecetaConImagen extends Receta {
  primeraImagenUrl: string | null;
}

export function Listado({ recargarSenal }: Props) {
  const [recetas, setRecetas] = useState<RecetaConImagen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      setError(null);

      const { data, error } = await supabase
        .from("recetas")
        .select("*")
        .order("fecha_captura", { ascending: false });

      if (cancelado) return;

      if (error) {
        setError(error.message);
        setCargando(false);
        return;
      }

      const recetasConImagen = await Promise.all(
        (data as Receta[]).map(async (receta) => {
          let primeraImagenUrl: string | null = null;
          if (receta.imagenes.length > 0) {
            const { data: firmada } = await supabase.storage
              .from("imagenes")
              .createSignedUrl(receta.imagenes[0], 60 * 5);
            primeraImagenUrl = firmada?.signedUrl ?? null;
          }
          return { ...receta, primeraImagenUrl };
        }),
      );

      if (!cancelado) {
        setRecetas(recetasConImagen);
        setCargando(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [recargarSenal]);

  if (cargando) return <p>Cargando recetas...</p>;
  if (error) return <p style={{ color: "crimson" }}>{error}</p>;
  if (recetas.length === 0) return <p>Todavía no hay recetas guardadas.</p>;

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <h2>Tus recetas ({recetas.length})</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {recetas.map((receta) => (
          <li
            key={receta.id}
            style={{ display: "flex", gap: 12, marginBottom: 16, borderBottom: "1px solid #ddd", paddingBottom: 12 }}
          >
            {receta.primeraImagenUrl && (
              <img
                src={receta.primeraImagenUrl}
                alt=""
                style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 4 }}
              />
            )}
            <div>
              <strong>{receta.titulo ?? "(sin título)"}</strong>
              <p style={{ margin: "4px 0", color: "#555" }}>
                {receta.fuente_plataforma} · {new Date(receta.fecha_captura).toLocaleString()}
              </p>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {receta.texto_crudo.length > 200
                  ? `${receta.texto_crudo.slice(0, 200)}...`
                  : receta.texto_crudo}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
