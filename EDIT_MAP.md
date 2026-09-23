# Mapa rápido para editar el portafolio

La idea de esta versión es que no tengas que tocar todo el proyecto para hacer cambios normales.

## 1. Textos principales

Editar:

`src/data/site.js`

Ahí están centralizados:
- nombre
- rol
- ubicación
- título y texto del inicio
- títulos de Proyectos, Perfil, Tecnologías, Experiencia, GitHub y Contacto
- imagen principal del Hero

## 2. Proyectos

Editar:

`src/data/projects.js`

Cada proyecto es un objeto independiente.

Campos principales:
- `title`
- `description`
- `image`
- `tags`
- `status`
- `year`
- `role`
- `contribution`
- `gallery`

Para poner un proyecto arriba, usa:

`featured: true`

Para dejarlo en "Más proyectos":

`featured: false`

## 3. Imágenes

Carpeta:

`public/media/projects/`

Ejemplo:

`public/media/projects/modcontrol/`

- `cover.svg` o `cover.webp`
- `screen-01.webp`
- `screen-02.webp`
- `screen-03.webp`

En `projects.js` puedes marcar las capturas como:
- `wide`
- `landscape`
- `portrait`

El layout se adapta automáticamente.

## 4. Experiencia

Editar:

`src/sections/Experience.jsx`

Solo modifica el arreglo `items`.

## 5. Tecnologías

Editar:

`src/sections/Stack.jsx`

Solo modifica el arreglo `tools`.

## 6. Perfil / Qué puedo desarrollar

Editar:

`src/sections/Capabilities.jsx`

Solo modifica el arreglo `capabilities`.

## 7. Contacto

Los textos están en:

`src/data/site.js`

Los enlaces están en:

`src/sections/Contact.jsx`

WhatsApp:

`src/components/WhatsAppButton.jsx`

## 8. Menú

`src/components/Navbar.jsx`

La navegación usa scroll directo, sin animación pesada. Esto evita el efecto de "doble clic" o retraso al cambiar de sección.

## 9. Rendimiento

Esta versión eliminó:
- animación del mapa/nodos
- `backdrop-filter`
- Google Fonts remotas
- `framer-motion`
- `React.StrictMode` en desarrollo
- scroll animado
- transiciones de escala en imágenes

GitHub solo consulta la API cuando la sección está cerca de aparecer en pantalla.
