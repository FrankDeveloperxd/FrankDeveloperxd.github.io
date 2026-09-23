import { FaWhatsapp } from "react-icons/fa";

const message = encodeURIComponent(
  "Hola Frank, vi tu portafolio y quisiera conversar contigo sobre una oportunidad profesional o un proyecto."
);

function WhatsAppButton() {
  return (
    <a
      className="whatsapp-float"
      href={`https://wa.me/51968949651?text=${message}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Contactar a Frank por WhatsApp"
      title="Contactar por WhatsApp"
    >
      <FaWhatsapp />
      <span>WhatsApp</span>
    </a>
  );
}

export default WhatsAppButton;
