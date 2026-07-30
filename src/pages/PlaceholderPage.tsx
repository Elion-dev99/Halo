interface PlaceholderPageProps {
  title: string;
  stage: string;
}

export function PlaceholderPage({ title, stage }: PlaceholderPageProps) {
  return (
    <section className="page">
      <header className="page-header">
        <h2>{title}</h2>
        <p className="muted">この画面は {stage} で実装予定です。</p>
      </header>
    </section>
  );
}
