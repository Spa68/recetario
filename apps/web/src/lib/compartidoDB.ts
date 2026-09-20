// Debe coincidir exactamente con el esquema que usa public/sw.js (no se puede compartir código
// TypeScript con un Service Worker plano servido tal cual desde /public).

const DB_NOMBRE = "recetario-compartido";
const DB_VERSION = 1;
const ALMACEN = "pendientes";
const CLAVE_UNICA = "ultimo";

export interface CompartidoPendiente {
  titulo: string;
  texto: string;
  url: string;
  archivos: File[];
}

function abrirDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const peticion = indexedDB.open(DB_NOMBRE, DB_VERSION);
    peticion.onupgradeneeded = () => {
      peticion.result.createObjectStore(ALMACEN);
    };
    peticion.onsuccess = () => resolve(peticion.result);
    peticion.onerror = () => reject(peticion.error);
  });
}

export async function leerCompartidoPendiente(): Promise<CompartidoPendiente | null> {
  const db = await abrirDB();
  const resultado = await new Promise<CompartidoPendiente | null>((resolve, reject) => {
    const tx = db.transaction(ALMACEN, "readonly");
    const peticion = tx.objectStore(ALMACEN).get(CLAVE_UNICA);
    peticion.onsuccess = () => resolve(peticion.result ?? null);
    peticion.onerror = () => reject(peticion.error);
  });
  db.close();
  return resultado;
}

export async function borrarCompartidoPendiente(): Promise<void> {
  const db = await abrirDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(ALMACEN, "readwrite");
    tx.objectStore(ALMACEN).delete(CLAVE_UNICA);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
