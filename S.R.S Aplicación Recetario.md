# Mini-SRS: Aplicación "Recetario"

**Versión:** 1.1
**Fecha:** 2026
**Autor:** \[Tu nombre]
**Estado:** Borrador para desarrollo
**Cambios respecto a v1.0:** Se añade restricción de coste cero absoluto y de no proporcionar métodos de pago.

\---

## 1\. Visión general

**Recetario** es una aplicación multiplataforma (iOS, Android, Web/PC) que permite al usuario capturar recetas de cocina encontradas en redes sociales (Instagram, Facebook, YouTube, WhatsApp, webs, etc.), almacenarlas en un repositorio personal y consultarlas cómodamente en cualquier dispositivo.

El principio de diseño central es: **capturar con fricción mínima, guardar el contenido tal cual, consultar sin esfuerzo.**

### Decisiones clave de alcance

1. **Sin IA/LLM**: no se usa inteligencia artificial para extraer, estructurar ni interpretar recetas.
2. **Sin OCR**: las imágenes se guardan tal cual se capturan.
3. **Sin APIs oficiales de redes sociales**: no se integran.
4. **Texto crudo + imágenes**: se guarda el contenido original sin procesar.
5. **Parser determinista best-effort**: opcional, nunca requisito.
6. **Coste cero absoluto**: todo el stack debe funcionar dentro de capas gratuitas permanentes.
7. **Sin métodos de pago**: no se proporciona tarjeta de crédito, PayPal ni ningún otro medio de pago en ningún servicio.

\---

## 2\. Objetivos del producto

|Objetivo|Descripción|
|-|-|
|Captura universal|Recibir recetas desde cualquier app mediante el menú de compartir del sistema|
|Cero fricción en iOS|Usar Shortcuts (Atajos) como puente de entrada|
|Cero coste de IA|Sin LLM, sin OCR, sin dependencias de proveedores de IA|
|Cero coste de infraestructura|Todo el stack dentro de capas gratuitas permanentes|
|Cero métodos de pago|Ningún servicio debe requerir tarjeta, PayPal ni similar|
|Repositorio unificado|Una única base de datos accesible desde todos los dispositivos|
|Consulta práctica|Buscar, filtrar y consultar recetas en el momento de cocinar|
|Mantenimiento mínimo|Todo determinista, sin workers complejos ni colas|

\---

## 3\. Alcance

### 3.1 Dentro del alcance (v1)

* Recepción de contenido compartido vía Shortcuts (iOS), Share Target (Android/Chrome) y entrada manual (Web).
* Almacenamiento de **texto crudo** e **imágenes** tal cual se capturan.
* Parser determinista opcional (best-effort) para pre-rellenar título, ingredientes, pasos y etiquetas.
* Búsqueda de texto completo sobre el contenido almacenado.
* Vista de receta en modo cocina.
* Edición manual de cualquier campo.
* Sincronización entre dispositivos.
* Funcionamiento completo dentro de capas gratuitas.

### 3.2 Fuera del alcance (v1)

* Extracción estructurada mediante IA/LLM.
* OCR de imágenes.
* Transcripción de audio de vídeos (salvo subtítulos automáticos de YouTube).
* Integración directa con APIs de redes sociales.
* Funciones sociales.
* Planificación de menús semanales / listas de compra automáticas.
* Filtros por ingrediente exacto.
* Cualquier servicio que requiera método de pago.

\---

## 4\. Casos de uso principales

### UC-01: Capturar receta desde Instagram (iOS)

1. El usuario ve un reel o publicación con una receta en Instagram.
2. Pulsa "Compartir" → selecciona "Recetario" en la hoja de compartir.
3. El atajo recibe la URL (y opcionalmente la imagen) y la envía al backend.
4. El backend obtiene el texto disponible (caption público o texto pegado) y guarda la imagen.
5. La receta aparece en el repositorio como **texto crudo + imagen**.

### UC-02: Capturar receta desde Android

1. El usuario ve una publicación en Facebook.
2. Pulsa "Compartir" → selecciona "Recetario" (PWA registrada como Share Target).
3. Mismo flujo que UC-01.

### UC-03: Capturar desde PC (Web)

1. El usuario copia un enlace de YouTube o el texto de una receta.
2. Abre la web de Recetario y pega el enlace o el texto en el campo de captura.
3. Sube opcionalmente una imagen.
4. Guarda la receta.

### UC-04: Consultar una receta

1. El usuario abre la app.
2. Busca por texto libre (título, contenido, etiquetas).
3. Abre la receta en modo cocina (texto grande, pantalla siempre encendida).

### UC-05: Edición manual

1. El usuario revisa una receta.
2. Edita título, texto, etiquetas, notas personales o reemplaza imágenes.
3. Guarda los cambios.

\---

## 5\. Requisitos funcionales

### RF-01: Entrada de contenido

* RF-01.1 El sistema debe aceptar URLs, texto plano e imágenes como entrada.
* RF-01.2 En iOS, debe integrarse con Shortcuts mediante "Mostrar en hoja de compartir" con tipo de entrada "Cualquiera".
* RF-01.3 En Android/Web, debe registrarse como Share Target (PWA).
* RF-01.4 Debe existir una entrada manual (campo de texto + pegar enlace + subir imagen) en la versión Web.

### RF-02: Obtención de contenido

* RF-02.1 El backend debe obtener metadatos de la URL (título, imagen de portada, descripción) mediante Open Graph.
* RF-02.2 El backend debe extraer el texto del artículo para webs compatibles usando `readability`.
* RF-02.3 Para YouTube, el backend debe obtener la transcripción vía subtítulos automáticos cuando estén disponibles.
* RF-02.4 Si no se puede obtener el texto automáticamente, la receta se guarda con el texto que el usuario haya pegado manualmente.

### RF-03: Modelo de datos de receta

Cada receta debe contener:

* `id`
* `titulo` (inferido o editado a mano)
* `texto\_crudo` (el texto original tal cual)
* `imagenes\[]` (URLs a storage)
* `fuente\_plataforma` (instagram / facebook / youtube / whatsapp / web / manual)
* `fuente\_url`
* `etiquetas\[]` (manuales o extraídas de hashtags)
* `notas\_personales`
* `fecha\_captura`
* `estado` (borrador / revisada)

**Campos derivados opcionales** (pre-rellenados por parser, siempre editables):

* `ingredientes\[]` (best-effort)
* `pasos\[]` (best-effort)

### RF-04: Parser determinista (opcional, best-effort)

* RF-04.1 Debe intentar extraer título de la primera línea o `og:title`.
* RF-04.2 Debe intentar extraer ingredientes de líneas que empiecen por `-`, `•`, `\*` o que contengan patrones de cantidad.
* RF-04.3 Debe intentar extraer pasos de líneas numeradas.
* RF-04.4 Debe extraer hashtags como etiquetas.
* RF-04.5 Si el parser falla, la receta se guarda igualmente con el texto crudo.

### RF-05: Repositorio y consulta

* RF-05.1 Listado de recetas con imagen y título.
* RF-05.2 Búsqueda de texto completo sobre `titulo`, `texto\_crudo` y `etiquetas`.
* RF-05.3 Filtro por etiqueta, plataforma de origen y fecha.
* RF-05.4 Vista detalle en "modo cocina" (texto grande, pantalla siempre encendida).

### RF-06: Edición

* RF-06.1 El usuario debe poder editar cualquier campo de una receta.
* RF-06.2 El usuario debe poder eliminar recetas.
* RF-06.3 El usuario debe poder añadir, reemplazar o eliminar imágenes.
* RF-06.4 El usuario debe poder añadir notas personales.

### RF-07: Sincronización

* RF-07.1 Los datos deben estar disponibles en iOS, Android y Web.
* RF-07.2 Los cambios deben reflejarse en todos los dispositivos.

\---

## 6\. Requisitos no funcionales

|Categoría|Requisito|
|-|-|
|Plataformas|iOS (Shortcuts + PWA), Android (PWA), Web (navegador)|
|Rendimiento|Captura → receta guardada en < 5 s|
|Disponibilidad|Backend con al menos 99% uptime|
|Seguridad|Autenticación de usuario; datos privados por defecto|
|**Coste**|**Cero absoluto. Solo capas gratuitas permanentes**|
|**Métodos de pago**|**Ningún servicio puede requerir tarjeta, PayPal ni similar**|
|Mantenibilidad|Arquitectura lineal, sin colas ni workers de IA|
|Dependencias|Sin dependencia de proveedores de IA|

\---

## 7\. Arquitectura propuesta (alto nivel)

```
┌──────────────────────────────────────────────┐
│ CAPTURA                                      │
│ iOS Shortcuts │ Android Share │ Web manual   │
└───────┬──────────────┬──────────────┬────────┘
        │              │              │
        └──────────────┼──────────────┘
                       ▼
              ┌─────────────────┐
              │ API Backend     │
              │ (Supabase Edge  │
              │  Functions)     │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │ Parser simple   │  ← opcional, sin IA
              │ (regex + OG)    │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │ Supabase        │
              │ (Postgres +     │
              │  Storage)       │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │ Frontend PWA    │
              │ (Vercel)        │
              └─────────────────┘
```

\---

## 8\. Stack técnico (todo gratuito, sin método de pago)

|Capa|Tecnología|Límite gratuito|¿Requiere pago?|
|-|-|-|-|
|Frontend (PWA)|Vercel|100 GB ancho de banda/mes|No|
|Backend|Supabase Edge Functions|500,000 llamadas/mes|No|
|Base de datos|Supabase Postgres|500 MB|No|
|Autenticación|Supabase Auth|50,000 MAU|No|
|Almacenamiento de imágenes|Supabase Storage|1 GB|No|
|Extracción web|`readability`, `open-graph-scraper`|Librerías open source|No|
|Transcripción YouTube|`yt-dlp --write-auto-sub`|Open source|No|
|Puente iOS|Shortcuts (app nativa de Apple)|Gratis|No|
|Puente Android|PWA + Web Share Target API|Estándar web|No|
|Dominio|Subdominio gratuito de Vercel|`\*.vercel.app`|No|

**Nota importante:** el proyecto Supabase gratuito se pausa tras 7 días de inactividad. Se reactiva manualmente desde el panel de control sin pérdida de datos.

\---

## 9\. Flujo de datos detallado (captura iOS)

1. Usuario comparte URL (y opcionalmente imagen) desde Instagram.
2. Shortcut "Recetario" recibe el contenido.
3. Shortcut hace `POST /api/captura` con `{ url, imagen?, plataforma, timestamp }`.
4. Edge Function de Supabase obtiene metadatos vía Open Graph.
5. Edge Function intenta extraer texto (readability / transcripción YouTube).
6. Edge Function ejecuta parser determinista (best-effort).
7. Edge Function guarda receta con texto crudo + imágenes + campos derivados.
8. Receta visible en la PWA.

\---

## 10\. Criterios de aceptación (v1)

* \[ ] Puedo compartir una URL desde Instagram en iOS y la receta aparece guardada con su texto e imagen.
* \[ ] Puedo compartir desde Android sin instalar nada extra.
* \[ ] Puedo pegar un enlace o texto en la Web y obtener el mismo resultado.
* \[ ] Puedo subir una imagen manualmente desde la Web.
* \[ ] Puedo buscar por texto libre y encontrar la receta.
* \[ ] Puedo editar cualquier campo de una receta.
* \[ ] Puedo ver la receta en modo cocina en el móvil.
* \[ ] Los datos se sincronizan entre dispositivos.
* \[ ] La app funciona completamente sin ninguna llamada a un LLM.
* \[ ] **En ningún momento del desarrollo o uso se ha proporcionado un método de pago a ningún servicio.**
* \[ ] **El coste mensual del proyecto es 0 €.**

\---

## 11\. Limitaciones conocidas

|Limitación|Motivo|
|-|-|
|Instagram y Facebook bloquean scraping|No se puede obtener el caption automáticamente en todos los casos|
|Reels con receta solo en audio|Sin transcripción no hay texto que capturar|
|No hay filtro por ingrediente exacto|Los ingredientes no son un campo estructurado|
|No hay listas de compra automáticas|Requiere estructura que no tenemos|
|No hay OCR de imágenes|Fuera de alcance por decisión de diseño|
|Supabase se pausa tras 7 días de inactividad|Limitación del plan gratuito; se reactiva manualmente|
|1 GB de storage para imágenes|Suficiente para \~2,000 imágenes de 500 KB|
|500 MB de base de datos|Suficiente para decenas de miles de recetas de texto|

\---

## 12\. Roadmap sugerido

|Fase|Entregable|
|-|-|
|Fase 0|Prototipo: pegar enlace en Web → receta guardada con texto + imagen|
|Fase 1|PWA + Share Target Android + Shortcut iOS|
|Fase 2|Búsqueda full-text, filtros, modo cocina|
|Fase 3|Edición, notas, etiquetas personalizadas, gestión de imágenes|
|Fase 4|(Opcional) Parser avanzado, listas de compra manuales|

\---

## 13\. Glosario

* **Texto crudo**: contenido textual tal cual se captura, sin procesar.
* **Parser determinista**: conjunto de reglas (regex, selectores HTML) que intentan pre-rellenar campos. No usa IA.
* **Share Target**: API web que permite a una PWA recibir contenido desde el menú de compartir del sistema.
* **Shortcuts (Atajos)**: app de Apple para automatizar tareas; se usa como puente de captura en iOS.
* **Open Graph**: conjunto de metadatos HTML (`og:title`, `og:image`, etc.) que describen una página.
* **Readability**: librería que extrae el contenido principal de un artículo HTML.
* **Modo cocina**: vista de receta optimizada para cocinar (texto grande, pantalla siempre encendida).
* **Edge Function**: función serverless ejecutada en el borde de la red; en Supabase, permite ejecutar lógica backend sin mantener un servidor.
* **MAU**: Monthly Active Users, usuarios activos mensuales.

\---

## 14\. Restricciones críticas del proyecto

Estas restricciones son **no negociables** y deben respetarse en todo momento:

1. **No se proporciona método de pago a ningún servicio.**
2. **No se usan servicios de pago ni planes de prueba que requieran tarjeta.**
3. **No se introduce IA/LLM/OCR en ningún punto del sistema.**
4. **El texto crudo se guarda siempre, con o sin parser.**
5. **La app debe funcionar completamente aunque el parser falle.**
6. **El coste mensual debe ser 0 € de forma permanente.**

