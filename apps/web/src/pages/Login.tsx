import { FormEvent, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [modo, setModo] = useState<"entrar" | "registrarse">("entrar");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setCargando(true);

    const { error } =
      modo === "entrar"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setCargando(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (modo === "registrarse") {
      setAviso("Cuenta creada. Si Supabase requiere confirmación por email, revisa tu bandeja de entrada.");
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h1>Recetario</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>
        </div>

        {error && <p style={{ color: "crimson" }}>{error}</p>}
        {aviso && <p style={{ color: "green" }}>{aviso}</p>}

        <button type="submit" disabled={cargando} style={{ width: "100%", padding: 10 }}>
          {cargando ? "Procesando..." : modo === "entrar" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>

      <button
        onClick={() => setModo(modo === "entrar" ? "registrarse" : "entrar")}
        style={{ marginTop: 12, background: "none", border: "none", color: "#0366d6", cursor: "pointer" }}
      >
        {modo === "entrar" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Entra"}
      </button>
    </div>
  );
}
