# Contenido pendiente por reemplazar

## Capturas reales
Reemplazar los SVG temporales en `public/media/projects/` por capturas reales de cada proyecto.
Las rutas se controlan desde `src/data/projects.js`.

## Links de repositorios
No se muestran botones de repositorio dentro de cada proyecto hasta tener la URL exacta de cada repo. Esto evita mandar todos los proyectos al perfil general de GitHub.

## Datos que conviene añadir después
- Enlaces reales de demo o APK cuando existan.
- Métricas verificables de proyectos (usuarios, tiempos, resultados, premios).
- Capturas de arquitectura, dashboards o dispositivos reales.
- Certificados relevantes si aportan a una postulación concreta.
- Foto profesional solo si deseas usarla; el diseño no depende de una foto personal.

## SEO
La portada ya tiene un único H1, description, canonical, Open Graph, JSON-LD, robots.txt y sitemap.xml.
Los casos de proyecto usan rutas con hash (`#/project/...`) para evitar errores 404 en GitHub Pages. Si en el futuro quieres posicionar cada proyecto por separado en Google, conviene migrarlos a páginas estáticas/pre-renderizadas con URLs reales.
