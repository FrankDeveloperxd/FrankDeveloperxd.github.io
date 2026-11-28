import { useState } from "react";

function readMode(key) {
  try {
    return localStorage.getItem(key) === "list"
      ? "list"
      : "cards";
  } catch {
    return "cards";
  }
}

export default function useViewMode(ownerId, scope) {
  const key = "workspace-view-mode:v1:" + ownerId + ":" + scope;

  const [stored, setStored] = useState(() => ({
    key,
    value: readMode(key)
  }));

  const value = stored.key === key
    ? stored.value
    : readMode(key);

  function setValue(next) {
    if (next !== "cards" && next !== "list") return;

    setStored({ key, value: next });

    try {
      localStorage.setItem(key, next);
    } catch {
      // La vista funciona sin almacenamiento local.
    }
  }

  return [value, setValue];
}
