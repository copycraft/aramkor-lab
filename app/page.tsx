import Link from 'next/link';
import CircuitThumb from '@/components/CircuitThumb';
import { PRESETS } from '@/lib/presets';

export default function Home() {
  return (
    <main className="shell picker-shell">
      <header className="picker-head">
        <span className="brand-mark" aria-hidden="true">
          <svg width={18} height={18} viewBox="-12 -12 24 24">
            <circle cx={0} cy={0} r={8} fill="none" stroke="#38bdf8" strokeWidth={2} />
            <line x1={-11} y1={0} x2={-8} y2={0} stroke="#38bdf8" strokeWidth={2} strokeLinecap="round" />
            <line x1={8} y1={0} x2={11} y2={0} stroke="#38bdf8" strokeWidth={2} strokeLinecap="round" />
            <line x1={-4} y1={-4} x2={4} y2={4} stroke="#f2c94c" strokeWidth={2} />
            <line x1={-4} y1={4} x2={4} y2={-4} stroke="#f2c94c" strokeWidth={2} />
          </svg>
        </span>
        <div>
          <h1>Áramkör Labor</h1>
          <p>Válassz egy áramkört, vagy kezdj üres vászonnal</p>
        </div>
      </header>

      <div className="picker-grid">
        {PRESETS.map((p) => (
          <Link className="picker-card" href={`/labor/?kor=${p.id}`} key={p.id}>
            <span className="picker-thumb">
              <CircuitThumb circuit={p.circuit} />
            </span>
            <span className="picker-text">
              <span className="pc-name">{p.name}</span>
              <span className="pc-sub">{p.summary}</span>
            </span>
          </Link>
        ))}

        <Link className="picker-card" href="/labor/?kor=ures">
          <span className="picker-thumb">
            <svg className="thumb" viewBox="0 0 200 125" aria-hidden="true">
              <rect
                x={18}
                y={18}
                width={164}
                height={89}
                rx={8}
                fill="none"
                stroke="#33455a"
                strokeWidth={3}
                strokeDasharray="9 9"
              />
              <line x1={100} y1={45} x2={100} y2={81} stroke="#38bdf8" strokeWidth={4} strokeLinecap="round" />
              <line x1={82} y1={63} x2={118} y2={63} stroke="#38bdf8" strokeWidth={4} strokeLinecap="round" />
            </svg>
          </span>
          <span className="picker-text">
            <span className="pc-name">Üres vászon</span>
            <span className="pc-sub">Építs áramkört a nulláról a saját ötleted szerint.</span>
          </span>
        </Link>
      </div>
    </main>
  );
}
