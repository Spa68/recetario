import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";
import { Login } from "./pages/Login";
import { Captura } from "./pages/Captura";
import { Listado } from "./pages/Listado";
import { Detalle } from "./pages/Detalle";
import { Edicion } from "./pages/Edicion";
import { ModoCocina } from "./pages/ModoCocina";
import { Compartir } from "./pages/Compartir";

const estiloEnlace = ({ isActive }: { isActive: boolean }) => ({
  padding: "8px 16px",
  fontWeight: isActive ? "bold" : "normal",
  textDecoration: "none",
  color: "inherit",
});

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);

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
    <BrowserRouter>
      <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ margin: 0 }}>Recetario</h1>
          <button onClick={() => supabase.auth.signOut()} style={{ padding: "6px 12px" }}>
            Cerrar sesión
          </button>
        </header>

        <nav style={{ marginBottom: 24, display: "flex", gap: 8 }}>
          <NavLink to="/" end style={estiloEnlace}>
            Mis recetas
          </NavLink>
          <NavLink to="/capturar" style={estiloEnlace}>
            Capturar
          </NavLink>
        </nav>

        <Routes>
          <Route path="/" element={<Listado />} />
          <Route path="/capturar" element={<Captura />} />
          <Route path="/recetas/:id" element={<Detalle />} />
          <Route path="/recetas/:id/editar" element={<Edicion />} />
          <Route path="/recetas/:id/cocina" element={<ModoCocina />} />
          <Route path="/compartir" element={<Compartir />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
