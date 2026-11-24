import { supabase } from "../../../shared/services/client.js";
import { readVault, writeVault } from "./vaultStorage.js";

const TABLE = "vault_encrypted";
const MAX_BYTES = 5 * 1024 * 1024;

const HEX = Array.from(
  { length: 256 },
  (_, i) => i.toString(16).padStart(2, "0")
);

function validate(bytes) {
  if (
    !(bytes instanceof ArrayBuffer) ||
    bytes.byteLength < 12 ||
    bytes.byteLength > MAX_BYTES
  ) {
    throw new Error("Archivo KDBX inválido.");
  }
}

function encodeBytea(bytes) {
  validate(bytes);

  const data = new Uint8Array(bytes);
  const chunks = [];

  for (let start = 0; start < data.length; start += 8192) {
    let chunk = "";

    for (
      let i = start;
      i < Math.min(start + 8192, data.length);
      i++
    ) {
      chunk += HEX[data[i]];
    }

    chunks.push(chunk);
  }

  return "\\x" + chunks.join("");
}

function decodeBytea(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith("\\x")
  ) {
    throw new Error("Formato remoto inválido.");
  }

  const hex = value.slice(2);

  if (
    hex.length % 2 !== 0 ||
    hex.length > MAX_BYTES * 2 ||
    !/^[0-9a-f]+$/i.test(hex)
  ) {
    throw new Error("Contenido remoto inválido.");
  }

  const bytes = new Uint8Array(hex.length / 2);

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  validate(bytes.buffer);

  return bytes.buffer;
}

function equalBytes(a, b) {
  if (!a || !b || a.byteLength !== b.byteLength) {
    return false;
  }

  const first = new Uint8Array(a);
  const second = new Uint8Array(b);

  return first.every((value, i) => value === second[i]);
}

async function execute(request) {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    15000
  );

  try {
    return await request.abortSignal(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export async function readCloudVault(owner) {
  if (!supabase) {
    throw new Error("Supabase no disponible.");
  }

  const { data, error } = await execute(
    supabase
      .from(TABLE)
      .select("owner_id, encrypted_data, revision, updated_at")
      .eq("owner_id", owner)
      .maybeSingle()
  );

  if (error) {
    throw new Error("No se pudo consultar Supabase.");
  }

  if (!data) return null;

  return {
    owner: data.owner_id,
    bytes: decodeBytea(data.encrypted_data),
    revision: data.revision,
    cloudRevision: data.revision,
    updatedAt: Date.parse(data.updated_at)
  };
}

export async function writeCloudVault(
  owner,
  bytes,
  expectedRevision
) {
  if (!supabase) {
    throw new Error("Supabase no disponible.");
  }

  const revision = crypto.randomUUID();

  const payload = {
    encrypted_data: encodeBytea(bytes),
    revision
  };

  let request;

  if (expectedRevision === null) {
    request = supabase
      .from(TABLE)
      .insert({
        owner_id: owner,
        ...payload
      })
      .select("revision, updated_at");
  } else {
    request = supabase
      .from(TABLE)
      .update(payload)
      .eq("owner_id", owner)
      .eq("revision", expectedRevision)
      .select("revision, updated_at");
  }

  const { data, error } = await execute(request);

  if (error?.code === "23505") {
    throw new Error("Ya existe una bóveda remota.");
  }

  if (error) {
    throw new Error(
      "Guardado no confirmado. Vuelve a desbloquear la bóveda."
    );
  }

  if (data?.length !== 1) {
    throw new Error(
      "Conflicto de versiones. Desbloquea nuevamente."
    );
  }

  return {
    owner,
    bytes,
    revision: data[0].revision,
    cloudRevision: data[0].revision,
    updatedAt: Date.parse(data[0].updated_at)
  };
}

export async function loadVaultSnapshot(owner) {
  const local = await readVault(owner);

  let remote;

  try {
    remote = await readCloudVault(owner);
  } catch {
    return {
      mode: "offline",
      local,
      record: local
    };
  }

  if (!remote && !local) {
    return {
      mode: "empty",
      local: null,
      record: null
    };
  }

  if (!remote && local) {
    return {
      mode: local.cloudRevision ? "conflict" : "migration",
      local,
      record: local
    };
  }

  if (
    remote &&
    local &&
    !local.cloudRevision &&
    !equalBytes(local.bytes, remote.bytes)
  ) {
    return {
      mode: "conflict",
      local,
      record: local
    };
  }

  return {
    mode: "cloud",
    local,
    record: remote
  };
}

export async function cacheCloudVault(
  owner,
  remote,
  expectedLocalRevision
) {
  return writeVault(
    owner,
    remote.bytes,
    expectedLocalRevision,
    {
      revision: remote.revision,
      cloudRevision: remote.revision
    }
  );
}
