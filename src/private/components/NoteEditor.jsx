import { scheduleNoteImageCleanup } from "../noteImageCleanup.js";
/* NOTE IMAGES V1 */
import { ImagePlus } from "lucide-react";
import { NotePrivateImage, uploadNoteImage, discardNoteImage } from "./NoteImages.jsx";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  ListTodo,
  Table2,
  Quote,
  Code2,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  Download,
  FileText
} from "lucide-react";import React, { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { supabase } from "../client";
import "./NoteEditor.css";
import "./NoteRichEditor.css";

const extensions = [
  NotePrivateImage,
  StarterKit,
  TaskList,
  TaskItem.configure({ nested: true }),
  TableKit.configure({
    table: { resizable: true }
  }),
  Link.configure({
    openOnClick: false,
    autolink: true,
    linkOnPaste: true,
    defaultProtocol: "https",
    HTMLAttributes: {
      target: "_blank",
      rel: "noopener noreferrer"
    }
  }),
  Underline,
  TextAlign.configure({
    types: ["heading", "paragraph"]
  }),
  Highlight
];

function normalizeContent(value) {
  if (!value) return "<p></p>";

  // Los documentos antiguos se conservan como texto.
  // Solo tratamos como HTML los documentos creados
  // con el editor visual.
  if (/^\s*<(p|h[1-6]|ul|ol|blockquote|pre|div|table|img)\b/i.test(value)) {
    return value;
  }

  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  return escaped.split(/\r?\n/).map(line =>
    `<p>${line || "<br>"}</p>`
  ).join("");
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(title) {
  return (title || "nota")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .slice(0, 80);
}

export default function NoteEditor({ noteId, onBack }) {
  const imageInputRef = useRef(null);
  const imageEditorRef = useRef(null);
  const currentNoteRef = useRef(noteId);
  const imageUploadingRef = useRef(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  currentNoteRef.current = noteId;

  async function insertImages(files) {
    if (imageUploadingRef.current) return;
    const instance = imageEditorRef.current;
    if (!instance || instance.isDestroyed) return;

    const targetNote = currentNoteRef.current;
    imageUploadingRef.current = true;
    setUploadingImage(true);
    setError("");

    try {
      for (const file of files) {
        if (currentNoteRef.current !== targetNote || instance.isDestroyed) break;
        const uploaded = await uploadNoteImage(targetNote, file);

        if (currentNoteRef.current !== targetNote || instance.isDestroyed) {
          await discardNoteImage(uploaded.path);
          break;
        }

        // Insertar después de una imagen seleccionada, sin sustituirla.
        const selection = instance.state.selection;
        const position = selection.node?.type.name === "image"
          ? selection.from + selection.node.nodeSize
          : selection.to;

        const inserted = instance.chain().focus().insertContentAt(position, {
          type: "image",
          attrs: {
            storagePath: uploaded.path,
            alt: file.name || "Imagen",
            width: 300,
            height: null,
            widthPercent: 100,
            layout: "center"
          }
        }).run();

        if (!inserted) {
          await discardNoteImage(uploaded.path);
          throw new Error("No se pudo insertar la imagen en este punto.");
        }
      }
    } catch (err) {
      setError(err.message || "No se pudo insertar la imagen.");
    } finally {
      imageUploadingRef.current = false;
      setUploadingImage(false);
    }
  }
  const [title, setTitle] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const ready = useRef(false);
  const dirty = useRef(false);
  const busy = useRef(false);
  const draft = useRef({ title: "", content: "" });
  const liveChannel = useRef(null);
  const sharedLiveChannel = useRef(null);
  // LIVE NOTE SHARE V2
  const liveTimer = useRef(null);
  const lastSent = useRef(0);
  const editVersion = useRef(0);
  const savedVersion = useRef(0);
  const lastLocalEdit = useRef(0);
  const clientId = useRef(crypto.randomUUID());

  const [revision, setRevision] = useState(0);

  const editor = useEditor({
    extensions,
    content: "<p></p>",
    immediatelyRender: false,
    editorProps: {
      handlePaste(view, event) {
        const files = Array.from(event.clipboardData?.files || [])
          .filter(file => file.type.startsWith("image/"));
        if (!files.length) return false;
        event.preventDefault();
        void insertImages(files);
        return true;
      },
      handleDrop(view, event, slice, moved) {
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files || [])
          .filter(file => file.type.startsWith("image/"));
        if (!files.length) return false;
        event.preventDefault();
        const position = view.posAtCoords({
          left: event.clientX, top: event.clientY
        });
        if (position) view.dispatch(
          view.state.tr.setSelection(
            view.state.selection.constructor.near(
              view.state.doc.resolve(position.pos)
            )
          )
        );
        void insertImages(files);
        return true;
      },
      attributes: {
        class: "note-rich-content",
        "aria-label": "Contenido del documento",
        spellcheck: "true"
      }
    },
    onUpdate({ editor: currentEditor }) {
      if (!ready.current) return;

      draft.current.content = currentEditor.getHTML();
      markChanged();
    }
  });

  imageEditorRef.current = editor;

  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      bold: currentEditor?.isActive("bold") || false,
      italic: currentEditor?.isActive("italic") || false,
      underline: currentEditor?.isActive("underline") || false,
      bullet: currentEditor?.isActive("bulletList") || false,
      ordered: currentEditor?.isActive("orderedList") || false,
      table: currentEditor?.isActive("table") || false
    })
  });

  function broadcastDraft() {
    const channel = liveChannel.current;
    if (!channel) return;

    lastSent.current = Date.now();

    void channel.send({
      type: "broadcast",
      event: "live-draft",
      payload: {
        clientId: clientId.current,
        ...draft.current
      }
    });
  }

  function broadcastSharedDraft() {
    const channel = sharedLiveChannel.current;
    if (!channel) return;

    void channel.send({
      type: "broadcast",
      event: "live-draft",
      payload: {
        title: draft.current.title,
        content: draft.current.content
      }
    });
  }

  function markChanged() {
    dirty.current = true;
    editVersion.current += 1;
    lastLocalEdit.current = Date.now();
    setRevision(value => value + 1);

    if (!liveChannel.current) return;

    if (Date.now() - lastSent.current >= 120) {
      broadcastDraft();
        broadcastSharedDraft();
    } else if (!liveTimer.current) {
      liveTimer.current = window.setTimeout(() => {
        liveTimer.current = null;
        broadcastDraft();
        broadcastSharedDraft();
      }, 120);
    }
  }

  function applyDocument(row) {
    const content = normalizeContent(row.content || "");

    ready.current = false;
    draft.current = { title: row.title, content };

    setTitle(row.title);
    editor?.commands.setContent(content, { emitUpdate: false });

    dirty.current = false;
    savedVersion.current = editVersion.current;
    ready.current = true;
    setLoaded(true);
  }

  // Cargar contenido y escuchar cambios guardados.
  useEffect(() => {
    if (!editor) return;

    let active = true;
    ready.current = false;
    setLoaded(false);
    setError("");

    async function load() {
      const { data, error: loadError } = await supabase
        .from("workspace_notes")
        .select("*")
        .eq("id", noteId)
        .single();

      if (!active) return;

      if (loadError || !data) {
        setError(loadError?.message || "No se encontró la nota.");
        return;
      }

      applyDocument(data);
    }

    void load();

    const channel = supabase
      .channel(`note-saved-${noteId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "workspace_notes",
        filter: `id=eq.${noteId}`
      }, ({ new: row }) => {
        if (!active || !ready.current) return;

        // No reemplazar la edición local activa.
        if (dirty.current || busy.current || imageUploadingRef.current) return;

        if (
          draft.current.title === row.title &&
          draft.current.content === normalizeContent(row.content || "")
        ) return;

        applyDocument(row);
      })
      .subscribe();

    return () => {
      active = false;
      ready.current = false;
      void supabase.removeChannel(channel);
    };
  }, [noteId, editor]);

  // Canal privado para ver cambios mientras se escribe.
  useEffect(() => {
    if (!editor) return;

    let active = true;
    let channel = null;

    async function connect() {
      const { data } = await supabase.auth.getSession();
      if (!active || !data.session) return;

      await supabase.realtime.setAuth(data.session.access_token);
      if (!active) return;

      channel = supabase.channel(`workspace-live-note:${noteId}`, {
        config: {
          private: true,
          broadcast: { self: false }
        }
      });

      channel.on("broadcast", { event: "live-draft" }, ({ payload }) => {
        if (!active || !ready.current || !payload) return;
        if (payload.clientId === clientId.current) return;
        if (typeof payload.content !== "string") return;

        // Durante una edición local conservamos el cursor
        // y el contenido local.
        if (dirty.current || busy.current || imageUploadingRef.current) return;

        const nextTitle = String(payload.title || "");
        const nextContent = normalizeContent(payload.content);

        draft.current = {
          title: nextTitle,
          content: nextContent
        };

        setTitle(nextTitle);
        editor.commands.setContent(nextContent, {
          emitUpdate: false
        });
      });

      channel.subscribe(status => {
        if (!active) return;
        liveChannel.current =
          status === "SUBSCRIBED" ? channel : null;
      });
    }

    void connect();

    return () => {
      active = false;
      liveChannel.current = null;

      if (liveTimer.current) {
        clearTimeout(liveTimer.current);
        liveTimer.current = null;
      }

      if (channel) void supabase.removeChannel(channel);
    };
  }, [noteId, editor]);


  // Enviar al enlace compartido los borradores del editor.
  useEffect(() => {
    if (!noteId || !editor) return;

    let active = true;
    let currentChannel = null;
    let generation = 0;

    async function connect() {
      const currentGeneration = ++generation;
      sharedLiveChannel.current = null;

      if (currentChannel) {
        const old = currentChannel;
        currentChannel = null;
        void supabase.removeChannel(old);
      }

      const { data: sessionData } =
        await supabase.auth.getSession();

      if (!active || currentGeneration !== generation ||
          !sessionData.session) return;

      const { data: share, error } = await supabase
        .from("workspace_note_shares")
        .select("token, active")
        .eq("note_id", noteId)
        .maybeSingle();

      if (!active || currentGeneration !== generation ||
          error || !share?.active) return;

      await supabase.realtime.setAuth(
        sessionData.session.access_token
      );

      if (!active || currentGeneration !== generation) return;

      const channel = supabase.channel(
        "shared-note:" + share.token,
        {
          config: {
            private: true,
            broadcast: { self: false }
          }
        }
      );

      currentChannel = channel;

      channel
        .on("broadcast", { event: "note_changed" }, ({ payload }) => {
          if (payload?.type === "access_changed") {
            sharedLiveChannel.current = null;
          }
        })
        .subscribe(status => {
          if (!active || currentChannel !== channel) return;

          sharedLiveChannel.current =
            status === "SUBSCRIBED" ? channel : null;
        });
    }

    function onChange() {
      void connect();
    }

    window.addEventListener(
      "workspace-note-share-changed",
      onChange
    );

    void connect();

    return () => {
      active = false;
      generation++;
      sharedLiveChannel.current = null;

      window.removeEventListener(
        "workspace-note-share-changed",
        onChange
      );

      if (currentChannel) {
        void supabase.removeChannel(currentChannel);
      }
    };
  }, [noteId, editor]);

  // Autoguardado sin interrumpir la escritura.
  useEffect(() => {
    if (!loaded || !dirty.current) return;

    const timer = window.setTimeout(async () => {
      if (busy.current || !dirty.current) return;

      busy.current = true;

      const snapshot = { ...draft.current };
      const version = editVersion.current;

      const { error: saveError } = await supabase
        .from("workspace_notes")
        .update({
          title: snapshot.title.trim() || "Sin título",
          content: snapshot.content,
          updated_at: new Date().toISOString()
        })
        .eq("id", noteId);

      busy.current = false;

      if (saveError) {
        setError(saveError.message);
        return;
      }

      setError("");
      savedVersion.current = version;
      scheduleNoteImageCleanup();

      if (editVersion.current === version) {
        dirty.current = false;
      } else {
        setRevision(value => value + 1);
      }
    }, 650);

    return () => clearTimeout(timer);
  }, [revision, loaded, noteId]);

  // Guardar el ultimo borrador al abandonar el editor.
  // No muestra ventanas ni confirmaciones.
  useEffect(() => {
    return () => {
      if (!dirty.current) return;

      const snapshot = { ...draft.current };

      if (!snapshot.title.trim()) {
        snapshot.title = "Sin título";
      }

      void supabase
        .from("workspace_notes")
        .update({
          title: snapshot.title.trim(),
          content: snapshot.content,
          updated_at: new Date().toISOString()
        })
        .eq("id", noteId);
    };
  }, [noteId]);
  function changeTitle(event) {
    const next = event.target.value;
    setTitle(next);
    draft.current.title = next;
    markChanged();
  }

  function format(action) {
    if (!editor) return;
    const chain = editor.chain().focus();

    switch (action) {
      case "bold": chain.toggleBold().run(); break;
      case "italic": chain.toggleItalic().run(); break;
      case "underline": chain.toggleUnderline().run(); break;
      case "strike": chain.toggleStrike().run(); break;
      case "h1": chain.toggleHeading({ level: 1 }).run(); break;
      case "h2": chain.toggleHeading({ level: 2 }).run(); break;
      case "bullet": chain.toggleBulletList().run(); break;
      case "number": chain.toggleOrderedList().run(); break;
      case "check": chain.toggleTaskList().run(); break;
      case "quote": chain.toggleBlockquote().run(); break;
      case "code": chain.toggleCodeBlock().run(); break;
      case "line": chain.setHorizontalRule().run(); break;
      case "highlight": chain.toggleHighlight().run(); break;
      case "left": chain.setTextAlign("left").run(); break;
      case "center": chain.setTextAlign("center").run(); break;
      case "right": chain.setTextAlign("right").run(); break;
      case "table":
        chain.insertTable({
          rows: 3, cols: 3, withHeaderRow: true
        }).run();
        break;
      case "row": chain.addRowAfter().run(); break;
      case "column": chain.addColumnAfter().run(); break;
      case "deleteRow": chain.deleteRow().run(); break;
      case "deleteColumn": chain.deleteColumn().run(); break;
      case "deleteTable": chain.deleteTable().run(); break;

      default: break;
    }
  }

  function downloadHTML() {
    if (!editor) return;

    const content = editor.getHTML();

    const documentHTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;max-width:900px;
margin:50px auto;padding:0 24px;color:#243349;line-height:1.75}
h1,h2,h3{line-height:1.25}table{border-collapse:collapse;width:100%}
td,th{border:1px solid #ccd5e2;padding:10px;text-align:left}
blockquote{border-left:4px solid #8056ca;padding-left:20px;color:#58677d}
pre{background:#1e293b;color:white;padding:16px;overflow:auto}
mark{background:#fff1a8}
</style>
</head>
<body>
<h1>${title.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</h1>
${content}
</body>
</html>`;

    downloadFile(
      safeFilename(title) + ".html",
      documentHTML,
      "text/html;charset=utf-8"
    );
  }

  function downloadTXT() {
    if (!editor) return;

    downloadFile(
      safeFilename(title) + ".txt",
      `${title}\n\n${editor.getText({ blockSeparator: "\n" })}`,
      "text/plain;charset=utf-8"
    );
  }

  const buttons = [
    { action: "bold", title: "Negrita (Ctrl+B)", icon: Bold },
    { action: "italic", title: "Cursiva (Ctrl+I)", icon: Italic },
    { action: "underline", title: "Subrayado (Ctrl+U)", icon: UnderlineIcon },
    { action: "strike", title: "Tachado", icon: Strikethrough },
    { action: "h1", title: "Título principal", icon: Heading1 },
    { action: "h2", title: "Subtítulo", icon: Heading2 },
    { action: "bullet", title: "Lista con viñetas", icon: List },
    { action: "number", title: "Lista numerada", icon: ListOrdered },
    { action: "check", title: "Lista de tareas", icon: ListTodo },
    { action: "table", title: "Insertar tabla", icon: Table2 },
    { action: "quote", title: "Cita", icon: Quote },
    { action: "code", title: "Bloque de código", icon: Code2 },
    { action: "highlight", title: "Resaltar", icon: Highlighter },
    { action: "left", title: "Alinear a la izquierda", icon: AlignLeft },
    { action: "center", title: "Centrar", icon: AlignCenter },
    { action: "right", title: "Alinear a la derecha", icon: AlignRight },
    { action: "line", title: "Separador", icon: Minus }
  ];

  const active = toolbarState || {};

  return (
    <div className="note-page note-rich-page">
      <div className="note-rich-topbar">
        <button
          type="button"
          className="note-back"
          onClick={onBack}
        >
           Volver al proyecto
        </button>

        <div className="note-rich-downloads">
          <button type="button" onClick={downloadHTML}
                  disabled={!loaded}>
            <Download size={16} /> Descargar HTML
          </button>
          <button type="button" onClick={downloadTXT}
                  disabled={!loaded}>
            <FileText size={16} /> Descargar TXT
          </button>
        </div>
      </div>

      {!loaded && (
        <div className="note-message">
          {error || "Abriendo documento..."}
        </div>
      )}

      {loaded && (
        <section className="note-paper note-rich-paper">
          <div className="note-paper-head">
            <span className="note-eyebrow">BLOC DE NOTAS</span>
            <span>Documento del proyecto</span>
          </div>

          <input
            className="note-title"
            aria-label="Título del documento"
            value={title}
            maxLength={150}
            placeholder="Título del documento"
            onChange={changeTitle}
          />

          <div className="note-rich-toolbar" role="toolbar"
               aria-label="Formato del documento">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              hidden
              onChange={event => {
                const files = Array.from(event.target.files || []);
                event.target.value = "";
                void insertImages(files);
              }}
            />
            <button type="button"
              title={uploadingImage ? "Comprimiendo y subiendo" : "Insertar imagen"}
              aria-label="Insertar imagen"
              disabled={uploadingImage}
              onMouseDown={event => event.preventDefault()}
              onClick={() => imageInputRef.current?.click()}>
              <ImagePlus size={18} aria-hidden="true" />
            </button>
            {uploadingImage && (
              <span role="status" className="note-image-progress">
                Comprimiendo y subiendo
              </span>
            )}
            {buttons.map(({ action, title: tooltip, icon: Icon }) => (
              <button
                type="button"
                key={action}
                title={tooltip}
                aria-label={tooltip}
                className={active[action] ? "is-active" : ""}
                onMouseDown={event => event.preventDefault()}
                onClick={() => format(action)}
              >
                <Icon size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            ))}

            {active.table && (
              <>
                <span className="note-rich-separator" />
                <button type="button"
                  onClick={() => format("row")}>+ Fila</button>
                <button type="button"
                  onClick={() => format("column")}>+ Columna</button>
                <button type="button"
                  onClick={() => format("deleteRow")}> Fila</button>
                <button type="button"
                  onClick={() => format("deleteColumn")}> Columna</button>
                <button type="button"
                  onClick={() => format("deleteTable")}>
                  Quitar tabla
                </button>
              </>
            )}
          </div>

          <EditorContent editor={editor}
                         className="note-rich-editor" />

          {error && (
            <div className="note-error" role="alert">
              No se pudo guardar: {error}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
