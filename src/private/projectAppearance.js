import { supabase } from "./client";

const BUCKET = "project-covers";
const signedCoverCache = new Map();

async function getCoverUrl(ownerId, imagePath) {
  const key = `${ownerId}:${imagePath}`;
  const cached = signedCoverCache.get(key);

  if (cached && cached.expiresAt > Date.now()) return cached.promise;

  const promise = supabase.storage
    .from(BUCKET)
    .createSignedUrl(imagePath, 604800)
    .then(({ data, error }) => {
      if (error) throw error;
      return data.signedUrl;
    });

  signedCoverCache.set(key, {
    expiresAt: Date.now() + 6 * 60 * 60 * 1000,
    promise
  });

  try {
    return await promise;
  } catch (error) {
    signedCoverCache.delete(key);
    throw error;
  }
}

export async function loadProjectAppearances(ownerId) {
  const { data, error } = await supabase
    .from("workspace_projects")
    .select("id,appearance")
    .eq("owner_id", ownerId);

  if (error) throw error;

  const entries = await Promise.all((data || []).map(async project => {
    const value = project.appearance;
    if (!value) return [project.id, null];

    let imageUrl = null;
    if (value.imagePath) {
      try {
        imageUrl = await getCoverUrl(ownerId, value.imagePath);
      } catch (error) {
        console.error("No se pudo cargar una portada:", error);
      }
    }

    return [project.id, {
      color: value.color || null,
      folderColor: value.folderColor || null,
      imagePath: value.imagePath || null,
      storedImage: imageUrl,
      image: value.backgroundEnabled ? imageUrl : null
    }];
  }));

  return Object.fromEntries(entries.filter(([, value]) => value !== null));
}

export async function saveProjectAppearance(ownerId, projectId, cover) {
  // Leer la versión guardada para retirar su archivo después del cambio.
  const { data: previous, error: readError } = await supabase
    .from("workspace_projects")
    .select("appearance")
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .single();

  if (readError) throw readError;

  const source = cover.storedImage || cover.image || null;
  let imagePath = source ? cover.imagePath || null : null;
  let uploadedPath = null;

  if (source?.startsWith("data:")) {
    if (!source.startsWith("data:image/webp;base64,")) {
      throw new Error("Selecciona nuevamente la imagen para convertirla a WebP.");
    }

    const response = await fetch(source);
    const blob = await response.blob();

    if (blob.size > 30720) {
      throw new Error("La imagen supera el límite de 30 KB.");
    }

    uploadedPath = `${ownerId}/${projectId}/${crypto.randomUUID()}.webp`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(uploadedPath, blob, {
        contentType: "image/webp",
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) throw uploadError;
    imagePath = uploadedPath;
  } else if (source && !imagePath) {
    throw new Error("Selecciona nuevamente esta imagen para guardarla en la nube.");
  }

  const appearance = {
    color: cover.color || null,
    folderColor: cover.folderColor || null,
    imagePath,
    backgroundEnabled: Boolean(cover.color || cover.image)
  };

  const { error: saveError } = await supabase
    .from("workspace_projects")
    .update({ appearance })
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .select("id")
    .single();

  if (saveError) {
    if (uploadedPath) {
      await supabase.storage.from(BUCKET).remove([uploadedPath]);
    }
    throw saveError;
  }

  const oldPath = previous.appearance?.imagePath;
  if (oldPath && oldPath !== imagePath) {
    const { error: cleanupError } = await supabase.storage
      .from(BUCKET).remove([oldPath]);
    if (cleanupError) console.error("No se pudo retirar la portada anterior:", cleanupError);
  }

  return appearance;
}