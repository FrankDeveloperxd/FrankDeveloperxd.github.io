function normalizeCards() {
  if (!window.location.pathname.startsWith("/mi-espacio")) return;

  const cards = document.querySelectorAll(".private-card");

  cards.forEach((card) => {
    const actions = card.querySelector(".private-card-actions");
    if (!actions) return;

    const interactives = Array.from(actions.querySelectorAll("a,button"));
    if (!interactives.length) return;

    const openAction = interactives.find((el) => {
      const text = (el.textContent || "").trim().toLowerCase();
      const aria = (el.getAttribute("aria-label") || "").toLowerCase();
      const title = (el.getAttribute("title") || "").toLowerCase();

      const isDelete =
        /eliminar|borrar|delete/.test(text) ||
        /eliminar|borrar|delete/.test(aria) ||
        /eliminar|borrar|delete/.test(title) ||
        el.classList.contains("private-card-danger") ||
        el.classList.contains("danger");

      return !isDelete;
    });

    if (!openAction) return;

    card.classList.add("private-card-clickable");
    if (!card.hasAttribute("tabindex")) card.setAttribute("tabindex", "0");
    if (!card.hasAttribute("role")) card.setAttribute("role", "button");
  });
}

function getOpenAction(card) {
  const actions = card.querySelector(".private-card-actions");
  if (!actions) return null;

  const interactives = Array.from(actions.querySelectorAll("a,button"));
  return interactives.find((el) => {
    const text = (el.textContent || "").trim().toLowerCase();
    const aria = (el.getAttribute("aria-label") || "").toLowerCase();
    const title = (el.getAttribute("title") || "").toLowerCase();

    const isDelete =
      /eliminar|borrar|delete/.test(text) ||
      /eliminar|borrar|delete/.test(aria) ||
      /eliminar|borrar|delete/.test(title) ||
      el.classList.contains("private-card-danger") ||
      el.classList.contains("danger");

    return !isDelete;
  }) || null;
}

function isIgnoredTarget(target) {
  return !!target.closest("a, button, input, textarea, select, label");
}

document.addEventListener("click", (event) => {
  if (!window.location.pathname.startsWith("/mi-espacio")) return;

  const card = event.target.closest(".private-card");
  if (!card) return;
  if (isIgnoredTarget(event.target)) return;

  const openAction = getOpenAction(card);
  if (!openAction) return;

  openAction.click();
});

document.addEventListener("keydown", (event) => {
  if (!window.location.pathname.startsWith("/mi-espacio")) return;

  const card = document.activeElement?.closest?.(".private-card");
  if (!card) return;
  if (event.key !== "Enter" && event.key !== " ") return;

  event.preventDefault();
  const openAction = getOpenAction(card);
  if (!openAction) return;

  openAction.click();
});

const observer = new MutationObserver(() => normalizeCards());

function bootPrivateEnhancements() {
  normalizeCards();
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootPrivateEnhancements, { once: true });
} else {
  bootPrivateEnhancements();
}
