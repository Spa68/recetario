import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { actualizarReceta, anadirImagenes, obtenerReceta, urlFirmadaImagen } from "../lib/api";
import { supabase } from "../lib/supabaseClient";
import type { Estado, FuentePlataforma, Ingrediente, Paso, Receta } from "../types";

const PLATAFORMAS: FuentePlataforma[] = ["manual", "web", "instagram", "facebook", "youtube", "whatsapp"];
const ESTADOS: Estado[] = ["borrador", "revisada"];

export function Edicion() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [receta, setReceta] = useState<Receta | null>(null);
  const [imagenesConUrl, setImagenesConUrl] = useState<{ ruta: string; url: string | null }[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("");
  const [textoCrudo, setTextoCrudo] = useState("");
  const [fuenteUrl, setFuenteUrl] = useState("");
  const [fuentePlataforma, setFuentePlataforma] = useState<FuentePlataforma>("manual");
  const [etiquetasTexto, setEtiquetasTexto] = useState("");
  const [notasPersonales, setNotasPersonales] = useState("");
  const [estado, setEstado] = useState<Estado>("borrador");
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [pasos, setPasos] = useState<Paso[]>([]);
  const [nuevasImagenes, setNuevasImagenes] = useState<File[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      try {
        const datos = await obtenerReceta(id!);
        if (cancelado) return;
        setReceta(datos);
        setTitulo(datos.titulo ?? "");
        setTextoCrudo(datos.texto_crudo);
        setFuenteUrl(datos.fuente_url ?? "");
        setFuentePlataforma(datos.fuente_plataforma);
        setEtiquetasTexto(datos.etiquetas.join(", "));
        setNotasPersonales(datos.notas_personales ?? "");
        setEstado(datos.estado);
        setIngredientes(datos.ingredientes);
        setPasos(datos.pasos);

        const urls = await Promise.all(
          datos.imagenes.map(async (ruta) => ({ ruta, url: await urlFirmadaImagen(ruta) })),
        );
        if (!cancelado) setImagenesConUrl(urls);
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

  function actualizarIngrediente(indice: number, campo: keyof Ingrediente, valor: string) {
    setIngredientes((prev) => prev.map((ing, i) => (i === indice ? { ...ing, [campo]: valor } : ing)));
  }

  function quitarIngrediente(indice: number) {
    setIngredientes((prev) => prev.filter((_, i) => i !== indice));
  }

  function actualizarPaso(indice: number, texto: string) {
    setPasos((prev) => prev.map((p, i) => (i === indice ? { ...p, texto } : p)));
  }

  function quitarPaso(indice: number) {
    setPasos((prev) => prev.filter((_, i) => i !== indice).map((p, i) => ({ ...p, orden: i + 1 })));
  }

  async function quitarImagenExistente(ruta: string) {
    if (!id || !receta) return;
    if (!confirm("¿Quitar esta imagen de la receta?")) return;

    try {
      await supabase.storage.from("imagenes").remove([ruta]);
      const nuevasRutas = receta.imagenes.filter((r) => r !== ruta);
      const actualizada = await actualizarReceta(id, { imagenes: nuevasRutas });
      setReceta(actualizada);
      setImagenesConUrl((prev) => prev.filter((img) => img.ruta !== ruta));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  function handleNuevasImagenes(e: ChangeEvent<HTMLInputElement>) {
    setNuevasImagenes(e.target.files ? Array.from(e.target.files) : []);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setGuardando(true);
    setError(null);

    try {
      if (nuevasImagenes.length > 0) {
        await anadirImagenes(id, nuevasImagenes);
        setNuevasImagenes([]);
      }

      const etiquetas = etiquetasTexto
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      await actualizarReceta(id, {
        titulo: titulo.trim() || null,
        texto_crudo: textoCrudo,
        fuente_url: fuenteUrl.trim() || null,
        fuente_plataforma: fuentePlataforma,
        etiquetas,
        notas_personales: notasPersonales.trim() || null,
        estado,
        ingredientes: ingredientes.filter((ing) => ing.nombre.trim()),
        pasos: pasos.filter((p) => p.texto.trim()),
      });

      navigate(`/recetas/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <p>Cargando...</p>;
  if (!receta) return <p style={{ color: "crimson" }}>{error ?? "Receta no encontrada."}</p>;

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 640 }}>
      <Link to={`/recetas/${id}`}>&larr; Cancelar</Link>
      <h2>Editar receta</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>
            Título
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} style={{ display: "block", width: "100%", padding: 8 }} />
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>
            Texto crudo
            <textarea
              value={textoCrudo}
              onChange={(e) => setTextoCrudo(e.target.value)}
              rows={8}
              style={{ display: "block", width: "100%", padding: 8 }}
            />
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>
            Enlace de origen
            <input value={fuenteUrl} onChange={(e) => setFuenteUrl(e.target.value)} style={{ display: "block", width: "100%", padding: 8 }} />
          </label>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <label>
            Origen
            <select value={fuentePlataforma} onChange={(e) => setFuentePlataforma(e.target.value as FuentePlataforma)} style={{ display: "block", padding: 8 }}>
              {PLATAFORMAS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label>
            Estado
            <select value={estado} onChange={(e) => setEstado(e.target.value as Estado)} style={{ display: "block", padding: 8 }}>
              {ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>
            Etiquetas (separadas por coma)
            <input
              value={etiquetasTexto}
              onChange={(e) => setEtiquetasTexto(e.target.value)}
              placeholder="postre, sin gluten, rapido"
              style={{ display: "block", width: "100%", padding: 8 }}
            />
          </label>
        </div>

        <h3>Ingredientes</h3>
        {ingredientes.map((ing, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <input
              placeholder="cantidad"
              value={ing.cantidad_texto}
              onChange={(e) => actualizarIngrediente(i, "cantidad_texto", e.target.value)}
              style={{ width: 100, padding: 6 }}
            />
            <input
              placeholder="ingrediente"
              value={ing.nombre}
              onChange={(e) => actualizarIngrediente(i, "nombre", e.target.value)}
              style={{ flex: 1, padding: 6 }}
            />
            <button type="button" onClick={() => quitarIngrediente(i)}>
              Quitar
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setIngredientes((prev) => [...prev, { nombre: "", cantidad_texto: "" }])}>
          + Añadir ingrediente
        </button>

        <h3>Pasos</h3>
        {pasos.map((paso, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <span style={{ padding: 6 }}>{i + 1}.</span>
            <input
              value={paso.texto}
              onChange={(e) => actualizarPaso(i, e.target.value)}
              style={{ flex: 1, padding: 6 }}
            />
            <button type="button" onClick={() => quitarPaso(i)}>
              Quitar
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setPasos((prev) => [...prev, { orden: prev.length + 1, texto: "" }])}>
          + Añadir paso
        </button>

        <h3>Notas personales</h3>
        <textarea
          value={notasPersonales}
          onChange={(e) => setNotasPersonales(e.target.value)}
          rows={4}
          style={{ display: "block", width: "100%", padding: 8 }}
        />

        <h3>Imágenes</h3>
        {imagenesConUrl.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {imagenesConUrl.map(
              (img) =>
                img.url && (
                  <div key={img.ruta} style={{ textAlign: "center" }}>
                    <img src={img.url} alt="" style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 4 }} />
                    <br />
                    <button type="button" onClick={() => quitarImagenExistente(img.ruta)}>
                      Quitar
                    </button>
                  </div>
                ),
            )}
          </div>
        )}
        <input type="file" accept="image/*" multiple onChange={handleNuevasImagenes} />

        {error && <p style={{ color: "crimson" }}>{error}</p>}

        <div style={{ marginTop: 20 }}>
          <button type="submit" disabled={guardando} style={{ padding: "10px 20px" }}>
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
