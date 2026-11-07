import { useEffect } from "react";
import { supabase } from "./client";

export function scheduleNoteImageCleanup() {
  window.dispatchEvent(new Event("workspace-note-images-cleanup"));
}

export function useNoteImageCleanup(userId) {
  useEffect(() => {
    if (!userId) return undefined;

    let active = true;
    let running = false;
    let timer;

    async function clean() {
      if (!active || running || document.visibilityState !== "visible") return;
      running = true;

      try {
        const { data, error } = await supabase.functions.invoke(
          "cleanup-note-images",
          { body: {} }
        );
        console.log("RESULTADO LIMPIEZA:", { data, error });
      } catch (error) {
        console.error("Limpieza de imágenes pendiente:", error);
      } finally {
        running = false;
      }
    }

    window.probarLimpiezaImagenes = clean;

    function schedule() {
      clearTimeout(timer);
      timer = window.setTimeout(() => void clean(), 12000);
    }

    function onVisibility() {
      if (document.visibilityState === "visible") schedule();
    }

    schedule();
    const interval = window.setInterval(() => void clean(), 60000);

    window.addEventListener("workspace-note-images-cleanup", schedule);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener("workspace-note-images-cleanup", schedule);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [userId]);
}