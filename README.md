# Recetario

Repositorio personal de recetas capturadas desde redes sociales. Ver `S.R.S Aplicación Recetario.md` para el alcance completo.

## Estado

- Backend completo: captura (con parser determinista + Open Graph/readability), API REST
  (recetas, imágenes), búsqueda de texto completo.
- PWA completa: login, captura manual, listado con filtros y búsqueda, detalle, edición, modo
  cocina.
- Instalable en Android/Web con Web Share Target (compartir desde otras apps).
- Shortcut de iOS documentado en [`docs/shortcut-ios.md`](docs/shortcut-ios.md).
- Desplegada en Vercel: https://recetario-eight-self.vercel.app

Pendiente: transcripción automática de YouTube (`yt-dlp`).

## Estructura

```
supabase/
  migrations/                # SQL versionado del esquema
  functions/
    captura/                 # POST /api/captura
    recetas/                 # GET/PATCH/DELETE /api/recetas(/:id)
    imagenes/                 # POST /api/imagenes
    buscar/                  # GET /api/buscar?q=...
    _shared/                 # CORS, autenticación, parser, extracción de URL
apps/web/                    # PWA (Vite + React + TypeScript)
docs/shortcut-ios.md         # Guía paso a paso del Shortcut de iOS
```

## Puesta en marcha (Fase 0)

### 1. Base de datos y Storage (Supabase)

Con el [CLI de Supabase](https://supabase.com/docs/guides/cli) instalado y logueado (`supabase login`):

```bash
supabase link --project-ref boqeyguefphutycynxma
supabase db push
```

Esto crea la tabla `recetas`, sus políticas RLS y el bucket privado `imagenes`.

### 2. Desplegar la Edge Function

```bash
supabase functions deploy captura --project-ref boqeyguefphutycynxma
```

No requiere variables de entorno adicionales: `SUPABASE_URL` y `SUPABASE_ANON_KEY` los inyecta Supabase automáticamente en el runtime de la función.

### 3. PWA

```bash
cd apps/web
npm install
cp .env.example .env
```

Edita `.env` y pega tu `anon key` (Supabase Dashboard → Project Settings → API):

```
VITE_SUPABASE_URL=https://boqeyguefphutycynxma.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>
```

```bash
npm run dev
```

Abre la URL local, crea una cuenta (email + contraseña), y prueba a capturar una receta pegando texto o un enlace. Debería aparecer en "Mis recetas".

### Nota sobre confirmación de email

Si tu proyecto Supabase tiene activada la confirmación por email, tendrás que confirmar la cuenta desde el correo antes de poder iniciar sesión. Se puede desactivar en Authentication → Providers → Email → "Confirm email" si quieres probar más rápido en desarrollo.
