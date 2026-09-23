import { FiCode, FiCpu, FiLayers, FiSmartphone } from "react-icons/fi";
import SectionHeader from "../components/SectionHeader";
import { site } from "../data/site";

const capabilities = [
  { icon: FiCode, title: "Web", text: "Interfaces, dashboards y aplicaciones responsive." },
  { icon: FiSmartphone, title: "Mobile", text: "Aplicaciones Android y prototipos móviles." },
  { icon: FiLayers, title: "Backend", text: "APIs, autenticación, bases de datos e integraciones." },
  { icon: FiCpu, title: "Realtime & IoT", text: "MQTT, WebSockets, mapas y dispositivos conectados." },
];

function Capabilities() {
  return (
    <section className="section container-wide" id="areas">
      <SectionHeader eyebrow={site.capabilities.eyebrow} title={site.capabilities.title} description={site.capabilities.text} />
      <div className="capabilities-grid">
        {capabilities.map(({ icon: Icon, title, text }) => (
          <article key={title} className="capability-card">
            <Icon />
            <div><h3>{title}</h3><p>{text}</p></div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default Capabilities;
