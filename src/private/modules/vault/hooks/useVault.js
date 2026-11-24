import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import {
  createVault,
  openVault
} from "../services/vaultCrypto.js";

import {
  downloadVault
} from "../services/vaultStorage.js";

import {
  loadVaultSnapshot,
  writeCloudVault,
  cacheCloudVault
} from "../services/vaultSync.js";

const MESSAGES = {
  empty: "Supabase conectado.",
  migration: "Copia local pendiente de sincronización.",
  cloud: "Conectado a Supabase.",
  offline: "Supabase no disponible. Solo lectura local.",
  conflict: "Copias incompatibles. Solo lectura local."
};

export function useVault(owner) {
  const [record, setRecord] = useState(undefined);
  const [db, setDb] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [readOnly, setReadOnly] = useState(true);
  const [mode, setMode] = useState("loading");

  const [syncMessage, setSyncMessage] = useState(
    "Consultando almacenamiento..."
  );

  const session = useRef(null);
  const cacheRevision = useRef(null);
  const operation = useRef(false);
  const generation = useRef(0);
  const alive = useRef(false);

  function isCurrent(token) {
    return alive.current && generation.current === token;
  }

  const lock = useCallback(() => {
    generation.current++;
    session.current = null;

    setDb(null);
    setReadOnly(true);
  }, []);

  function applySnapshot(snapshot) {
    setRecord(snapshot.record);
    setMode(snapshot.mode);
    setSyncMessage(MESSAGES[snapshot.mode]);
    setReadOnly(true);
  }

  useEffect(() => {
    alive.current = true;

    const token = generation.current;

    loadVaultSnapshot(owner)
      .then(snapshot => {
        if (isCurrent(token)) {
          applySnapshot(snapshot);
        }
      })
      .catch(() => {
        if (isCurrent(token)) {
          setError("No se pudo consultar el almacenamiento.");
          setMode("offline");
          setRecord(null);
          setSyncMessage("Almacenamiento no disponible.");
        }
      });

    return () => {
      alive.current = false;
      generation.current++;
      session.current = null;
    };
  }, [owner]);

  useEffect(() => {
    window.addEventListener("boveda:lock", lock);
    window.addEventListener("pagehide", lock);

    return () => {
      window.removeEventListener("boveda:lock", lock);
      window.removeEventListener("pagehide", lock);
    };
  }, [lock]);

  useEffect(() => {
    if (!db) return;

    const limit = 15 * 60 * 1000;

    let deadline = Date.now() + limit;
    let timer;

    function check() {
      clearTimeout(timer);

      const remaining = deadline - Date.now();

      if (remaining <= 0) {
        lock();
        return;
      }

      timer = setTimeout(check, remaining);
    }

    function activity() {
      if (document.hidden) return;

      if (Date.now() >= deadline) {
        lock();
        return;
      }

      deadline = Date.now() + limit;

      check();
    }

    check();

    window.addEventListener("pointerdown", activity);
    window.addEventListener("keydown", activity);
    window.addEventListener("focus", check);

    document.addEventListener("visibilitychange", check);

    return () => {
      clearTimeout(timer);

      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("keydown", activity);
      window.removeEventListener("focus", check);

      document.removeEventListener("visibilitychange", check);
    };
  }, [db, lock]);

  async function run(action) {
    if (operation.current || !alive.current) {
      return false;
    }

    operation.current = true;

    setBusy(true);
    setError("");

    const token = generation.current;

    try {
      const result = await action(token);

      return result !== false && isCurrent(token);
    } catch (err) {
      if (isCurrent(token)) {
        setError(
          err.message || "No se pudo completar la operación."
        );
      }

      return false;
    } finally {
      operation.current = false;

      if (alive.current) {
        setBusy(false);
      }
    }
  }

  async function acceptCloud(
    remote,
    expectedLocalRevision,
    token
  ) {
    if (!isCurrent(token)) return false;

    let cached = false;

    try {
      await cacheCloudVault(
        owner,
        remote,
        expectedLocalRevision
      );

      cached = true;
    } catch {
      // El registro remoto ya fue confirmado.
      // No sobrescribir una cache modificada por otra pestaña.
    }

    if (!isCurrent(token)) return false;

    setRecord(remote);
    setMode("cloud");

    cacheRevision.current = cached
      ? remote.revision
      : expectedLocalRevision;

    setSyncMessage(
      cached
        ? "Sincronizada con Supabase."
        : "Guardada en Supabase. Caché local pendiente."
    );

    return true;
  }

  function refresh() {
    return run(async token => {
      if (session.current) return false;

      const snapshot = await loadVaultSnapshot(owner);

      if (!isCurrent(token)) return false;

      applySnapshot(snapshot);

      return true;
    });
  }

  function start(password, importedFile = null) {
    return run(async token => {
      const snapshot = await loadVaultSnapshot(owner);

      if (!isCurrent(token)) return false;

      applySnapshot(snapshot);

      let nextDb;
      let stored = snapshot.record;

      const writable =
        snapshot.mode !== "offline" &&
        snapshot.mode !== "conflict";

      cacheRevision.current =
        snapshot.local?.revision || null;

      if (stored) {
        if (importedFile) {
          throw new Error("Ya existe una bóveda.");
        }

        try {
          nextDb = await openVault(stored.bytes, password);
        } catch {
          throw new Error(
            "Contraseña maestra incorrecta o archivo incompatible."
          );
        }
      } else {
        if (!writable) {
          throw new Error(
            "No hay copia local. Conéctate a Supabase."
          );
        }

        if (importedFile) {
          if (importedFile.size > 5 * 1024 * 1024) {
            throw new Error("El archivo supera los 5 MB.");
          }

          const bytes = await importedFile.arrayBuffer();

          nextDb = await openVault(bytes, password);
        } else {
          nextDb = createVault(password);
        }
      }

      if (!isCurrent(token)) return false;

      if (
        snapshot.mode === "migration" ||
        snapshot.mode === "empty"
      ) {
        const bytes = stored
          ? stored.bytes
          : await nextDb.save();

        if (!isCurrent(token)) return false;

        stored = await writeCloudVault(
          owner,
          bytes,
          null
        );

        const accepted = await acceptCloud(
          stored,
          cacheRevision.current,
          token
        );

        if (!accepted) return false;
      }

      if (snapshot.mode === "cloud") {
        const accepted = await acceptCloud(
          stored,
          cacheRevision.current,
          token
        );

        if (!accepted) return false;
      }

      if (!isCurrent(token)) return false;

      session.current = {
        db: nextDb,
        revision: writable ? stored.revision : null,
        writable
      };

      setReadOnly(!writable);
      setDb(nextDb);

      return true;
    });
  }

  function mutate(action) {
    return run(async token => {
      const current = session.current;

      if (!current) {
        throw new Error("La bóveda está bloqueada.");
      }

      if (!current.writable) {
        throw new Error("Bóveda en modo de solo lectura.");
      }

      try {
        action(current.db);

        const bytes = await current.db.save();

        if (!isCurrent(token)) return false;

        const remote = await writeCloudVault(
          owner,
          bytes,
          current.revision
        );

        const accepted = await acceptCloud(
          remote,
          cacheRevision.current,
          token
        );

        if (!accepted) return false;

        current.revision = remote.revision;

        return true;
      } catch (err) {
        if (isCurrent(token)) {
          lock();

          setError(
            err.message ||
            "No se pudo confirmar el guardado."
          );

          setSyncMessage(
            "Desbloquea para consultar la última versión."
          );
        }

        return false;
      }
    });
  }

  function exportFile() {
    return run(async () => {
      if (!record?.bytes) {
        throw new Error("No hay una bóveda para exportar.");
      }

      downloadVault(record.bytes);

      return true;
    });
  }

  return {
    record,
    db,
    busy,
    error,
    mode,
    readOnly,
    syncMessage,
    refresh,
    lock,
    start,
    mutate,
    exportFile
  };
}
