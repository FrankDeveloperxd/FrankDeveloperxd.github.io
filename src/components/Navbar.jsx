import { useState } from "react";
import { FiArrowUpRight, FiGithub, FiMenu, FiX } from "react-icons/fi";
import { site } from "../data/site";

const links = [
  { label: "Proyectos", href: "#proyectos" },
  { label: "Perfil", href: "#areas" },
  { label: "Tecnologías", href: "#stack" },
  { label: "Experiencia", href: "#experiencia" },
  { label: "Contacto", href: "#contacto" },
];

function Navbar({ detail = false }) {
  const [open, setOpen] = useState(false);

  const goTo = (event, href) => {
    if (detail) return;
    event.preventDefault();
    const target = document.querySelector(href);
    if (!target) return;
    target.scrollIntoView({ behavior: "auto", block: "start" });
    window.history.replaceState(null, "", href);
    setOpen(false);
  };

  const linkHref = (href) => (detail ? `/${href}` : href);

  return (
    <header className="site-header">
      <nav className="navbar container-wide">
        <a href={detail ? "/" : "#inicio"} className="brand" aria-label="Ir al inicio" onClick={(event) => !detail && goTo(event, "#inicio")}>
          <span className="brand-mark">FB</span>
          <span className="brand-copy">
            <strong>{site.name}</strong>
            <small>{site.role}</small>
          </span>
        </a>

        <div className="navbar-links">
          {links.map((link) => (
            <a key={link.href} href={linkHref(link.href)} onClick={(event) => goTo(event, link.href)}>
              {link.label}
            </a>
          ))}
        </div>

        <div className="navbar-actions">
          <a className="github-nav" href="https://github.com/FrankDeveloperxd" target="_blank" rel="noreferrer">
            <FiGithub /> GitHub <FiArrowUpRight />
          </a>
          <button className="menu-button" type="button" aria-label="Abrir menú" onClick={() => setOpen((value) => !value)}>
            {open ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="mobile-menu container-wide">
          {links.map((link) => (
            <a key={link.href} href={linkHref(link.href)} onClick={(event) => goTo(event, link.href)}>
              {link.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}

export default Navbar;
