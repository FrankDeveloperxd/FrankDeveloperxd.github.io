import { FiArrowUpRight, FiDownload, FiGithub, FiLinkedin, FiMail } from "react-icons/fi";
import { site } from "../data/site";

function Contact() {
  return (
    <section className="contact-section" id="contacto">
      <div className="container-wide contact-inner">
        <div className="contact-copy">
          <span className="section-index">{site.contact.eyebrow}</span>
          <h2>{site.contact.title}</h2>
          <p>{site.contact.text}</p>
        </div>

        <div className="contact-links">
          <a href="mailto:bernaola.p.frank@gmail.com"><FiMail /> Email <FiArrowUpRight /></a>
          <a href="https://www.linkedin.com/in/frank-yampierre-bernaola-pacheco/" target="_blank" rel="noreferrer"><FiLinkedin /> LinkedIn <FiArrowUpRight /></a>
          <a href="https://github.com/FrankDeveloperxd" target="_blank" rel="noreferrer"><FiGithub /> GitHub <FiArrowUpRight /></a>
          <a href="/cv/Frank-Bernaola-CV.pdf" target="_blank" rel="noreferrer"><FiDownload /> CV</a>
        </div>

        <footer>
          <span>{site.fullName} · {site.role}</span>
          <span>{site.location}</span>
        </footer>
      </div>
    </section>
  );
}

export default Contact;
