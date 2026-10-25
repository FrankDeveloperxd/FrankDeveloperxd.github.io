export type ToolId = 'qr' | 'files' | 'images' | 'audio' | 'kanban' | 'notes' | 'spaces';
export type ToolDefinition = { id: ToolId; title: string; desc: string; icon: string; tone: string };
export const tools: ToolDefinition[] = [
 {id:'qr',title:'Generador QR',desc:'Enlaces, texto y conexiones Wi-Fi en un código personalizable.',icon:'qr',tone:'blue'},
 {id:'files',title:'Archivos temporales',desc:'Un enlace sencillo para compartir archivos entre dispositivos.',icon:'files',tone:'orange'},
 {id:'images',title:'Estudio de imágenes',desc:'Cambia dimensiones, formato y calidad de tus fotografías.',icon:'image',tone:'violet'},
 {id:'audio',title:'Audio y formatos',desc:'Escucha y revisa tus archivos de audio desde el navegador.',icon:'music',tone:'cyan'},
 {id:'kanban',title:'Tablero Kanban',desc:'Organiza proyectos y mueve tus tareas a medida que avanzas.',icon:'kanban',tone:'green'},
 {id:'notes',title:'Notas y bloques',desc:'Escribe, ordena y guarda ideas.',icon:'notes',tone:'pink'},
 {id:'spaces',title:'Mis espacios',desc:'Organizaciones, proyectos y módulos en un solo lugar.',icon:'space',tone:'dark'}
];
