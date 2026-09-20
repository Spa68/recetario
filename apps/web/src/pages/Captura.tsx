import { ChangeEvent, FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { enviarCaptura } from "../lib/api";
import type { FuentePlataforma } from "../types";

const PLATAFORMAS: FuentePlataforma[] = ["manual", "web", "instagram", "facebook", "youtube", "whatsapp"];

export function Captura() {
  const navigate = useNavigate();
  const [textoCrudo, setTextoCrudo] = useState("");
  const [fuenteUrl, setFuenteUrl] = useState("");
  const [fuentePlataforma, setFuentePlataforma] = useState<FuentePlataforma>("manual");
  const [imagenes, setImagenes] = useState<File[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  function handleImagenes(e: ChangeEvent<HTMLInputElement>) {
    setImagenes(e.target.files ? Array.from(e.target.files) : []);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);

    if (!textoCrudo.trim() && !fuenteUrl.trim()) {
      setError("Pega al menos el texto de la receta o un enlace.");
      return;
    }

    setGuardando(true);
    try {
      const receta = await enviarCaptura({ textoCrudo, fuenteUrl, fuentePlataforma, imagenes });
      setTextoCrudo("");
      setFuenteUrl("");
      setFuentePlataforma("manual");
      setImagenes([]);
      setAviso("Receta guardada.");
      navigate(`/recetas/${receta.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 480, fontFamily: "sans-serif" }}>
      <h2>Capturar receta</h2>

      <div style={{ marginBottom: 12 }}>
        <label>
          Enlace (opcional)
          <input
            type="url"
            placeholder="https://..."
            value={fuenteUrl}
            onChange={(e) => setFuenteUrl(e.target.value)}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>
          Texto de la receta (pégalo tal cual)
          <textarea
            value={textoCrudo}
            onChange={(e) => setTextoCrudo(e.target.value)}
            rows={8}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>
          Origen
          <select
            value={fuentePlataforma}
            onChange={(e) => setFuentePlataforma(e.target.value as FuentePlataforma)}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          >
            {PLATAFORMAS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>
          Imágenes (opcional)
          <input type="file" accept="image/*" multiple onChange={handleImagenes} style={{ display: "block", marginTop: 4 }} />
        </label>
      </div>

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {aviso && <p style={{ color: "green" }}>{aviso}</p>}

      <button type="submit" disabled={guardando} style={{ padding: "10px 20px" }}>
        {guardando ? "Guardando..." : "Guardar receta"}
      </button>
    </form>
  );
}
