# FrankLabs — corrección de integridad y estructura

Esta entrega conserva los siete módulos originales, los estilos del portafolio y sus imágenes. Se verificó que todos los imports locales resuelven a un archivo real.

## Ruta

Abre la carpeta que contiene `package.json` (no la carpeta superior duplicada).

```powershell
npm install
npm run typecheck
npm run build
npm run dev
```

## Reparación puntual

La importación `./shared/navigation.js` en `src/labs/LabsPage.tsx` apunta a `src/labs/shared/navigation.js`. Este archivo existe en el paquete corregido. En el módulo de espacios se reformateó `SpacesTool.jsx` para hacerlo legible sin cambiar el comportamiento previsto.

Si la copia local está incompleta, copia los archivos faltantes de esta entrega sin borrar `node_modules` ni tus notas locales.

## Seguridad

El código incluye Firebase como integración sin configurar. Revisa cualquier aviso del antivirus antes de ejecutar; no es una certificación antivirus.
