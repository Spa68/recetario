// Parser determinista (RF-04): extrae título, ingredientes, pasos y hashtags de un texto.
// Solo regex, sin IA. Best-effort: cualquier fallo se ignora y no bloquea el guardado.

export interface Ingrediente {
  nombre: string;
  cantidad_texto: string;
}

export interface Paso {
  orden: number;
  texto: string;
}

export interface ResultadoParser {
  titulo: string | null;
  ingredientes: Ingrediente[];
  pasos: Paso[];
  etiquetas: string[];
}

const PATRON_HASHTAG = /#([\p{L}0-9_]+)/gu;
const PATRON_VINETA = /^\s*[-•*]\s+(.*)$/;
const PATRON_PASO = /^\s*(\d+)[.)]\s+(.+)$/;
const PATRON_CANTIDAD =
  /^([\d½¼¾⅓⅔.,/\s]*\s*(?:g|gr|gramos?|kg|ml|l|litros?|cucharadas?|cdas?|cucharaditas?|cditas?|tazas?|unidades?|uds?|dientes?|pizca|al gusto)?\.?)\s+(.+)$/i;

function extraerHashtags(texto: string): string[] {
  const encontrados = new Set<string>();
  for (const match of texto.matchAll(PATRON_HASHTAG)) {
    encontrados.add(match[1].toLowerCase());
  }
  return [...encontrados];
}

function extraerTitulo(texto: string): string | null {
  const lineas = texto
    .split("\n")
    .map((l) => l.replace(PATRON_HASHTAG, "").trim())
    .filter(Boolean);

  for (const linea of lineas) {
    if (linea.length >= 3) {
      return linea.length > 150 ? `${linea.slice(0, 150)}...` : linea;
    }
  }
  return null;
}

function extraerIngredientes(texto: string): Ingrediente[] {
  const ingredientes: Ingrediente[] = [];
  for (const linea of texto.split("\n")) {
    const match = linea.match(PATRON_VINETA);
    if (!match) continue;
    const contenido = match[1].trim();
    if (!contenido) continue;

    const conCantidad = contenido.match(PATRON_CANTIDAD);
    if (conCantidad && conCantidad[1].trim() && conCantidad[2].trim()) {
      ingredientes.push({ cantidad_texto: conCantidad[1].trim(), nombre: conCantidad[2].trim() });
    } else {
      ingredientes.push({ cantidad_texto: "", nombre: contenido });
    }
  }
  return ingredientes;
}

function extraerPasos(texto: string): Paso[] {
  const pasos: Paso[] = [];
  for (const linea of texto.split("\n")) {
    const match = linea.match(PATRON_PASO);
    if (!match) continue;
    pasos.push({ orden: Number(match[1]), texto: match[2].trim() });
  }
  return pasos;
}

export function analizarTexto(texto: string): ResultadoParser {
  try {
    return {
      titulo: extraerTitulo(texto),
      ingredientes: extraerIngredientes(texto),
      pasos: extraerPasos(texto),
      etiquetas: extraerHashtags(texto),
    };
  } catch {
    return { titulo: null, ingredientes: [], pasos: [], etiquetas: [] };
  }
}
