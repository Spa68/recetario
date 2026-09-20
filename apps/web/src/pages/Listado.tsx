import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { buscarRecetas, listarRecetas, urlFirmadaImagen } from "../lib/api";
import type { FuentePlataforma, Receta } from "../types";

interface RecetaConImagen extends Receta {
  primeraImagenUrl: string | null;
}

async function aRecetasConImagen(recetas: Receta[]): Promise<RecetaConImagen[]> {
  return Promise.all(
    recetas.map(async (receta) => ({
      ...receta,
      primeraImagenUrl: receta.imagenes.length > 0 ? await urlFirmadaImagen(receta.imagenes[0]) : null,
    })),
  );
}

export function Listado() {
  const [recetas, setRecetas] = useState<RecetaConImagen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroPlataforma, setFiltroPlataforma] = useState<FuentePlataforma | "todas">("todas");
  const [filtroEtiqueta, setFiltroEtiqueta] = useState<string>("todas");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  async function cargarListado() {
    setCargando(true);
    setError(null);
    try {
      const datos = await listarRecetas();
      setRecetas(await aRecetasConImagen(datos));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarListado();
  }, []);

  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    if (!busqueda.trim()) {
      cargarListado();
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const datos = await buscarRecetas(busqueda.trim());
      setRecetas(await aRecetasConImagen(datos));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  const etiquetasDisponibles = useMemo(() => {
    const set = new Set<string>();
    recetas.forEach((r) => r.etiquetas.forEach((e) => set.add(e)));
    return [...set].sort();
  }, [recetas]);

  const recetasFiltradas = useMemo(() => {
    return recetas.filter((r) => {
      if (filtroPlataforma !== "todas" && r.fuente_plataforma !== filtroPlataforma) return false;
      if (filtroEtiqueta !== "todas" && !r.etiquetas.includes(filtroEtiqueta)) return false;
      if (desde && r.fecha_captura < desde) return false;
      if (hasta && r.fecha_captura > `${hasta}T23:59:59`) return false;
      return true;
    });
  }, [recetas, filtroPlataforma, filtroEtiqueta, desde, hasta]);

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <h2>Tus recetas ({recetasFiltradas.length})</h2>

      <form onSubmit={handleBuscar} style={{ marginBottom: 12, display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder="Buscar por texto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit">Buscar</button>
        {busqueda && (
          <button
            type="button"
            onClick={() => {
              setBusqueda("");
              cargarListado();
            }}
          >
            Limpiar
          </button>
        )}
      </form>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <select value={filtroPlataforma} onChange={(e) => setFiltroPlataforma(e.target.value as FuentePlataforma | "todas")}>
          <option value="todas">Todas las plataformas</option>
          <option value="manual">manual</option>
          <option value="web">web</option>
          <option value="instagram">instagram</option>
          <option value="facebook">facebook</option>
          <option value="youtube">youtube</option>
          <option value="whatsapp">whatsapp</option>
        </select>

        <select value={filtroEtiqueta} onChange={(e) => setFiltroEtiqueta(e.target.value)}>
          <option value="todas">Todas las etiquetas</option>
          {etiquetasDisponibles.map((etq) => (
            <option key={etq} value={etq}>
              #{etq}
            </option>
          ))}
        </select>

        <label>
          Desde: <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label>
          Hasta: <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
      </div>

      {cargando && <p>Cargando...</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {!cargando && !error && recetasFiltradas.length === 0 && <p>No hay recetas que coincidan.</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {recetasFiltradas.map((receta) => (
          <li key={receta.id} style={{ borderBottom: "1px solid #ddd", paddingBottom: 12, marginBottom: 16 }}>
            <Link to={`/recetas/${receta.id}`} style={{ display: "flex", gap: 12, color: "inherit", textDecoration: "none" }}>
              {receta.primeraImagenUrl && (
                <img
                  src={receta.primeraImagenUrl}
                  alt=""
                  style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
                />
              )}
              <div>
                <strong>{receta.titulo ?? "(sin título)"}</strong>
                <p style={{ margin: "4px 0", color: "#555" }}>
                  {receta.fuente_plataforma} · {new Date(receta.fecha_captura).toLocaleString()} · {receta.estado}
                </p>
                <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                  {receta.texto_crudo.length > 180 ? `${receta.texto_crudo.slice(0, 180)}...` : receta.texto_crudo}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
