import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { obtenerReceta } from "../lib/api";
import type { Receta } from "../types";

// deno-lint-ignore no-explicit-any
type WakeLockSentinel = any;

export function ModoCocina() {
  const { id } = useParams<{ id: string }>();
  const [receta, setReceta] = useState<Receta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pantallaActiva, setPantallaActiva] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelado = false;

    obtenerReceta(id)
      .then((datos) => {
        if (!cancelado) setReceta(datos);
      })
      .catch((err) => {
        if (!cancelado) setError(err instanceof Error ? err.message : "Error desconocido");
      });

    return () => {
      cancelado = true;
    };
  }, [id]);

  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;

    async function pedirWakeLock() {
      // Wake Lock API: mantiene la pantalla encendida. No todos los navegadores la soportan
      // (p.ej. Safari en iOS antiguo); si falla, simplemente no bloqueamos el apagado de pantalla.
      try {
        if ("wakeLock" in navigator) {
          sentinel = await (navigator as unknown as { wakeLock: { request: (tipo: "screen") => Promise<WakeLockSentinel> } }).wakeLock.request("screen");
          setPantallaActiva(true);
        }
      } catch {
        setPantallaActiva(false);
      }
    }

    pedirWakeLock();

    return () => {
      sentinel?.release?.();
    };
  }, []);

  if (error) return <p style={{ color: "crimson" }}>{error}</p>;
  if (!receta) return <p>Cargando...</p>;

  return (
    <div style={{ fontFamily: "sans-serif", fontSize: "1.3rem", maxWidth: 700, lineHeight: 1.5 }}>
      <Link to={`/recetas/${receta.id}`} style={{ fontSize: "1rem" }}>
        &larr; Salir del modo cocina
      </Link>
      {!pantallaActiva && (
        <p style={{ fontSize: "0.9rem", color: "#888" }}>
          (Tu navegador no soporta mantener la pantalla encendida automáticamente; ajusta el bloqueo de tu dispositivo si lo necesitas.)
        </p>
      )}

      <h1>{receta.titulo ?? "(sin título)"}</h1>

      {receta.ingredientes.length > 0 && (
        <>
          <h2>Ingredientes</h2>
          <ul>
            {receta.ingredientes.map((ing, i) => (
              <li key={i}>
                {ing.cantidad_texto ? `${ing.cantidad_texto} ` : ""}
                {ing.nombre}
              </li>
            ))}
          </ul>
        </>
      )}

      {receta.pasos.length > 0 ? (
        <>
          <h2>Pasos</h2>
          <ol>
            {receta.pasos
              .slice()
              .sort((a, b) => a.orden - b.orden)
              .map((paso) => (
                <li key={paso.orden} style={{ marginBottom: 12 }}>
                  {paso.texto}
                </li>
              ))}
          </ol>
        </>
      ) : (
        <>
          <h2>Receta</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{receta.texto_crudo}</p>
        </>
      )}
    </div>
  );
}
