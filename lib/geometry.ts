import type { Circuit, Part, Wire } from './types';
import { terminalPos } from './parts';

export interface Pt {
  x: number;
  y: number;
}

export function isHoriz(p: Part | undefined): boolean {
  if (!p) return true;
  return p.rot % 180 === 0;
}

/** derékszögű vezetéknyomvonal két kivezetés között */
export function wirePoints(a: Pt, b: Pt, pa?: Part, pb?: Part): Pt[] {
  if (a.x === b.x || a.y === b.y) return [a, b];
  let horizFirst: boolean;
  if (pa?.kind === 'junction' && pb && pb.kind !== 'junction') {
    horizFirst = !isHoriz(pb);
  } else {
    horizFirst = isHoriz(pa);
  }
  const mid = horizFirst ? { x: b.x, y: a.y } : { x: a.x, y: b.y };
  return [a, mid, b];
}

/** egy vezeték teljes nyomvonala a jelenlegi alkatrész-pozíciókból */
export function pathOf(w: Wire, byId: Map<string, Part>): Pt[] | null {
  const pa = byId.get(w.a.partId);
  const pb = byId.get(w.b.partId);
  if (!pa || !pb) return null;
  return wirePoints(terminalPos(pa, w.a.t), terminalPos(pb, w.b.t), pa, pb);
}

export function pointsToStr(pts: Pt[]): string {
  return pts.map((p) => `${p.x},${p.y}`).join(' ');
}

/** a nyomvonal „töréspontja”: ide kerül a szikra és a szakadás jele */
export function midPoint(pts: Pt[]): Pt {
  if (pts.length >= 3) return pts[1];
  return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
}

function projectOnSegment(a: Pt, b: Pt, p: Pt): { point: Pt; dist: number; t: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  const point = { x: a.x + t * dx, y: a.y + t * dy };
  return { point, dist: Math.hypot(p.x - point.x, p.y - point.y), t };
}

export interface WireHit {
  wire: Wire;
  /** a vezetéken lévő legközelebbi pont */
  point: Pt;
  /** vízszintes-e az érintett szakasz */
  horizontal: boolean;
  dist: number;
}

/**
 * Melyik vezetékre esik a megadott pont? A találat közepére ejtve az alkatrész
 * beékelhető a vezetékbe (a vonalat nem kell kitörölni és újrahúzni).
 */
export function hitWire(
  circuit: Circuit,
  p: Pt,
  tolerance = 16,
  excludePartId?: string
): WireHit | null {
  const byId = new Map(circuit.parts.map((x) => [x.id, x]));
  let best: WireHit | null = null;

  for (const w of circuit.wires) {
    if (w.burnt) continue;
    if (excludePartId && (w.a.partId === excludePartId || w.b.partId === excludePartId)) continue;
    const pts = pathOf(w, byId);
    if (!pts) continue;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      // a végpontok közelében ne ékelődjön be (ott a kivezetés van)
      const seg = projectOnSegment(a, b, p);
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      if (segLen < 60) continue;
      if (seg.t * segLen < 24 || (1 - seg.t) * segLen < 24) continue;
      if (seg.dist <= tolerance && (!best || seg.dist < best.dist)) {
        best = { wire: w, point: seg.point, horizontal: Math.abs(b.y - a.y) < 0.5, dist: seg.dist };
      }
    }
  }
  return best;
}
