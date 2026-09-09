'use client';

import type { Circuit, PartResult } from '@/lib/types';
import { terminalPos } from '@/lib/parts';
import { wirePoints, pointsToStr } from '@/lib/geometry';
import { PartBody } from './PartShape';

const still: PartResult = {
  current: 0,
  voltage: 0,
  power: 0,
  brightness: 0,
  overload: false,
  stress: 0,
};

const lit: PartResult = { ...still, brightness: 0.7 };

/** Kis, statikus előnézet egy áramkörről – ugyanazokból az alapformákból. */
export default function CircuitThumb({ circuit }: { circuit: Circuit }) {
  const byId = new Map(circuit.parts.map((p) => [p.id, p]));

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of circuit.parts) {
    for (const t of [0, 1] as const) {
      const q = terminalPos(p, t);
      minX = Math.min(minX, q.x);
      minY = Math.min(minY, q.y);
      maxX = Math.max(maxX, q.x);
      maxY = Math.max(maxY, q.y);
    }
  }
  if (!Number.isFinite(minX)) return <svg className="thumb" viewBox="0 0 100 62" aria-hidden="true" />;

  const pad = 46;
  const x = minX - pad;
  const y = minY - pad;
  const w = maxX - minX + pad * 2;
  const h = maxY - minY + pad * 2;

  return (
    <svg className="thumb" viewBox={`${x} ${y} ${w} ${h}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <radialGradient id="glowGrad">
          <stop offset="0%" stopColor="#ffe07a" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#ffe07a" stopOpacity={0} />
        </radialGradient>
      </defs>
      {circuit.wires.map((wire) => {
        const pa = byId.get(wire.a.partId);
        const pb = byId.get(wire.b.partId);
        if (!pa || !pb) return null;
        const pts = wirePoints(terminalPos(pa, wire.a.t), terminalPos(pb, wire.b.t), pa, pb);
        return (
          <polyline
            key={wire.id}
            points={pointsToStr(pts)}
            fill="none"
            stroke="#46566c"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
      {circuit.parts.map((p) => (
        <g key={p.id} transform={`translate(${p.x},${p.y}) rotate(${p.rot})`}>
          <PartBody part={p} result={p.kind === 'lamp' ? lit : still} selected={false} />
        </g>
      ))}
    </svg>
  );
}
