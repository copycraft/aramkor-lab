import Link from 'next/link';

export default function SiteNav() {
  return (
    <header className="topbar">
      <Link className="brand" href="/">
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
          <p>Az elektromosság alapjai · 8. osztály, fizika</p>
        </div>
      </Link>

      <Link className="nav-link" href="/">
        ← Minta-áramkörök
      </Link>
    </header>
  );
}
