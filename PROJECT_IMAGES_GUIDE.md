# Imágenes de proyectos

Cada proyecto tiene su carpeta en `public/media/projects/`.

Para reemplazar las imágenes temporales, usa preferentemente:

- `cover.webp` — portada principal del proyecto
- `screen-01.webp`
- `screen-02.webp`
- `screen-03.webp`

En `src/data/projects.js` puedes indicar la orientación de cada captura:

- `wide` para imágenes horizontales grandes
- `landscape` para horizontales normales
- `portrait` para capturas verticales de móvil

Ejemplo:

```js
gallery: [
  { src: "/media/projects/mi-proyecto/screen-01.webp", orientation: "wide" },
  { src: "/media/projects/mi-proyecto/screen-02.webp", orientation: "portrait" },
]
```

El layout es responsive y adapta estas orientaciones en tablet y móvil.
