import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabaseClient";
import { Login } from "./pages/Login";
import { Captura } from "./pages/Captura";
import { Listado } from "./pages/Listado";

type Pestana = "captura" | "listado";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [pestana, setPestana] = useState<Pestana>("captura");
  const [recargarSenal, setRecargarSenal] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCargandoSesion(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nuevaSesion) => {
      setSession(nuevaSesion);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (cargandoSesion) return null;
  if (!session) return <Login />;

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", fontFamily: "sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Recetario</h1>
        <button onClick={() => supabase.auth.signOut()} style={{ padding: "6px 12px" }}>
          Cerrar sesión
        </button>
      </header>

      <nav style={{ marginBottom: 24, display: "flex", gap: 8 }}>
        <button
          onClick={() => setPestana("captura")}
          style={{ padding: "8px 16px", fontWeight: pestana === "captura" ? "bold" : "normal" }}
        >
          Capturar
        </button>
        <button
          onClick={() => setPestana("listado")}
          style={{ padding: "8px 16px", fontWeight: pestana === "listado" ? "bold" : "normal" }}
        >
          Mis recetas
        </button>
      </nav>

      {pestana === "captura" ? (
        <Captura
          onGuardada={() => {
            setRecargarSenal((n) => n + 1);
            setPestana("listado");
          }}
        />
      ) : (
        <Listado recargarSenal={recargarSenal} />
      )}
    </div>
  );
}
