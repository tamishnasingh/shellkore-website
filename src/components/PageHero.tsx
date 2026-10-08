export function PageHero({ title, lede, children }: { eyebrow?: string; title: string; lede?: string; children?: React.ReactNode }) {
  return (
    <section className="page-hero">
      <div className="wrap">
        <h1>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
        {children}
      </div>
    </section>
  );
}
