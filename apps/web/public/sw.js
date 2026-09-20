// Service Worker de Recetario.
// Dos trabajos: (1) hacer la PWA instalable (requisito del navegador para el Share Target),
// y (2) interceptar el POST que el sistema operativo manda a /compartir cuando el usuario
// pulsa "Compartir" -> "Recetario" desde otra app, y guardar esos datos en IndexedDB para
// que la propia app (src/pages/Compartir.tsx) los recoja al abrirse.

const DB_NOMBRE = "recetario-compartido";
const DB_VERSION = 1;
const ALMACEN = "pendientes";
const CLAVE_UNICA = "ultimo";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === "POST" && url.pathname === "/compartir") {
    event.respondWith(manejarCompartir(event));
    return;
  }

  // Todo lo demás (la propia app, llamadas a Supabase, etc.) sigue su camino normal.
});

async function manejarCompartir(event) {
  try {
    const formData = await event.request.formData();
    const titulo = formData.get("titulo") || "";
    const texto = formData.get("texto") || "";
    const url = formData.get("url") || "";
    const archivos = formData.getAll("imagenes").filter((f) => f instanceof File && f.size > 0);

    await guardarPendiente({ titulo, texto, url, archivos });
  } catch (error) {
    // Best-effort: si algo falla al leer lo compartido, seguimos igualmente a /compartir,
    // que mostrará que no había nada que recoger en vez de romper la navegación.
    console.error("Error procesando share target:", error);
  }

  return Response.redirect("/compartir", 303);
}

function abrirDB() {
  return new Promise((resolve, reject) => {
    const peticion = indexedDB.open(DB_NOMBRE, DB_VERSION);
    peticion.onupgradeneeded = () => {
      peticion.result.createObjectStore(ALMACEN);
    };
    peticion.onsuccess = () => resolve(peticion.result);
    peticion.onerror = () => reject(peticion.error);
  });
}

async function guardarPendiente(datos) {
  const db = await abrirDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(ALMACEN, "readwrite");
    tx.objectStore(ALMACEN).put(datos, CLAVE_UNICA);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
