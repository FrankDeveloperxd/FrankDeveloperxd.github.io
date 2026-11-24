import React from "react";
import {
  KeyRound, Mail, Globe, Database,
  Server, Code, ShieldCheck, User, Briefcase
} from "lucide-react";

export const ICONOS = {
  key: { label: "Clave", Component: KeyRound },
  mail: { label: "Correo", Component: Mail },
  web: { label: "Web", Component: Globe },
  database: { label: "Base de datos", Component: Database },
  server: { label: "Servidor", Component: Server },
  code: { label: "Desarrollo", Component: Code },
  shield: { label: "Seguridad", Component: ShieldCheck },
  user: { label: "Personal", Component: User },
  work: { label: "Trabajo", Component: Briefcase }
};

export const COLORES = [
  "#2563eb",
  "#7c3aed",
  "#047857",
  "#b91c1c",
  "#b45309",
  "#0e7490",
  "#334155",
  "#be185d"
];

export default function BovedaIcono({
  name = "key",
  color = "#2563eb",
  size = 23
}) {
  const Component = ICONOS[name]?.Component || KeyRound;
  const safeColor = COLORES.includes(color) ? color : COLORES[0];

  return (
    <span className="vault-entry-icon"
      style={{ backgroundColor: safeColor }}>
      <Component size={size}/>
    </span>
  );
}

export function BovedaIconoSelector({ icon, color, onChange }) {
  return (
    <div className="vault-customization">
      <div className="vault-icon-preview">
        <BovedaIcono name={icon} color={color} size={28}/>
        <div>
          <strong>Personalizar credencial</strong>
          <small>Elige su icono y color.</small>
        </div>
      </div>

      <div className="vault-icon-options">
        {Object.entries(ICONOS).map(([name, item]) => {
          const Component = item.Component;

          return (
            <button
              type="button"
              key={name}
              title={item.label}
              aria-label={item.label}
              aria-pressed={icon === name}
              className={icon === name ? "is-active" : ""}
              onClick={() => onChange("icon", name)}
            >
              <Component size={21}/>
            </button>
          );
        })}
      </div>

      <div className="vault-color-options">
        {COLORES.map(value => (
          <button
            key={value}
            type="button"
            title={value}
            aria-label={`Color ${value}`}
            aria-pressed={color === value}
            className={color === value ? "is-active" : ""}
            style={{ backgroundColor: value }}
            onClick={() => onChange("color", value)}
          />
        ))}
      </div>
    </div>
  );
}