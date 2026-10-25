# FrankLabs — versión modular

## Arranque

```powershell
npm install
npm run dev
```
Visita `/labs`; home `/` conserva el portafolio. Para validar: `npm run build` y `npm run typecheck`.

## Estructura
- `src/main.jsx`: portafolio heredado (sin cambio visual; pendiente separación futura).
- `src/labs/LabsPage.tsx`: catálogo y navegación de FrankLabs.
- `src/labs/registry.ts`: registro centralizado de herramientas (nombre, ícono, URL).
- `src/labs/modules/qr/`: generador QR local.
- `src/labs/modules/archivosTemporales/`: selección local; SIN transferencia remota aún.
- `src/labs/modules/imagenes/`: conversión local mediante canvas.
- `src/labs/modules/audio/`: reproducción local.
- `src/labs/modules/kanban/`: tablero con persistencia localStorage.
- `src/labs/modules/notas/`: notas con persistencia localStorage.
- `src/labs/modules/espacios/`: espacios y proyectos con persistencia localStorage.
- `src/labs/shared/`: navegación e iconos.
- `src/services/firebase.ts`: adaptador Firebase opcional, NO conectado por defecto.

## Añadir nueva herramienta
1. Crear `src/labs/modules/nuevaHerramienta/NuevaHerramienta.jsx` y `index.js`.
2. Registrar sus metadatos en `src/labs/registry.ts`.
3. Añadir su import y entrada a `pages` en `src/labs/LabsPage.tsx`.
4. Probar la ruta `/labs/nueva-herramienta`.

## Firebase: seguridad
En el frontend solo son públicas las claves de configuración del SDK. **Nunca** introducir claves privadas de service account ni secretos. Antes de guardar información remota: crear proyecto en Firebase Console, habilitar Authentication, diseñar Security Rules basadas en usuario autenticado y membresía por organización, App Check, límites y monitoreo. No permitir `allow read, write: if true` en producción. `.env.local` está ignorado.

## Nota sobre GitHub Pages
La navegación directa a `/labs/...` en GitHub Pages requiere manejo de fallback o despliegue con soporte SPA (por ejemplo Cloudflare Pages). La prueba con Vite local sí dispone de fallback.

## Alcance actual
Kanban, notas y espacios persisten **solo en este navegador**, no entre dispositivos. El módulo de archivos temporales no sube nada todavía. El audio reproduce archivos locales, no convierte formatos. Todo esto necesita desarrollo backend adicional.
