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

## Cómo crear una variable con nombre (se repite mucho en esta guía)

Cada vez que la guía dice **"Definir variable `X` = resultado de la acción anterior"**, haz esto:

1. Añade la acción **"Definir variable"** (*Set Variable*) justo después de la acción cuyo
   resultado quieres guardar.
2. Toca el campo **"Variable Name"** / nombre de variable → escribe el nombre indicado (p. ej. `Plataforma`).
3. Toca el otro campo (el del valor/input) → normalmente ya aparece seleccionado el resultado de
   la acción justo anterior; si no, tócalo y elige esa variable de la lista que aparece.

A partir de ahora, cuando quieras usar `X` en un campo de una acción posterior, toca ese campo y
busca `X` en la lista de variables disponibles.

## Construcción del Shortcut, paso a paso

Abre la app **Atajos** (Shortcuts) en el iPhone → pestaña "Atajos" → botón **+** (nuevo atajo).
Ponle de nombre **"Recetario"**.

### 1. Configurar como destino de "Compartir"

- Toca el icono de ajustes (ⓘ) del atajo → **"Mostrar en la hoja de compartir"** → actívalo.
- **Tipos de entrada aceptados**: marca **Imágenes**, **Texto**, **URLs** y **Páginas web de Safari**
  (equivalente a "Cualquiera").

### 2. Extraer lo compartido (funciona sin importar qué app lo mandó)

1. **"Obtener URLs de entrada"** (*Get URLs from Input*) → Entrada: **Contenido compartido**
   (la variable mágica que Atajos pone automáticamente).
   Definir variable `URLCompartida` = resultado de esta acción.
2. **"Obtener texto de entrada"** (*Get Text from Input*) → Entrada: **Contenido compartido**.
   Definir variable `TextoCompartido` = resultado de esta acción.
3. **"Obtener imágenes de entrada"** (*Get Images from Input*) → Entrada: **Contenido compartido**.
   Definir variable `ImagenesCompartidas` = resultado de esta acción.

Cualquiera de las tres puede salir vacía según lo que se haya compartido — es normal, el backend
ya sabe manejarlo (guarda lo que haya, y como último recurso guarda la URL si no hay más texto).

### 3. Detectar la plataforma de origen (best-effort, igual que en la web)

4. **"Texto"** → escribe `manual`.
   Definir variable `Plataforma` = resultado de esta acción.
5. **"Si"** (*If*) → Condición: `URLCompartida` **contiene** `instagram.com`
   → Dentro: **"Texto"** → escribe `instagram` → Definir variable `Plataforma` = este texto
   (sí, se vuelve a "definir" la misma variable; eso sobrescribe su valor).
   → **"Si no"**:
     - **"Si"** → `URLCompartida` contiene `facebook.com` → **"Texto"** `facebook` → Definir variable `Plataforma`.
     - **"Si no"**:
       - **"Si"** → `URLCompartida` contiene `youtube.com` **o** contiene `youtu.be` → **"Texto"** `youtube` → Definir variable `Plataforma`.
       - **"Si no"**:
         - **"Si"** → `URLCompartida` **tiene algún valor** → **"Texto"** `web` → Definir variable `Plataforma`.
         - **"Fin si"** (repite "Fin si" para cerrar cada "Si" que hayas abierto)

Si te resulta muy tedioso anidar tantos "Si", puedes saltarte este paso 3 entero y dejar
`Plataforma` fija en `manual` (solo el paso 4) — el backend sigue funcionando igual, solo pierdes
el detalle de qué red social era.

### 4. Convertir las imágenes a base64

6. **"Lista"** (*List*) → vacía.
   Definir variable `ListaImagenes` = resultado de esta acción.
7. **"Repetir con cada elemento"** (*Repeat with Each*) → Elementos: `ImagenesCompartidas`.
   Dentro del repetir:
   - **"Codificar media"** (*Base64 Encode*) → Entrada: **Elemento del repetir** (*Repeat Item*).
     Definir variable `ImagenB64` = resultado.
   - **"Obtener detalles de imágenes"** (*Get Details of Images*) → Propiedad: **Tipo de medio**
     (*Media Type*) → Entrada: **Elemento del repetir**.
     Definir variable `TipoImagen` = resultado.
   - **"Diccionario"** (*Dictionary*) con dos claves:
     - `data` = `ImagenB64`
     - `content_type` = `TipoImagen`
     Definir variable `ImagenDict` = este diccionario.
   - **"Añadir a variable"** (*Add to Variable*) → Variable: `ListaImagenes`, Valor: `ImagenDict`.
     (Esta acción no necesita "Definir variable" después: "Añadir a variable" ya modifica
     `ListaImagenes` directamente.)
8. **"Fin de repetir"**.

### 5. Construir el cuerpo de la petición

9. **"Diccionario"** con estas claves y valores (todas son las variables que ya tienes):
   - `texto_crudo` = `TextoCompartido`
   - `fuente_url` = `URLCompartida`
   - `fuente_plataforma` = `Plataforma`
   - `imagenes_base64` = `ListaImagenes`
   Definir variable `CuerpoCaptura` = este diccionario.

### 6. Iniciar sesión para conseguir un token fresco

10. **"Diccionario"** con:
    - `email` = (tu email de Recetario, escrito directamente)
    - `password` = (tu contraseña de Recetario, escrita directamente)
    Definir variable `CredencialesLogin` = este diccionario.
11. **"Obtener contenido de URL"** (*Get Contents of URL*):
    - URL: `https://boqeyguefphutycynxma.supabase.co/auth/v1/token?grant_type=password`
    - Método: **POST**
    - Cabeceras:
      - `apikey` = (tu anon key)
      - `Content-Type` = `application/json`
    - Cuerpo de la petición: **JSON**, valor = `CredencialesLogin`
    Definir variable `RespuestaLogin` = resultado de esta acción.
12. **"Obtener valor del diccionario"** (*Get Dictionary Value*) → Clave: `access_token`,
    Diccionario: `RespuestaLogin`.
    Definir variable `AccessToken` = resultado.

### 7. Llamar a /api/captura

13. **"Obtener contenido de URL"**:
    - URL: `https://boqeyguefphutycynxma.supabase.co/functions/v1/captura`
    - Método: **POST**
    - Cabeceras:
      - `Authorization` = `Bearer AccessToken` (escribe `Bearer ` y luego inserta la variable
        `AccessToken` justo detrás, sin salto de línea)
      - `Content-Type` = `application/json`
    - Cuerpo de la petición: **JSON**, valor = `CuerpoCaptura`
    Definir variable `RespuestaCaptura` = resultado de esta acción.

### 8. Avisar si funcionó o si falló

14. **"Obtener valor del diccionario"** → Clave: `error`, Diccionario: `RespuestaCaptura`,
    marca **"Obtener valor si existe"** (*Get Value if Exists*, para que no falle si no hay error).
    Definir variable `MensajeError` = resultado.
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
