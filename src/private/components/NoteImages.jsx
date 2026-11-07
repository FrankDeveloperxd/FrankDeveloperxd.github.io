/* NOTE INLINE IMAGES V4 */
/* NOTE NATIVE IMAGE V3 */
import Image from "@tiptap/extension-image";
import { supabase } from "../client";

const BUCKET = "note-images";
const imageUrls = new Map();

async function privateImageUrl(path) {
  const cached = imageUrls.get(path);
  if (cached && cached.expires > Date.now()) return cached.promise;

  const promise = supabase.storage.from(BUCKET)
    .createSignedUrl(path, 7200)
    .then(({ data, error }) => {
      if (error) throw error;
      return data.signedUrl;
    });

  imageUrls.set(path, {
    promise,
    expires: Date.now() + 3600000
  });

  try {
    return await promise;
  } catch (error) {
    imageUrls.delete(path);
    throw error;
  }
}

export const NotePrivateImage = Image.extend({
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      storagePath: {
        default: null,
        parseHTML: element => element.getAttribute("data-storage-path"),
        renderHTML: attrs => ({
          "data-storage-path": attrs.storagePath
        })
      },
      // Conservar las dimensiones de imágenes insertadas anteriormente.
      widthPercent: {
        default: 100,
        parseHTML: element => Number(
          element.getAttribute("data-width-percent")
        ) || 100,
        renderHTML: attrs => ({
          "data-width-percent": attrs.widthPercent
        })
      },
      layout: {
        default: "center",
        parseHTML: element =>
          element.getAttribute("data-image-layout") || "center",
        renderHTML: attrs => ({
          "data-image-layout": attrs.layout
        })
      }
    };
  },

  parseHTML() {
    return [{ tag: "img[data-storage-path]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, ...attributes } = HTMLAttributes;
    return ["img", attributes];
  },

  addNodeView() {
    const createNativeView = this.parent?.();

    if (!createNativeView) {
      throw new Error("No está disponible el redimensionamiento nativo.");
    }

    return props => {
      const view = createNativeView(props);
      const element = view.dom.querySelector("img");
      let currentNode = props.node;
      let currentUrl = "";
      let active = true;
      let request = 0;

      view.dom.classList.add("note-native-image");

      function applySource() {
        if (element && currentUrl &&
            element.getAttribute("src") !== currentUrl) {
          element.src = currentUrl;
        }
      }

      async function resolveSource() {
        const revision = ++request;
        const path = currentNode.attrs.storagePath;
        if (!path) return;

        try {
          const url = await privateImageUrl(path);
          if (!active || revision !== request) return;
          currentUrl = url;
          applySource();
          view.dom.removeAttribute("data-image-error");
        } catch (error) {
          if (active && revision === request) {
            view.dom.setAttribute("data-image-error", "true");
            console.error("Imagen privada:", error);
          }
        }
      }

      function updateLayout() {
        // El tamaño definitivo lo gestiona Tiptap al arrastrar las esquinas.
        if (element) {
          element.alt = currentNode.attrs.alt || "Imagen de la nota";
          element.style.maxWidth = "100%";
          element.style.objectFit = "contain";
        }
      }

      const originalUpdate = view.update?.bind(view);
      view.update = (...args) => {
        const nextNode = args[0];
        if (nextNode.type !== currentNode.type) return false;

        const previousPath = currentNode.attrs.storagePath;
        const result = originalUpdate ? originalUpdate(...args) : true;
        if (!result) return false;

        currentNode = nextNode;
        updateLayout();

        if (previousPath !== currentNode.attrs.storagePath) {
          currentUrl = "";
          void resolveSource();
        } else {
          // El renderizador nativo puede limpiar src al actualizar atributos.
          applySource();
        }

        return true;
      };

      const originalDestroy = view.destroy?.bind(view);
      view.destroy = () => {
        active = false;
        window.clearInterval(timer);
        originalDestroy?.();
      };

      updateLayout();
      void resolveSource();
      const timer = window.setInterval(() => {
        if (document.visibilityState === "visible") void resolveSource();
      }, 3600000);

      return view;
    };
  }
}).configure({
  inline: true,
  allowBase64: false,
  resize: {
    enabled: true,
    directions: [
      "top-left", "top-right",
      "bottom-left", "bottom-right"
    ],
    minWidth: 60,
    minHeight: 40,
    alwaysPreserveAspectRatio: true
  }
});

async function compress(file) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Usa imágenes PNG, JPG o WebP.");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("La imagen original debe pesar menos de 12 MB.");
  }

  const source = URL.createObjectURL(file);
  try {
    const image = new window.Image();
    image.src = source;
    await image.decode();

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo procesar la imagen.");

    for (const maxSize of [1600, 1280, 1024, 800, 640]) {
      const ratio = Math.min(
        1, maxSize / Math.max(image.naturalWidth, image.naturalHeight)
      );
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.86, 0.76, 0.66]) {
        const blob = await new Promise(resolve =>
          canvas.toBlob(resolve, "image/webp", quality)
        );
        if (!blob || blob.type !== "image/webp") {
          throw new Error("Tu navegador no permite convertir a WebP.");
        }
        if (blob.size <= 100 * 1024 ||
            (quality === 0.66 && blob.size <= 150 * 1024)) {
          return blob;
        }
      }
    }

    throw new Error("No se pudo reducir esta imagen al límite de 150 KB.");
  } finally {
    URL.revokeObjectURL(source);
  }
}

export async function uploadNoteImage(noteId, file) {
  const blob = await compress(file);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Vuelve a iniciar sesión.");

  const path = `${data.user.id}/${noteId}/${crypto.randomUUID()}.webp`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET).upload(path, blob, {
      contentType: "image/webp",
      cacheControl: "3600",
      upsert: false
    });

  if (uploadError) throw uploadError;
  return { path, bytes: blob.size };
}

export async function discardNoteImage(path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.error("No se pudo retirar una carga cancelada:", error);
}