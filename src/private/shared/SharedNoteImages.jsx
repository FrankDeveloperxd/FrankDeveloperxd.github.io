import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../client";

export default function SharedNoteImages({ html, token }) {
  const [links, setLinks] = useState({});
  const [error, setError] = useState("");

  const pathsKey = useMemo(() => {
    const document = new DOMParser().parseFromString(html, "text/html");
    return JSON.stringify([...new Set(
      [...document.querySelectorAll("img[data-storage-path]")]
        .map(image => image.getAttribute("data-storage-path"))
    )].sort());
  }, [html]);

  useEffect(() => {
    let active = true;

    async function refresh() {
      if (pathsKey === "[]") {
        if (active) {
          setLinks({});
          setError("");
        }
        return;
      }

      try {
        const { data, error: loadError } = await supabase.functions.invoke(
          "shared-note-images",
          { body: { token } }
        );

        if (loadError) throw loadError;
        if (data?.error) throw new Error(data.error);
        if (!active) return;

        setLinks(Object.fromEntries(
          (data.images || []).map(item => [item.path, item.url])
        ));
        setError("");
      } catch (err) {
        if (active) setError("No se pudieron cargar las imágenes compartidas.");
        console.error(err);
      }
    }

    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 300000);

    function onVisibility() {
      if (document.visibilityState === "visible") void refresh();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [token, pathsKey]);

  const rendered = useMemo(() => {
    // html ya viene saneado con DOMPurify desde SharedNotePage.
    const document = new DOMParser().parseFromString(html, "text/html");

    for (const image of document.querySelectorAll("img[data-storage-path]")) {
      const path = image.getAttribute("data-storage-path");
      const url = links[path];

      if (url) image.setAttribute("src", url);
      else image.removeAttribute("src");

      // SHARED IMAGE LAYOUT V2
      image.style.setProperty("display", "inline-block", "important");
      image.style.setProperty("float", "none", "important");
      image.style.setProperty("clear", "none", "important");
      image.style.setProperty("height", "auto", "important");

      const savedWidth = Number(image.getAttribute("width"));
      if (Number.isFinite(savedWidth) && savedWidth > 0) {
        image.style.setProperty("width", `${savedWidth}px`, "important");
      }

      image.style.maxWidth = "100%";
      image.style.height = "auto";
      image.style.verticalAlign = "top";
      image.style.borderRadius = "5px";
      image.style.margin = "6px 8px 6px 0";
      image.setAttribute("loading", "lazy");
      image.setAttribute("decoding", "async");
    }

    return document.body.innerHTML;
  }, [html, links]);

  return (
    <>
      {error && <p role="alert" style={{ color: "#b54258", fontSize: 12 }}>{error}</p>}
      <div className="ns-public-content"
        dangerouslySetInnerHTML={{ __html: rendered }} />
    </>
  );
}