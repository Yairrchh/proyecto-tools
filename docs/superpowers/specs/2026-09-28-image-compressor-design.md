# Compresor de imágenes online — Documento de diseño

Fecha: 2026-09-28

## 1. Objetivo

Construir una herramienta web para comprimir imágenes (JPG, PNG, WebP) que procese todo en el navegador del usuario, sin subir archivos a ningún servidor.

**Objetivos del proyecto:**
- Aprender y volver a programar con un stack moderno (Next.js, TypeScript, WASM, Web Workers).
- Dejar una base que pueda crecer a futuro hacia un producto real (más formatos, PDF, etc.) sin rehacerla.

**Criterios de éxito:**
- Corto plazo: una herramienta terminada, rápida y que funcione bien en móvil.
- Largo plazo: que reciba visitas orgánicas por SEO y sea ampliable.

**Enfoque de negocio:** SEO desde el primer día. Sin planes de pago, cuentas ni publicidad hasta comprobar que hay tráfico.

## 2. Alcance de la primera versión

**Incluye:**
- Comprimir JPG, PNG y WebP, varias imágenes a la vez.
- Mostrar tamaño original, tamaño final y porcentaje de ahorro por imagen.
- Descarga individual y descarga de todo en un ZIP.
- Sin registro. Sin subida de archivos.
- Selector de calidad con tres niveles: alta calidad, equilibrada (por defecto) y máxima compresión.
- Modo claro y oscuro según la preferencia del sistema.
- Páginas SEO por formato, en español.

**Fuera de alcance (por ahora):** conversión de formatos, redimensionar, recortar, PDF, cuentas, pagos, API, otros idiomas, comparador antes/después.

## 3. Stack

| Pieza | Elección |
|---|---|
| Framework | Next.js (App Router, páginas estáticas) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS |
| Códecs | jSquash (mozjpeg, oxipng, webp, en WASM) |
| Procesamiento | Web Workers |
| ZIP | fflate |
| Hosting | Vercel o Cloudflare Pages |
| Analítica | Plausible o Google Analytics |
| Pruebas | Vitest (unitarias), Playwright (interfaz) |

Sin backend ni base de datos.

## 4. Arquitectura

Todo el procesamiento ocurre en el navegador.

```
Usuario suelta imágenes
        ↓
Validación (formato, tamaño máximo)
        ↓
Cola de trabajos → Web Worker
        ↓
Códec WASM (mozjpeg / oxipng / webp)
        ↓
Resultado: original → comprimido, % de ahorro
        ↓
Descarga individual o ZIP
```

### Componentes

| Componente | Responsabilidad |
|---|---|
| Dropzone | Recibe archivos por arrastrar o seleccionar y los valida. |
| Worker de compresión | Ejecuta el códec fuera del hilo principal. |
| Cola | Limita cuántas imágenes se procesan a la vez para no agotar la memoria. |
| Lista de resultados | Muestra por imagen: miniatura, progreso, tamaño antes/después y botón de descarga. |
| Descargar todo | Empaqueta los resultados en un ZIP con fflate. |
| Selector de calidad | Tres niveles que se traducen a parámetros de cada códec. |

### Estructura de rutas
- `/`: la herramienta directamente, sin landing intermedia.
- `/comprimir-jpg`, `/comprimir-png`, `/comprimir-webp`: rutas SEO que reutilizan el mismo componente de la herramienta, cada una con su título, descripción y texto propio.
- Páginas estáticas generadas en el build.

## 5. Manejo de errores

- Formato no soportado: se rechaza el archivo con un mensaje claro.
- Archivo demasiado grande: se rechaza con un mensaje que indica el límite.
- Fallo del códec en una imagen: esa imagen se marca con error y las demás continúan.
- Si el archivo comprimido resulta más grande que el original: se conserva el original y se indica.
- Los códecs WASM se cargan bajo demanda; si la carga falla, se muestra un error y la opción de reintentar.

## 6. Diseño visual y experiencia

- Una sola zona grande de arrastrar y soltar al entrar, sin menús ni distracciones.
- Resultados en vivo, con progreso por imagen y `4.2 MB → 1.1 MB (−74%)`.
- Mensaje de privacidad visible: "Tus imágenes no salen de tu dispositivo."
- Móvil primero: botones grandes, la opción de seleccionar abre la galería o la cámara, y un límite de trabajos simultáneos más bajo en móvil.
- Objetivo de rendimiento: buena puntuación en Lighthouse; los códecs WASM no se cargan al abrir la página, solo cuando se necesitan.

## 7. SEO

- Título, descripción y datos estructurados propios por página de herramienta.
- Texto útil bajo la herramienta: cómo se usa y preguntas frecuentes.
- Sitemap y `robots.txt`.
- Solo español en la primera versión.

## 8. Pruebas

- **Unitarias (Vitest):** validación de archivos, cálculo del ahorro, cola de trabajos, manejo de errores.
- **Interfaz (Playwright):** subir imágenes reales, comprobar que se comprimen y que el tamaño baja, y que el ZIP se descarga.
- **Manual:** prueba en un móvil real antes de publicar.

## 9. Decisiones pendientes para el plan

- Tamaño máximo por archivo y número máximo de imágenes por lote.
- Valores concretos de los tres niveles de calidad para cada códec.
- Nombre del producto y dominio (verificar disponibilidad).
- Hosting definitivo (Vercel o Cloudflare Pages) y herramienta de analítica.
