# Carpeta de proyectos

Aquí van las imágenes reales de cada proyecto.

## Estructura recomendada

/public/media/projects/nombre-del-proyecto/
- cover.png o cover.webp
- screen-01.png
- screen-02.png
- screen-03.png

También dejé una carpeta `_template/` para que sirva de guía.

## Cómo agregar un proyecto nuevo

1. Crea la carpeta del proyecto dentro de `public/media/projects/`.
2. Copia tus capturas reales.
3. Agrega una nueva entrada en `src/data/projects.js`.
4. Si quieres que aparezca arriba en grande, usa `featured: true`.
5. Si quieres controlar capturas verticales u horizontales, usa:
   - `orientation: "wide"`
   - `orientation: "landscape"`
   - `orientation: "portrait"`
