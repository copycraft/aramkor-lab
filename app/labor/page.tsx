import Lab from '@/components/Lab';
import SiteNav from '@/components/SiteNav';
import { THEORY } from '@/lib/theory';

export const metadata = {
  title: 'Labor — Áramkör Labor',
  description: 'Áramkör-szerkesztő: építs, kapcsolj és mérj valós idejű Ohm-törvény szimulációval.',
};

export default function LabPage() {
  return (
    <main className="shell">
      <SiteNav />

      <Lab />

      <section className="section">
        <div className="section-head">
          <h2>Amit tudni érdemes</h2>
          <p>Rövid összefoglaló a kísérletezéshez</p>
        </div>
        <div className="theory-grid">
          {THEORY.map((c) => (
            <article className="card" key={c.id} style={{ borderTopColor: c.accent }}>
              <div className="card-top">
                <h3>{c.title}</h3>
                <span className="c-sym" style={{ color: c.accent }}>
                  {c.symbol}
                </span>
              </div>
              <div className="c-unit">{c.unit}</div>
              <p className="c-lead">{c.lead}</p>
              {c.formula && <div className="c-formula">{c.formula}</div>}
              <ul>
                {c.body.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <footer className="footer">
        Billentyűk: <b>R</b> – forgatás, <b>Delete</b> – kijelölt elem törlése, <b>Esc</b> – kijelölés megszüntetése. Az
        oldal semmit nem ment el; frissítéskor minden a kiindulási állapotba kerül vissza.
      </footer>
    </main>
  );
}
