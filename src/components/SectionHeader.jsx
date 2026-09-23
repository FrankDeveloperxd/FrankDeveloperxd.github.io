function SectionHeader({ eyebrow, title, description }) {
  return (
    <div className="section-header">
      <span className="section-index">{eyebrow}</span>
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
    </div>
  );
}

export default SectionHeader;
