export type PartKind =
  | 'battery'
  | 'switch'
  | 'lamp'
  | 'resistor'
  | 'potentiometer'
  | 'ammeter'
  | 'voltmeter'
  | 'junction';

export interface Part {
  id: string;
  kind: PartKind;
  /** középpont a vászon koordinátarendszerében */
  x: number;
  y: number;
  /** forgatás fokban: 0 | 90 | 180 | 270 */
  rot: number;
  /** fő paraméter: telep -> V, ellenállás -> ohm, izzó -> ohm, potméter -> ohm (max) */
  value: number;
  /** kapcsoló záródott-e */
  closed?: boolean;
  /** potméter állása 0..1 */
  wiper?: number;
  /** kiégett-e (túlterhelés miatt) */
  burnt?: boolean;
}

export interface Wire {
  id: string;
  a: TerminalRef;
  b: TerminalRef;
  /** elszakadt-e a túl nagy áramtól */
  burnt?: boolean;
}

export interface TerminalRef {
  partId: string;
  /** 0 = "bal"/negatív oldal, 1 = "jobb"/pozitív oldal */
  t: 0 | 1;
}

export interface Circuit {
  parts: Part[];
  wires: Wire[];
}

export interface PartResult {
  /** áramerősség A-ban, pozitív = a 0-ás kivezetéstől az 1-es felé folyik */
  current: number;
  /** feszültség V-ban a kivezetések között (U1 - U0) */
  voltage: number;
  /** teljesítmény W-ban */
  power: number;
  /** 0..1 relatív fényerő (izzó) */
  brightness: number;
  /** true, ha a névleges teljesítmény felett jár */
  overload: boolean;
  /** terhelés a névlegeshez képest (1 = pont névleges) */
  stress: number;
}

export interface SolveResult {
  ok: boolean;
  /** kivezetés-azonosító -> csomópont index */
  nodeOf: Record<string, number>;
  /** csomópont index -> potenciál V-ban */
  nodeVoltage: number[];
  parts: Record<string, PartResult>;
  /** vezeték id -> áramerősség (pozitív = a-tól b felé) */
  wireCurrent: Record<string, number>;
  /** figyelmeztetés a diáknak */
  warning: string | null;
  /** azok az elemek, amelyek most éppen kiégnek (vezeték- és alkatrész-azonosítók) */
  doomed: string[];
  /** folyik-e bárhol számottevő áram */
  flowing: boolean;
  /** rövidzár gyanúja */
  shortCircuit: boolean;
}
