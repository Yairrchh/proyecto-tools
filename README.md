# Compresor de imágenes

Comprime imágenes JPG, PNG y WebP directamente en el navegador: sin registro y sin subir archivos.

## Desarrollo

    npm install
    npm run dev          # http://localhost:3000
    npm test             # pruebas unitarias (Vitest)
    npm run test:e2e     # pruebas de navegador (Playwright, escritorio y móvil)

`dev` y `build` usan webpack (`--webpack`): con Turbopack la compilación se quedó colgada al
incluir el Worker con los códecs WASM.

## Estructura

- `src/lib`: lógica pura (validación, nombres, cola, estado de trabajos, ZIP) y motor de compresión.
- `src/workers`: Web Worker que ejecuta los códecs WASM (jSquash).
- `src/hooks`, `src/components`: interfaz React.
- `src/app`: rutas (`/`, `/comprimir-jpg`, `/comprimir-png`, `/comprimir-webp`), sitemap y robots.
- `docs/superpowers`: especificación de diseño y plan de implementación.

## Configuración

- `NEXT_PUBLIC_SITE_URL`: URL pública del sitio (para sitemap, robots y metadatos). Por defecto `http://localhost:3000`.
- El nombre del producto está en `src/lib/site.ts`.
