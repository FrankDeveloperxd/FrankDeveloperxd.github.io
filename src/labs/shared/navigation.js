export function navigate(toolId = null) {
  const path = toolId
    ? `/labs/${encodeURIComponent(toolId)}`
    : "/labs";

  if (window.location.pathname !== path) {
    window.history.pushState({}, "", path);
  }

  // Notifica a React que cambió la ruta
  window.dispatchEvent(
    new PopStateEvent("popstate")
  );

  // Regresa suavemente al inicio
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}