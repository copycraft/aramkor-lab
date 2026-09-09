import type { Circuit, Part, PartResult, SolveResult } from './types';
import { terminalKey } from './parts';

/** ideálishoz közeli vezeték- és kapcsolóellenállás */
const R_WIRE = 1e-3;
const R_SWITCH = 1e-3;
const R_AMMETER = 1e-3;
const R_VOLTMETER = 1e7;
/** telep belső ellenállása: rövidzárnál is véges áramot ad */
const R_BATTERY_INT = 0.4;
/** izzó névleges feszültsége a fényerőhöz */
export const LAMP_U_NOM = 4.5;
/** ekkora áram felett elszakad a vezeték (rövidzár) */
export const WIRE_BURN_A = 3.5;
/** ennyiszeres túlterhelésnél ég ki az izzó */
export const LAMP_BURN_STRESS = 2.6;

interface Elem {
  kind: 'R' | 'V';
  a: number;
  b: number;
  value: number;
}

class UF {
  private p: number[] = [];
  find(i: number): number {
    while (this.p[i] !== undefined && this.p[i] !== i) i = this.p[i];
    if (this.p[i] === undefined) this.p[i] = i;
    return i;
  }
  union(i: number, j: number) {
    const a = this.find(i);
    const b = this.find(j);
    if (a !== b) this.p[a] = b;
  }
}

/** Gauss-elimináció részleges főelemkiválasztással */
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    }
    if (Math.abs(A[piv][col]) < 1e-14) continue;
    if (piv !== col) {
      const tr = A[piv]; A[piv] = A[col]; A[col] = tr;
      const tb = b[piv]; b[piv] = b[col]; b[col] = tb;
    }
    const d = A[col][col];
    for (let r = col + 1; r < n; r++) {
      const f = A[r][col] / d;
      if (f === 0) continue;
      for (let c = col; c < n; c++) A[r][c] -= f * A[col][c];
      b[r] -= f * b[col];
    }
  }
  const x: number[] = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    if (Math.abs(A[r][r]) < 1e-14) { x[r] = 0; continue; }
    let s = b[r];
    for (let c = r + 1; c < n; c++) s -= A[r][c] * x[c];
    x[r] = s / A[r][r];
  }
  return x;
}

export function partResistance(p: Part): number {
  switch (p.kind) {
    case 'resistor': return Math.max(0.01, p.value);
    case 'lamp': return Math.max(0.5, p.value);
    case 'potentiometer': return Math.max(0.1, p.value * (p.wiper ?? 0.5));
    case 'ammeter': return R_AMMETER;
    case 'voltmeter': return R_VOLTMETER;
    case 'switch': return R_SWITCH;
    default: return 0;
  }
}

const emptyResult = (): PartResult => ({
  current: 0, voltage: 0, power: 0, brightness: 0, overload: false, stress: 0,
});

export function solveCircuit(circuit: Circuit): SolveResult {
  const { parts, wires } = circuit;

  // --- 1. csomopontok: minden kivezetes kulon, az elagazasok osszevonva
  const nodeOf: Record<string, number> = {};
  const keys: string[] = [];
  for (const p of parts) {
    for (const t of [0, 1] as const) {
      const k = terminalKey(p.id, t);
      nodeOf[k] = keys.length;
      keys.push(k);
    }
  }
  const uf = new UF();
  for (const p of parts) {
    if (p.kind === 'junction') {
      uf.union(nodeOf[terminalKey(p.id, 0)], nodeOf[terminalKey(p.id, 1)]);
    }
  }
  const remap = new Map<number, number>();
  let nodeCount = 0;
  for (const k of keys) {
    const root = uf.find(nodeOf[k]);
    if (!remap.has(root)) remap.set(root, nodeCount++);
    nodeOf[k] = remap.get(root)!;
  }

  // --- 2. halozati elemek osszeallitasa
  const elems: Elem[] = [];
  /** alkatresz id -> az az elem, amin a 0 -> 1 iranyu aram folyik */
  const currentElem = new Map<string, number>();
  const wireElem = new Map<string, number>();
  let n = nodeCount;
  const newNode = () => n++;

  for (const w of wires) {
    const a = nodeOf[terminalKey(w.a.partId, w.a.t)];
    const b = nodeOf[terminalKey(w.b.partId, w.b.t)];
    if (a === undefined || b === undefined) continue;
    if (w.burnt) continue; // elszakadt vezeték: szakadás
    wireElem.set(w.id, elems.length);
    elems.push({ kind: 'R', a, b, value: R_WIRE });
  }

  for (const p of parts) {
    const n0 = nodeOf[terminalKey(p.id, 0)];
    const n1 = nodeOf[terminalKey(p.id, 1)];
    if (n0 === undefined || n1 === undefined) continue;
    if (p.kind === 'junction') continue;
    if (p.kind === 'switch' && !p.closed) continue;
    if (p.burnt) continue; // kiégett izzó: szakadás

    if (p.kind === 'battery') {
      // 0 = negativ polus, 1 = pozitiv polus
      const mid = newNode();
      elems.push({ kind: 'V', a: mid, b: n0, value: p.value });
      currentElem.set(p.id, elems.length);
      elems.push({ kind: 'R', a: mid, b: n1, value: R_BATTERY_INT });
      continue;
    }

    currentElem.set(p.id, elems.length);
    elems.push({ kind: 'R', a: n0, b: n1, value: partResistance(p) });
  }

  // --- 3. minden osszefuggo reszkor kap egy foldpontot
  const cuf = new UF();
  for (const e of elems) cuf.union(e.a, e.b);
  const grounds = new Set<number>();
  const seen = new Set<number>();
  for (let i = 0; i < n; i++) {
    const r = cuf.find(i);
    if (!seen.has(r)) { seen.add(r); grounds.add(i); }
  }

  // --- 4. MNA matrix felepitese es megoldasa
  const vSources = elems.map((e, i) => (e.kind === 'V' ? i : -1)).filter((i) => i >= 0);
  const size = n + vSources.length;
  const A: number[][] = Array.from({ length: size }, () => new Array(size).fill(0) as number[]);
  const b: number[] = new Array(size).fill(0);

  for (const e of elems) {
    if (e.kind !== 'R') continue;
    const g = 1 / e.value;
    A[e.a][e.a] += g; A[e.a][e.b] -= g;
    A[e.b][e.a] -= g; A[e.b][e.b] += g;
  }
  vSources.forEach((ei, k) => {
    const e = elems[ei];
    const row = n + k;
    A[e.a][row] += 1; A[e.b][row] -= 1;
    A[row][e.a] += 1; A[row][e.b] -= 1;
    b[row] = e.value;
  });
  for (const g of grounds) {
    for (let c = 0; c < size; c++) A[g][c] = 0;
    A[g][g] = 1;
    b[g] = 0;
  }

  const x = solveLinear(A, b);
  const nodeVoltage = x.slice(0, n);

  // --- 5. aramok visszaszamolasa
  const elemCurrent = (i: number) => {
    const e = elems[i];
    if (!e || e.kind !== 'R') return 0;
    return (nodeVoltage[e.a] - nodeVoltage[e.b]) / e.value;
  };
  const partCurrent: Record<string, number> = {};
  const wireCurrent: Record<string, number> = {};
  for (const p of parts) {
    const ei = currentElem.get(p.id);
    partCurrent[p.id] = ei === undefined ? 0 : elemCurrent(ei);
  }
  for (const w of wires) {
    const ei = wireElem.get(w.id);
    wireCurrent[w.id] = ei === undefined ? 0 : elemCurrent(ei);
  }

  // --- 6. eredmenyek alkatreszenkent
  const results: Record<string, PartResult> = {};
  let maxCurrent = 0;
  let batteryOverload = false;

  for (const p of parts) {
    const r = emptyResult();
    const n0 = nodeOf[terminalKey(p.id, 0)];
    const n1 = nodeOf[terminalKey(p.id, 1)];
    const i = partCurrent[p.id] ?? 0;
    const u = (nodeVoltage[n0] ?? 0) - (nodeVoltage[n1] ?? 0);
    r.current = i;
    r.voltage = p.kind === 'battery' ? -u : u;
    r.power = Math.abs(u * i);
    maxCurrent = Math.max(maxCurrent, Math.abs(i));

    if (p.kind === 'lamp' && !p.burnt) {
      const R = partResistance(p);
      const pNom = (LAMP_U_NOM * LAMP_U_NOM) / R;
      const rel = pNom > 0 ? r.power / pNom : 0;
      r.stress = rel;
      r.brightness = Math.max(0, Math.min(1, rel));
      r.overload = rel > 1.8;
    } else if (p.kind === 'battery') {
      if (Math.abs(i) > 3) batteryOverload = true;
    }
    results[p.id] = r;
  }

  // --- 7. mi ég ki most? (a legterheltebb vezeték szakad el elsőként)
  const doomed: string[] = [];
  let worstWire: { id: string; i: number } | null = null;
  for (const w of wires) {
    if (w.burnt) continue;
    const i = Math.abs(wireCurrent[w.id] ?? 0);
    if (i > WIRE_BURN_A && (!worstWire || i > worstWire.i)) worstWire = { id: w.id, i };
  }
  if (worstWire) doomed.push(worstWire.id);
  for (const p of parts) {
    if (p.kind === 'lamp' && !p.burnt && results[p.id].stress > LAMP_BURN_STRESS) doomed.push(p.id);
  }

  const flowing = maxCurrent > 1e-4;
  const hasBattery = parts.some((p) => p.kind === 'battery');
  const hasOpenSwitch = parts.some((p) => p.kind === 'switch' && !p.closed);
  const overloaded = parts.some((p) => p.kind === 'lamp' && results[p.id]?.overload);
  const burntWire = wires.some((w) => w.burnt);
  const burntLamp = parts.some((p) => p.burnt);

  let warning: string | null = null;
  if (batteryOverload) {
    warning = 'Rövidzár! Az áram a fogyasztókat megkerülve, szinte ellenállás nélkül folyik – ezt semmilyen vezeték nem bírja sokáig.';
  } else if (burntWire) {
    warning = 'Elszakadt egy vezeték a rövidzár miatt. Jelöld ki, és cseréld ki – vagy nyomd meg a „Hibás elemek cseréje” gombot!';
  } else if (burntLamp) {
    warning = 'Kiégett egy izzó a túl nagy feszültségtől. Cseréld ki, és tegyél elé ellenállást!';
  } else if (!hasBattery && parts.length > 0) {
    warning = 'Nincs áramforrás a körben. Tegyél bele egy telepet!';
  } else if (hasBattery && !flowing && hasOpenSwitch) {
    warning = 'Nyitott kapcsoló: a kör szakadt, nem folyik áram.';
  } else if (hasBattery && !flowing && parts.length > 1) {
    warning = 'Szakadt (nyitott) áramkör – nincs zárt út a telep két pólusa között.';
  } else if (overloaded) {
    warning =
      'Túlterhelt izzó! Ez az izzó 4,5 V-ra van méretezve – ha még feljebb viszed a feszültséget, ki fog égni. Tegyél elé ellenállást!';
  }

  return {
    ok: true,
    nodeOf,
    nodeVoltage,
    parts: results,
    wireCurrent,
    warning,
    doomed,
    flowing,
    shortCircuit: batteryOverload,
  };
}
