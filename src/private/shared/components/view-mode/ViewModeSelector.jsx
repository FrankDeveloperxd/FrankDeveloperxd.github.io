import React from "react";
import { LayoutGrid, List, Columns3 } from "lucide-react";
import "./ViewModeSelector.css";

export default function ViewModeSelector({
  value,
  onChange,
  variant = "cards",
  disabled = false
}) {
  const CardsIcon = variant === "board"
    ? Columns3
    : LayoutGrid;

  const options = [
    {
      value: "cards",
      label: variant === "board" ? "Tablero" : "Tarjetas",
      Icon: CardsIcon
    },
    {
      value: "list",
      label: "Lista",
      Icon: List
    }
  ];

  return (
    <div className="wvm-selector"
      role="group"
      aria-label="Modo de visualizacion">

      {options.map(({ value: mode, label, Icon }) => (
        <button
          key={mode}
          type="button"
          title={"Vista de " + label.toLowerCase()}
          aria-label={"Vista de " + label.toLowerCase()}
          aria-pressed={value === mode}
          disabled={disabled}
          onClick={() => onChange(mode)}
        >
          <Icon size={19} strokeWidth={1.9} aria-hidden="true"/>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
