import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Necesario para que la PWA sea instalable y para poder recibir el "Compartir" del sistema
// (Web Share Target) en /compartir. Si el navegador no soporta Service Workers, se ignora.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("No se pudo registrar el Service Worker:", error);
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
