type PageHeroProps = {
  title: string;
  description: string;
  noteLabel: string;
  noteValue: string;
};

export function PageHero({
  title,
  description,
  noteLabel,
  noteValue,
}: PageHeroProps) {
  return (
    <section className="hero-panel">
      <p className="eyebrow">Pokelist</p>
      <div className="hero-grid">
        <div>
          <h1>{title}</h1>
          <p className="hero-copy">{description}</p>
        </div>
        <div className="hero-note">
          <span>{noteLabel}</span>
          <strong>{noteValue}</strong>
        </div>
      </div>
    </section>
  );
}
