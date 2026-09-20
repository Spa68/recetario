import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { enviarCaptura } from "../lib/api";
import { borrarCompartidoPendiente, leerCompartidoPendiente } from "../lib/compartidoDB";
import type { FuentePlataforma } from "../types";

const PATRON_URL = /https?:\/\/\S+/;

function detectarPlataforma(url: string): FuentePlataforma {
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();

  if (host.includes("instagram.com")) return "instagram";
  if (host.includes("facebook.com") || host.includes("fb.watch")) return "facebook";
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
  if (host.includes("whatsapp.com") || host.includes("wa.me")) return "whatsapp";
  if (host) return "web";
  return "manual";
}

type Estado = "cargando" | "guardando" | "sin_datos" | "error";

export function Compartir() {
  const navigate = useNavigate();
  const [estado, setEstado] = useState<Estado>("cargando");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function procesar() {
      const pendiente = await leerCompartidoPendiente();
      if (!pendiente) {
        if (!cancelado) setEstado("sin_datos");
        return;
      }

      if (!cancelado) setEstado("guardando");

      // Algunas apps (Instagram, por ejemplo) meten el enlace dentro del texto compartido
      // en vez de en el campo "url"; si no hay url explícita, la buscamos ahí.
      const urlDetectada = pendiente.url || pendiente.texto.match(PATRON_URL)?.[0] || "";
      const textoCrudo = [pendiente.titulo, pendiente.texto].filter(Boolean).join("\n\n");

      try {
        const receta = await enviarCaptura({
          textoCrudo,
          fuenteUrl: urlDetectada,
          fuentePlataforma: detectarPlataforma(urlDetectada),
          imagenes: pendiente.archivos,
        });
        await borrarCompartidoPendiente();
        if (!cancelado) navigate(`/recetas/${receta.id}`, { replace: true });
      } catch (err) {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : "Error desconocido");
          setEstado("error");
        }
      }
    }

    procesar();
    return () => {
      cancelado = true;
    };
  }, [navigate]);

  if (estado === "cargando" || estado === "guardando") {
    return <p style={{ fontFamily: "sans-serif" }}>Guardando lo que has compartido...</p>;
  }

  if (estado === "sin_datos") {
    return (
      <div style={{ fontFamily: "sans-serif" }}>
        <p>No había nada pendiente de compartir.</p>
        <a href="/">Ir a mis recetas</a>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <p style={{ color: "crimson" }}>No se pudo guardar la receta compartida: {error}</p>
      <a href="/">Ir a mis recetas</a>
    </div>
  );
}
