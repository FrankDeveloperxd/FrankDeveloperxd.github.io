export function navigate(path) {
  if (!path || typeof path !== "string") {
    return;
  }

  window.history.pushState({}, "", path);

  window.dispatchEvent(
    new PopStateEvent("popstate")
  );

  window.scrollTo({
    top: 0,
    behavior: "instant",
  });
}