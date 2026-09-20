import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { eliminarReceta, obtenerReceta, urlFirmadaImagen } from "../lib/api";
import type { Receta } from "../types";

export function Detalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [receta, setReceta] = useState<Receta | null>(null);
  const [urlsImagenes, setUrlsImagenes] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [borrando, setBorrando] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const datos = await obtenerReceta(id!);
        if (cancelado) return;
        setReceta(datos);
        const urls = await Promise.all(datos.imagenes.map((ruta) => urlFirmadaImagen(ruta)));
        if (!cancelado) setUrlsImagenes(urls.filter((u): u is string => Boolean(u)));
      } catch (err) {
        if (!cancelado) setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [id]);

  async function handleBorrar() {
    if (!id || !confirm("¿Borrar esta receta? No se puede deshacer.")) return;
    setBorrando(true);
    try {
      await eliminarReceta(id);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setBorrando(false);
    }
  }

  if (cargando) return <p>Cargando...</p>;
  if (error) return <p style={{ color: "crimson" }}>{error}</p>;
  if (!receta) return <p>Receta no encontrada.</p>;

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 640 }}>
      <Link to="/">&larr; Volver</Link>

      <h2>{receta.titulo ?? "(sin título)"}</h2>
      <p style={{ color: "#555" }}>
        {receta.fuente_plataforma} · {new Date(receta.fecha_captura).toLocaleString()} · {receta.estado}
        {receta.fuente_url && (
          <>
            {" · "}
            <a href={receta.fuente_url} target="_blank" rel="noreferrer">
              fuente original
            </a>
          </>
        )}
      </p>

      {receta.etiquetas.length > 0 && (
        <p>{receta.etiquetas.map((e) => `#${e}`).join(" ")}</p>
      )}

      <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        <Link to={`/recetas/${receta.id}/editar`}>
          <button>Editar</button>
        </Link>
        <Link to={`/recetas/${receta.id}/cocina`}>
          <button>Modo cocina</button>
        </Link>
        <button onClick={handleBorrar} disabled={borrando} style={{ color: "crimson" }}>
          {borrando ? "Borrando..." : "Borrar"}
        </button>
      </div>

      {urlsImagenes.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {urlsImagenes.map((url) => (
            <img key={url} src={url} alt="" style={{ width: 160, height: 160, objectFit: "cover", borderRadius: 4 }} />
          ))}
        </div>
      )}

      {receta.ingredientes.length > 0 && (
        <>
          <h3>Ingredientes</h3>
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

      {receta.pasos.length > 0 && (
        <>
          <h3>Pasos</h3>
          <ol>
            {receta.pasos
              .slice()
              .sort((a, b) => a.orden - b.orden)
              .map((paso) => (
                <li key={paso.orden}>{paso.texto}</li>
              ))}
          </ol>
        </>
      )}

      <h3>Texto crudo</h3>
      <p style={{ whiteSpace: "pre-wrap" }}>{receta.texto_crudo}</p>

      {receta.notas_personales && (
        <>
          <h3>Notas personales</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{receta.notas_personales}</p>
        </>
      )}
    </div>
  );
}
