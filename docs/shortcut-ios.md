# Shortcut de iOS para Recetario

Safari en iOS no soporta Web Share Target, así que en iPhone/iPad la captura se hace con un
**Shortcut (Atajo)** que recibe el contenido de la hoja de compartir y llama directamente a
`POST /api/captura`, igual que hace la PWA.

Nota de seguridad: este Shortcut guarda tu email y contraseña de Recetario dentro de sus propios
pasos, para poder pedir un token de acceso nuevo cada vez que lo uses (los tokens de sesión
caducan en ~1 hora, así que no se puede guardar uno fijo). Eso significa:
- Tu contraseña queda guardada, en texto, dentro del Shortcut, **en tu iPhone**.
- **No compartas este Shortcut** con nadie, ni lo subas a la galería pública de Shortcuts.
- Si alguna vez cambias tu contraseña de Recetario, tendrás que actualizarla también aquí.

## Datos que necesitas antes de empezar

- **URL del proyecto Supabase**: `https://boqeyguefphutycynxma.supabase.co`
- **Anon key**: la misma que usa la PWA, en `apps/web/.env` (`VITE_SUPABASE_ANON_KEY`).
- **Tu email y contraseña** de Recetario (con los que entras en la PWA).

## Construcción del Shortcut, paso a paso

Abre la app **Atajos** (Shortcuts) en el iPhone → pestaña "Atajos" → botón **+** (nuevo atajo).
Ponle de nombre **"Recetario"**.

### 1. Configurar como destino de "Compartir"

- Toca el icono de ajustes (ⓘ) del atajo → **"Mostrar en la hoja de compartir"** → actívalo.
- **Tipos de entrada aceptados**: marca **Imágenes**, **Texto**, **URLs** y **Páginas web de Safari**
  (equivalente a "Cualquiera").

### 2. Extraer lo compartido (funciona sin importar qué app lo mandó)

Añade estas acciones en orden (todas empiezan igual: busca la acción por su nombre en el buscador
de acciones de Atajos):

1. **"Obtener URLs de entrada"** (*Get URLs from Input*) → Entrada: **Contenido compartido**
   (la variable mágica que Atajos pone automáticamente).
   → Renombra el resultado (toca la variable de salida y usa "Renombrar variable") a `URLCompartida`.
2. **"Obtener texto de entrada"** (*Get Text from Input*) → Entrada: **Contenido compartido**.
   → Renombra el resultado a `TextoCompartido`.
3. **"Obtener imágenes de entrada"** (*Get Images from Input*) → Entrada: **Contenido compartido**.
   → Renombra el resultado a `ImagenesCompartidas`.

Cualquiera de las tres puede salir vacía según lo que se haya compartido — es normal, el backend
ya sabe manejarlo (guarda lo que haya, y como último recurso guarda la URL si no hay más texto).

### 3. Detectar la plataforma de origen (best-effort, igual que en la web)

4. **"Texto"** → escribe `manual` → renómbralo a `Plataforma` (esta es la variable que iremos
   sobrescribiendo).
5. **"Si"** (*If*) → Condición: `URLCompartida` **contiene** `instagram.com`
   → Dentro: **"Establecer variable"** `Plataforma` = `instagram`
   → **"Si no"**:
     - **"Si"** → `URLCompartida` contiene `facebook.com` → `Plataforma` = `facebook`
     - **"Si no"**:
       - **"Si"** → `URLCompartida` contiene `youtube.com` **o** contiene `youtu.be` → `Plataforma` = `youtube`
       - **"Si no"**:
         - **"Si"** → `URLCompartida` **tiene algún valor** → `Plataforma` = `web`
         - **"Fin si"** (repite "Fin si" para cerrar cada "Si" que hayas abierto)

Si te resulta muy tedioso anidar tantos "Si", puedes saltarte este paso 3 entero y dejar
`Plataforma` fija en `manual` — el backend sigue funcionando igual, solo pierdes el detalle de
qué red social era.

### 4. Convertir las imágenes a base64

6. **"Lista"** (*List*) → vacía → renómbrala a `ListaImagenes`.
7. **"Repetir con cada elemento"** (*Repeat with Each*) → Elementos: `ImagenesCompartidas`.
   Dentro del repetir:
   - **"Codificar media"** (*Base64 Encode*) → Entrada: **Elemento del repetir** (*Repeat Item*)
     → renombra a `ImagenB64`.
   - **"Obtener detalles de imágenes"** (*Get Details of Images*) → Propiedad: **Tipo de medio**
     (*Media Type*) → Entrada: **Elemento del repetir** → renombra a `TipoImagen`.
   - **"Diccionario"** (*Dictionary*) con dos claves:
     - `data` = `ImagenB64`
     - `content_type` = `TipoImagen`
     → renombra el diccionario a `ImagenDict`.
   - **"Añadir a variable"** (*Add to Variable*) → Variable: `ListaImagenes`, Valor: `ImagenDict`.
8. **"Fin de repetir"**.

### 5. Construir el cuerpo de la petición

9. **"Diccionario"** con estas claves y valores (todas son las variables que ya tienes):
   - `texto_crudo` = `TextoCompartido`
   - `fuente_url` = `URLCompartida`
   - `fuente_plataforma` = `Plataforma`
   - `imagenes_base64` = `ListaImagenes`
   → renombra a `CuerpoCaptura`.

### 6. Iniciar sesión para conseguir un token fresco

10. **"Diccionario"** con:
    - `email` = (tu email de Recetario, escrito directamente)
    - `password` = (tu contraseña de Recetario, escrita directamente)
    → renombra a `CredencialesLogin`.
11. **"Obtener contenido de URL"** (*Get Contents of URL*):
    - URL: `https://boqeyguefphutycynxma.supabase.co/auth/v1/token?grant_type=password`
    - Método: **POST**
    - Cabeceras:
      - `apikey` = (tu anon key)
      - `Content-Type` = `application/json`
    - Cuerpo de la petición: **JSON**, valor = `CredencialesLogin`
    → renombra el resultado a `RespuestaLogin`.
12. **"Obtener valor del diccionario"** (*Get Dictionary Value*) → Clave: `access_token`,
    Diccionario: `RespuestaLogin` → renombra a `AccessToken`.

### 7. Llamar a /api/captura

13. **"Obtener contenido de URL"**:
    - URL: `https://boqeyguefphutycynxma.supabase.co/functions/v1/captura`
    - Método: **POST**
    - Cabeceras:
      - `Authorization` = `Bearer AccessToken` (escribe `Bearer ` y luego inserta la variable
        `AccessToken` justo detrás, sin salto de línea)
      - `Content-Type` = `application/json`
    - Cuerpo de la petición: **JSON**, valor = `CuerpoCaptura`
    → renombra el resultado a `RespuestaCaptura`.

### 8. Avisar si funcionó o si falló

14. **"Obtener valor del diccionario"** → Clave: `error`, Diccionario: `RespuestaCaptura`,
    marca **"Obtener valor si existe"** (*Get Value if Exists*, para que no falle si no hay error)
    → renombra a `MensajeError`.
15. **"Si"** → `MensajeError` **tiene algún valor**:
    - **"Mostrar notificación"** → "Recetario" / "Error: MensajeError"
    - **"Si no"**:
      - **"Mostrar notificación"** → "Recetario" / "Receta guardada ✓"
    - **"Fin si"**

Guarda el Shortcut.

## Probarlo

1. Abre Instagram, Safari, o cualquier app con una receta.
2. Pulsa **Compartir** → busca **"Recetario"** en la lista (si no aparece a la primera, baja hasta
   "Más" / "Editar acciones" y actívalo).
3. Debería aparecer una notificación "Receta guardada ✓" en unos segundos.
4. Comprueba en la PWA (`https://recetario-eight-self.vercel.app`) que la receta apareció en
   "Mis recetas".

## Problemas típicos

- **"Error: Invalid login credentials"**: revisa que el email/contraseña del paso 6 estén bien
  escritos (sensible a mayúsculas).
- **"Error: No autenticado"**: revisa que la cabecera `Authorization` del paso 7 tenga exactamente
  `Bearer ` (con un espacio) seguido del token, sin saltos de línea de más.
- **No aparece "Recetario" en la hoja de compartir**: vuelve a la app Atajos → tu atajo → ⓘ →
  confirma que "Mostrar en la hoja de compartir" sigue activado, y que los tipos de entrada
  incluyen lo que estás intentando compartir.
