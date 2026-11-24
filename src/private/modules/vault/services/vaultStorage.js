const DATABASE = "mi-workspace-vault";
const STORE = "encrypted-vaults";

function openStorage() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, {
        keyPath: "owner"
      });
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };

    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(
      new Error("Cierra las otras pestañas de la bóveda.")
    );
  });
}

export async function readVault(owner) {
  const db = await openStorage();

  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");

      const request = tx.objectStore(STORE).get(owner);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function writeVault(owner, bytes, expectedRevision, metadata = {}) {
  const db = await openStorage();

  const record = {
    owner,
    bytes,
    revision: metadata.revision ?? crypto.randomUUID(),
    cloudRevision: metadata.cloudRevision ?? null,
    updatedAt: Date.now()
  };

  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);

      let conflict = false;

      const request = store.get(owner);

      request.onsuccess = () => {
        const revision = request.result?.revision || null;

        if (revision !== expectedRevision) {
          conflict = true;
          tx.abort();
          return;
        }

        store.put(record);
      };

      tx.oncomplete = () => resolve(record);

      tx.onabort = () => reject(
        conflict
          ? new Error("La bóveda cambió en otra pestaña. Desbloquéala nuevamente.")
          : tx.error || new Error("No se pudo guardar la bóveda.")
      );

      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export function downloadVault(bytes) {
  const blob = new Blob([bytes], {
    type: "application/octet-stream"
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = "mi-boveda.kdbx";
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}