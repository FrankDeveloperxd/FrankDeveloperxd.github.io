# Rediseño del portafolio

## Cambios principales
- Hero reconstruido para aprovechar mejor pantallas grandes.
- Visual interactivo propio con Canvas 2D; no necesita Three.js ni añade peso innecesario.
- Eliminados numeradores y textos que parecían propios de una plantilla genérica.
- Proyectos con navegación a casos individuales mediante rutas hash compatibles con GitHub Pages.
- Páginas de proyecto con contexto, participación, arquitectura y galería.
- Carpeta preparada para capturas reales en `public/media/projects/`.
- Sección de GitHub reducida a evidencia complementaria.
- Stack visual con iconos y mejor distribución del espacio.
- Sección de áreas de trabajo.
- Experiencia ampliada con Queych, Committed Organization, Grupo Moss y Fibertel Networking.
- Botón flotante de WhatsApp.
- CV disponible en `public/cv/Frank-Bernaola-CV.pdf`.
- SEO técnico: meta description, canonical, Open Graph, Twitter Card, JSON-LD, robots y sitemap.

## Decisión sobre Three.js
Se usó Canvas 2D para el fondo interactivo del hero. Produce una sensación técnica similar, responde al puntero y evita sumar Three.js a la carga inicial. Three.js puede añadirse después si existe una idea 3D concreta que aporte al portafolio, no solo como decoración.

## GitHub Pages
Los detalles de proyecto usan `#/project/<slug>` para que al abrir o refrescar una página no aparezca un 404 de GitHub Pages.
