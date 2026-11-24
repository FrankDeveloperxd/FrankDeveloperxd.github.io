import {
  Kdbx,
  Credentials,
  ProtectedValue,
  Consts
} from "kdbxweb";

function credentials(password) {
  return new Credentials(
    ProtectedValue.fromString(password)
  );
}

export function createVault(password) {
  if (password.length < 16) {
    throw new Error("Utiliza una frase maestra de al menos 16 caracteres.");
  }

  const db = Kdbx.create(
    credentials(password),
    "Mi Workspace"
  );

  db.setKdf(Consts.KdfId.Aes);
  db.meta.recycleBinEnabled = false;

  return db;
}

export async function openVault(bytes, password) {
  return Kdbx.load(bytes, credentials(password));
}

export function readField(entry, field) {
  const value = entry.fields.get(field);

  if (typeof value === "string") return value;

  return value?.getText?.() || "";
}

export function listCredentials(db) {
  return db.getDefaultGroup().entries;
}

export function saveCredential(db, data, id) {
  let entry;

  if (id) {
    entry = listCredentials(db).find(
      item => item.uuid.toString() === id
    );

    if (!entry) {
      throw new Error("La credencial ya no existe.");
    }
  } else {
    entry = db.createEntry(db.getDefaultGroup());
  }

  entry.fields.set("Title", data.title.trim());
  entry.fields.set("UserName", data.username);
  entry.fields.set("Password", ProtectedValue.fromString(data.password));
  entry.fields.set("URL", data.url);
  entry.fields.set("Notes", ProtectedValue.fromString(data.notes));
  entry.fields.set("Category", data.category);
  entry.fields.set("VaultIcon", data.icon || "key");
  entry.fields.set("VaultColor", data.color || "#2563eb");
  entry.fields.set("VaultFavorite", data.favorite ? "1" : "0");

  entry.times.update();
}

export function removeCredential(db, id) {
  const entry = listCredentials(db).find(
    item => item.uuid.toString() === id
  );

  if (!entry) {
    throw new Error("La credencial ya no existe.");
  }

  db.meta.recycleBinEnabled = false;
  db.remove(entry);
}