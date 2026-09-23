import { SiAndroid, SiDocker, SiDotnet, SiFirebase, SiFlutter, SiGit, SiJavascript, SiKotlin, SiMysql, SiPostgresql, SiPython, SiReact, SiSwagger } from "react-icons/si";
import { FiCode, FiCpu, FiRadio } from "react-icons/fi";
import SectionHeader from "../components/SectionHeader";
import { site } from "../data/site";

const tools = [
  ["Kotlin", SiKotlin], ["Android", SiAndroid], ["React", SiReact], ["JavaScript", SiJavascript],
  ["C#", FiCode], [".NET", SiDotnet], ["Python", SiPython], ["Flutter", SiFlutter],
  ["PostgreSQL", SiPostgresql], ["MySQL", SiMysql], ["Firebase", SiFirebase], ["Docker", SiDocker],
  ["Git", SiGit], ["Swagger", SiSwagger], ["MQTT", FiRadio], ["ESP32", FiCpu],
];

function Stack() {
  return (
    <section className="section container-wide" id="stack">
      <SectionHeader eyebrow={site.stack.eyebrow} title={site.stack.title} description={site.stack.text} />
      <div className="tool-grid">
        {tools.map(([name, Icon]) => <div className="tool-tile" key={name}><Icon /><span>{name}</span></div>)}
      </div>
    </section>
  );
}

export default Stack;
