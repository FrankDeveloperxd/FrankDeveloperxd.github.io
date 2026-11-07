import { Pipette } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./BackgroundColorPicker.css";

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

function hexToRgb(hex) {
  const s = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "173b63";
  return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16));
}

function rgbToHex(rgb) {
  return "#" + rgb.map(v =>
    clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")
  ).join("");
}

function rgbToHsv(rgb) {
  const [r, g, b] = rgb.map(v => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;

  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = (h * 60 + 360) % 360;
  }

  return {
    h,
    s: max ? delta / max : 0,
    v: max
  };
}

function hsvToHex({h, s, v}) {
  const c = v * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = v - c;
  const sector = Math.floor(h / 60) % 6;
  const parts = [
    [c,x,0],[x,c,0],[0,c,x],
    [0,x,c],[x,0,c],[c,0,x]
  ][sector];
  return rgbToHex(parts.map(n => (n + m) * 255));
}

export default function BackgroundColorPicker({ value, onChange, empty = false, direction = "up" }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({left:0,bottom:0,height:280});
  const [hue, setHue] = useState(() => rgbToHsv(hexToRgb(value)).h);
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);
  const squareRef = useRef(null);

  const actual = rgbToHsv(hexToRgb(value));
  const hsv = {...actual, h:hue};
  const rgb = hexToRgb(value);

  // BACKGROUND EYEDROPPER V1
  async function pickScreenColor() {
    if (!("EyeDropper" in window)) {
      return;
    }

    try {
      const picker = new window.EyeDropper();
      const result = await picker.open();

      if (/^#[0-9a-fA-F]{6}$/.test(result.sRGBHex)) {
        onChange(result.sRGBHex);
        setHue(rgbToHsv(hexToRgb(result.sRGBHex)).h);
      }
    } catch (error) {
      // Escape cancela la seleccion sin cambiar el color.
      if (error?.name !== "AbortError") {
        console.error("No se pudo usar el cuentagotas.", error);
      }
    }
  }
  function changeHsv(next) {
    setHue(next.h);
    onChange(hsvToHex(next));
  }

  function updatePosition() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const down = direction === "down";

    setPosition({
      left: clamp(
        rect.left - 8,
        8,
        Math.max(8, window.innerWidth - 250)
      ),
      top: down ? rect.bottom + 3 : "auto",
      bottom: down
        ? "auto"
        : window.innerHeight - rect.top + 3,
      height: down
        ? Math.max(100, window.innerHeight - rect.bottom - 12)
        : Math.max(100, rect.top - 12)
    });
  }

  useEffect(() => {
    const next = rgbToHsv(hexToRgb(value));
    if (next.s > 0.001) setHue(next.h);
  }, [value]);

  useEffect(() => {
    if (!open) return;

    updatePosition();

    function onPointer(event) {
      if (
        !popoverRef.current?.contains(event.target) &&
        !buttonRef.current?.contains(event.target)
      ) setOpen(false);
    }

    function onKey(event) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    function refresh() {
      updatePosition();
    }

    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", refresh);
    window.addEventListener("scroll", refresh, true);

    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", refresh, true);
    };
  }, [open]);

  function updateSquare(event) {
    const rect = squareRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return;

    changeHsv({
      h: hue,
      s: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      v: 1 - clamp((event.clientY - rect.top) / rect.height, 0, 1)
    });
  }

  function changeChannel(index, input) {
    const next = [...rgb];
    next[index] = clamp(Number(input) || 0, 0, 255);
    onChange(rgbToHex(next));
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={empty ? "bcp-trigger is-empty" : "bcp-trigger"}
        aria-label="Elegir color personalizado de fondo"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(current => !current)}
      >
        <span style={{backgroundColor:empty ? "transparent" : value}}/>
      </button>

      {open && createPortal(
        <div
          ref={popoverRef}
          className="bcp-popover"
          role="dialog"
          aria-label="Color personalizado de fondo"
          style={{
            left:position.left,
            top:position.top, bottom:position.bottom,
            maxHeight:position.height
          }}
        >
          <div
            ref={squareRef}
            className="bcp-square"
            style={{backgroundColor:`hsl(${hue},100%,50%)`}}
            onPointerDown={event => {
              event.currentTarget.setPointerCapture(event.pointerId);
              updateSquare(event);
            }}
            onPointerMove={event => {
              if (event.buttons & 1) updateSquare(event);
            }}
          >
            <span
              className="bcp-cursor"
              style={{
                left:`${hsv.s * 100}%`,
                top:`${(1 - hsv.v) * 100}%`
              }}
            />
          </div>

          <div className="bcp-controls">
            <div className="bcp-hue-row">
              {"EyeDropper" in window && (
                <button
                  type="button"
                  className="bcp-eyedropper"
                  aria-label="Seleccionar color de la pantalla"
                  title="Cuentagotas: elegir color de la pantalla"
                  onClick={pickScreenColor}
                >
                  <Pipette size={18} strokeWidth={2} aria-hidden="true"/>
                </button>
              )}
              <span className="bcp-current"
                style={{backgroundColor:value}}/>
              <input
                type="range"
                min="0"
                max="359"
                value={Math.round(hue)}
                aria-label="Tonalidad"
                className="bcp-hue"
                onChange={event => changeHsv({
                  ...hsv,
                  h:Number(event.target.value)
                })}
              />
            </div>

            <div className="bcp-rgb">
              {["R","G","B"].map((name, i) => (
                <label key={name}>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={rgb[i]}
                    aria-label={name}
                    onChange={event =>
                      changeChannel(i, event.target.value)
                    }
                  />
                  <span>{name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}