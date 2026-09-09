import type { Part, PartKind } from './types';

export const GRID = 20;
/** minden alkatrész két kivezetése ilyen távol van egymástól */
export const SPAN = 80;

export interface ParamSpec {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  /** gyorsválasztó gombok */
  presets?: number[];
}

export interface PartDef {
  kind: PartKind;
  name: string;
  short: string;
  color: string;
  hint: string;
  defaultValue: number;
  param?: ParamSpec;
  /** ohmos ellenállás számításhoz (ha nincs param) */
  fixedResistance?: number;
}

export const PART_DEFS: Record<PartKind, PartDef> = {
  battery: {
    kind: 'battery',
    name: 'Telep',
    short: 'Telep',
    color: '#f2c94c',
    hint: 'Feszültségforrás. Ez "hajtja" az áramot a körben.',
    defaultValue: 4.5,
    param: { label: 'Feszültség', unit: 'V', min: 1, max: 24, step: 0.5, presets: [1.5, 4.5, 9, 12] },
  },
  switch: {
    kind: 'switch',
    name: 'Kapcsoló',
    short: 'Kapcs.',
    color: '#9aa4b2',
    hint: 'Kattints rá a vásznon a nyitás / zárás váltásához.',
    defaultValue: 0,
  },
  lamp: {
    kind: 'lamp',
    name: 'Izzó',
    short: 'Izzó',
    color: '#ffd75e',
    hint: 'Fényereje az átfolyó áram teljesítményétől függ.',
    defaultValue: 30,
    param: { label: 'Ellenállás', unit: 'Ω', min: 2, max: 200, step: 1, presets: [10, 30, 60, 120] },
  },
  resistor: {
    kind: 'resistor',
    name: 'Ellenállás',
    short: 'Ellenáll.',
    color: '#f2994a',
    hint: 'Fékezi az áramot. Nagyobb ohm -> kisebb áramerősség.',
    defaultValue: 100,
    param: { label: 'Ellenállás', unit: 'Ω', min: 1, max: 2000, step: 1, presets: [10, 47, 100, 470, 1000] },
  },
  potentiometer: {
    kind: 'potentiometer',
    name: 'Potenciométer',
    short: 'Potm.',
    color: '#f7b267',
    hint: 'Csúszkával folyamatosan állítható ellenállás.',
    defaultValue: 500,
    param: { label: 'Teljes ellenállás', unit: 'Ω', min: 10, max: 5000, step: 10, presets: [100, 500, 1000, 2200] },
  },
  ammeter: {
    kind: 'ammeter',
    name: 'Ampermérő',
    short: 'A-mérő',
    color: '#56ccf2',
    hint: 'Sorosan kötjük be. Az áramerősséget méri (A).',
    defaultValue: 0,
  },
  voltmeter: {
    kind: 'voltmeter',
    name: 'Voltmérő',
    short: 'V-mérő',
    color: '#b18cff',
    hint: 'Párhuzamosan kötjük be. A feszültséget méri (V).',
    defaultValue: 0,
  },
  junction: {
    kind: 'junction',
    name: 'Elágazás',
    short: 'Csomó',
    color: '#7d8896',
    hint: 'Kötéspont: itt ágazik szét vagy fut össze több vezeték.',
    defaultValue: 0,
  },
};

export const PALETTE_ORDER: PartKind[] = [
  'battery',
  'switch',
  'lamp',
  'resistor',
  'potentiometer',
  'ammeter',
  'voltmeter',
  'junction',
];


/** a csomópont "pontszerű": mindkét kivezetése ugyanott van */
export function partSpan(kind: PartKind): number {
  return kind === 'junction' ? 0 : SPAN;
}

export function terminalOffset(part: Part, t: 0 | 1): { x: number; y: number } {
  const half = partSpan(part.kind) / 2;
  const d = t === 0 ? -half : half;
  const rad = (part.rot * Math.PI) / 180;
  return { x: d * Math.cos(rad), y: d * Math.sin(rad) };
}

export function terminalPos(part: Part, t: 0 | 1): { x: number; y: number } {
  const o = terminalOffset(part, t);
  return { x: part.x + o.x, y: part.y + o.y };
}

export function terminalKey(partId: string, t: 0 | 1): string {
  return partId + ':' + t;
}

export function makePart(kind: PartKind, x: number, y: number, id: string): Part {
  const def = PART_DEFS[kind];
  const part: Part = { id, kind, x, y, rot: 0, value: def.defaultValue };
  if (kind === 'switch') part.closed = false;
  if (kind === 'potentiometer') part.wiper = 0.5;
  return part;
}

export function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

/** magyar tizedesvessző */
export function hu(n: number, digits: number): string {
  return n.toFixed(digits).replace('.', ',');
}

/** szép formázás mértékegység-előtaggal */
export function fmt(value: number, unit: string, digits = 2): string {
  const a = Math.abs(value);
  if (a < 1e-9) return '0 ' + unit;
  if (a >= 1000) return hu(value / 1000, digits) + ' k' + unit;
  if (a < 0.001) return hu(value * 1e6, 0) + ' µ' + unit;
  if (a < 1) return hu(value * 1000, a < 0.01 ? 1 : 0) + ' m' + unit;
  return hu(value, digits) + ' ' + unit;
}
