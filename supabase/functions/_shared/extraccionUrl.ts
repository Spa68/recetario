// Obtención de contenido de una URL (RF-02): Open Graph + texto principal vía readability.
// Best-effort total: cualquier fallo (red, timeout, sitio bloqueado, HTML raro) devuelve
// campos a null y el flujo de captura sigue con lo que el usuario haya pegado a mano.
// No es IA ni OCR: solo lectura de metadatos HTML y extracción de contenido por estructura del DOM.

// Se usan specifiers npm: (en vez de esm.sh) porque el bundler de esm.sh intenta compilar
// estáticamente la dependencia opcional "canvas" de linkedom (solo hace falta para <canvas>,
// que no usamos) y falla. Con npm: Deno resuelve los paquetes como Node y la ignora.
import { parseHTML } from "npm:linkedom@0.16.8";
import { Readability } from "npm:@mozilla/readability@0.5.0";

const TIMEOUT_MS = 5000;
const TAMANO_MAXIMO_BYTES = 3 * 1024 * 1024; // 3 MB

export interface ExtraccionUrl {
  ogTitulo: string | null;
  textoArticulo: string | null;
}

const EXTRACCION_VACIA: ExtraccionUrl = { ogTitulo: null, textoArticulo: null };

export async function extraerDeUrl(url: string): Promise<ExtraccionUrl> {
  if (!esUrlHttpValida(url)) return EXTRACCION_VACIA;

  const html = await descargarHtml(url);
  if (!html) return EXTRACCION_VACIA;

  return {
    ogTitulo: intentar(() => extraerMetaOg(html, "title")),
    textoArticulo: intentar(() => extraerArticuloConReadability(html)),
  };
}

function esUrlHttpValida(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function descargarHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const respuesta = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RecetarioBot/1.0; +captura personal sin fines comerciales)",
        Accept: "text/html",
      },
    });

    if (!respuesta.ok) return null;

    const contentType = respuesta.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;

    const buffer = await respuesta.arrayBuffer();
    if (buffer.byteLength > TAMANO_MAXIMO_BYTES) return null;

    return new TextDecoder("utf-8").decode(buffer);
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function extraerMetaOg(html: string, propiedad: string): string | null {
  const patrones = [
    new RegExp(`<meta[^>]+property=["']og:${propiedad}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:${propiedad}["']`, "i"),
  ];
  for (const patron of patrones) {
    const match = html.match(patron);
    if (match) return decodificarEntidadesHtml(match[1]).trim() || null;
  }
  return null;
}

function decodificarEntidadesHtml(texto: string): string {
  return texto
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extraerArticuloConReadability(html: string): string | null {
  const { document } = parseHTML(html);
  // deno-lint-ignore no-explicit-any
  const articulo = new Readability(document as any).parse();
  if (!articulo) return null;

  // Reconstruimos el HTML limpio (articulo.content) a texto plano preservando marcadores de
  // lista ("- " / "1. "), en vez de usar articulo.textContent, que los pierde. Así el parser
  // regex de ingredientes/pasos también funciona cuando la receta se captura solo con una URL.
  const textoConListas = articulo.content ? intentar(() => convertirHtmlATextoPlano(articulo.content!)) : null;
  const texto = (textoConListas && textoConListas.length > 20 ? textoConListas : articulo.textContent)
    ?.trim()
    .replace(/\n{3,}/g, "\n\n");

  return texto && texto.length > 20 ? texto : null;
}

const ETIQUETAS_TITULO = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6"]);

// Convierte el HTML ya limpiado por readability en texto plano, reponiendo "- " para <li> de
// <ul> y "1. "/"2. "... para <li> de <ol>, que es justo lo que busca el parser regex de RF-04.
function convertirHtmlATextoPlano(htmlFragmento: string): string {
  const { document } = parseHTML(`<div id="raiz">${htmlFragmento}</div>`);
  const raiz = document.getElementById("raiz");
  if (!raiz) return "";

  const lineas: string[] = [];
  const contadoresOl: number[] = [];

  function limpiar(texto: string | null): string {
    return (texto ?? "").trim().replace(/\s+/g, " ");
  }

  // deno-lint-ignore no-explicit-any
  function recorrer(nodo: any) {
    for (const hijo of Array.from(nodo.childNodes ?? []) as any[]) {
      if (hijo.nodeType !== 1) continue; // solo nodos elemento; el texto suelto vive dentro de p/li/h*

      const etiqueta = (hijo.tagName ?? "").toLowerCase();

      if (etiqueta === "ol") {
        contadoresOl.push(0);
        recorrer(hijo);
        contadoresOl.pop();
        continue;
      }

      if (etiqueta === "li") {
        const texto = limpiar(hijo.textContent);
        if (!texto) continue;
        if (contadoresOl.length > 0) {
          contadoresOl[contadoresOl.length - 1] += 1;
          lineas.push(`${contadoresOl[contadoresOl.length - 1]}. ${texto}`);
        } else {
          lineas.push(`- ${texto}`);
        }
        continue;
      }

      if (ETIQUETAS_TITULO.has(etiqueta)) {
        const texto = limpiar(hijo.textContent);
        if (texto) lineas.push(texto);
        continue;
      }

      // Contenedores (div, section, article, ul...): seguimos bajando buscando bloques.
      recorrer(hijo);
    }
  }

  recorrer(raiz);
  return lineas.join("\n");
}

function intentar<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}
