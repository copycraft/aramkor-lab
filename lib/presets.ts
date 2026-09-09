import type { Circuit, Part, PartKind, Wire } from './types';

interface PartOpts {
  rot?: number;
  value?: number;
  closed?: boolean;
  wiper?: number;
}

function P(id: string, kind: PartKind, x: number, y: number, o: PartOpts = {}): Part {
  return {
    id,
    kind,
    x,
    y,
    rot: o.rot ?? 0,
    value: o.value ?? 0,
    ...(kind === 'switch' ? { closed: o.closed ?? true } : {}),
    ...(kind === 'potentiometer' ? { wiper: o.wiper ?? 0.5 } : {}),
  };
}

let wireSeq = 0;
function W(a: string, ta: 0 | 1, b: string, tb: 0 | 1): Wire {
  return { id: 'pw' + wireSeq++, a: { partId: a, t: ta }, b: { partId: b, t: tb } };
}

export interface Preset {
  id: string;
  name: string;
  summary: string;
  /** amit a diáknak érdemes kipróbálnia */
  task: string;
  circuit: Circuit;
}

export const PRESETS: Preset[] = [
  {
    id: 'basic',
    name: 'Egyszerű áramkör',
    summary: 'Telep, kapcsoló és egy izzó egyetlen hurokban.',
    task: 'Kapcsold ki-be a kapcsolót, és nézd meg, mikor folyik áram. Állítsd a telepet 1,5 V-ra, majd 9 V-ra!',
    circuit: {
      parts: [
        P('b1', 'battery', 600, 560, { value: 4.5 }),
        P('l1', 'lamp', 600, 200, { value: 30 }),
        P('s1', 'switch', 880, 380, { rot: 90, closed: true }),
        P('j1', 'junction', 320, 200),
        P('j2', 'junction', 320, 560),
      ],
      wires: [
        W('b1', 1, 's1', 1),
        W('s1', 0, 'l1', 1),
        W('l1', 0, 'j1', 0),
        W('j1', 0, 'j2', 0),
        W('j2', 0, 'b1', 0),
      ],
    },
  },
  {
    id: 'series',
    name: 'Két izzó sorosan',
    summary: 'Egyetlen úton halad az áram mindkét izzón keresztül.',
    task: 'Figyeld meg: mindkét izzó halványabb, mint egyedül. Az áramerősség viszont mindenhol ugyanakkora!',
    circuit: {
      parts: [
        P('b1', 'battery', 600, 560, { value: 4.5 }),
        P('l1', 'lamp', 460, 200, { value: 30 }),
        P('l2', 'lamp', 740, 200, { value: 30 }),
        P('s1', 'switch', 940, 380, { rot: 90, closed: true }),
        P('j1', 'junction', 260, 200),
        P('j2', 'junction', 260, 560),
      ],
      wires: [
        W('b1', 1, 's1', 1),
        W('s1', 0, 'l2', 1),
        W('l2', 0, 'l1', 1),
        W('l1', 0, 'j1', 0),
        W('j1', 0, 'j2', 0),
        W('j2', 0, 'b1', 0),
      ],
    },
  },
  {
    id: 'parallel',
    name: 'Két izzó párhuzamosan',
    summary: 'Az áram kettéágazik: mindkét izzóra a teljes feszültség jut.',
    task: 'Ugyanaz a 4,5 V-os telep, mint a soros körben – itt mégis mindkét izzó fényesen világít, mert mindkettőre a teljes feszültség jut. Cserébe a telepből négyszer annyi áram folyik.',
    circuit: {
      parts: [
        // a bal oldali főágban van sorosan a kapcsoló és a telep,
        // a két izzó pedig párhuzamosan lóg a két sín között
        P('s1', 'switch', 300, 280, { rot: 90, closed: true }),
        P('b1', 'battery', 300, 460, { rot: 90, value: 4.5 }),
        P('l1', 'lamp', 580, 380, { rot: 90, value: 30 }),
        P('l2', 'lamp', 780, 380, { rot: 90, value: 30 }),
        P('tl', 'junction', 300, 200),
        P('t1', 'junction', 580, 200),
        P('t2', 'junction', 780, 200),
        P('bl', 'junction', 300, 580),
        P('u1', 'junction', 580, 580),
        P('u2', 'junction', 780, 580),
      ],
      wires: [
        W('tl', 0, 's1', 0),
        W('s1', 1, 'b1', 0),
        W('b1', 1, 'bl', 0),
        W('tl', 0, 't1', 0),
        W('t1', 0, 't2', 0),
        W('bl', 0, 'u1', 0),
        W('u1', 0, 'u2', 0),
        W('l1', 0, 't1', 0),
        W('l1', 1, 'u1', 0),
        W('l2', 0, 't2', 0),
        W('l2', 1, 'u2', 0),
      ],
    },
  },
  {
    id: 'ohm',
    name: 'Ohm törvénye műszerekkel',
    summary: 'Ellenállás sorba kötött ampermérővel és párhuzamos voltmérővel.',
    task: 'Állítgasd az ellenállást és a telep feszültségét. Igaz-e mindig, hogy I = U / R?',
    circuit: {
      parts: [
        P('b1', 'battery', 520, 620, { value: 9 }),
        P('a1', 'ammeter', 420, 180),
        P('r1', 'resistor', 760, 400, { rot: 90, value: 100 }),
        P('v1', 'voltmeter', 960, 400, { rot: 90 }),
        P('j1', 'junction', 200, 180),
        P('j2', 'junction', 200, 620),
        P('j3', 'junction', 760, 180),
        P('j4', 'junction', 760, 620),
        P('j5', 'junction', 960, 180),
        P('j6', 'junction', 960, 620),
      ],
      wires: [
        W('b1', 1, 'j4', 0),
        W('j4', 0, 'r1', 1),
        W('r1', 0, 'j3', 0),
        W('j3', 0, 'a1', 1),
        W('a1', 0, 'j1', 0),
        W('j1', 0, 'j2', 0),
        W('j2', 0, 'b1', 0),
        W('j3', 0, 'j5', 0),
        W('j5', 0, 'v1', 0),
        W('v1', 1, 'j6', 0),
        W('j6', 0, 'j4', 0),
      ],
    },
  },
  {
    id: 'protect',
    name: 'Előtétellenállás',
    summary: 'Ellenállással védjük a 9 V-ra kötött izzót a kiégéstől.',
    task: 'Vedd ki az ellenállást (vagy állítsd 1 Ω-ra): az izzó túlterhelt lesz. Nagy ellenállásnál viszont alig világít – keresd meg a jó értéket!',
    circuit: {
      parts: [
        P('b1', 'battery', 600, 560, { value: 9 }),
        P('r1', 'resistor', 420, 200, { value: 47 }),
        P('l1', 'lamp', 700, 200, { value: 30 }),
        P('s1', 'switch', 940, 380, { rot: 90, closed: true }),
        P('j1', 'junction', 260, 200),
        P('j2', 'junction', 260, 560),
      ],
      wires: [
        W('b1', 1, 's1', 1),
        W('s1', 0, 'l1', 1),
        W('l1', 0, 'r1', 1),
        W('r1', 0, 'j1', 0),
        W('j1', 0, 'j2', 0),
        W('j2', 0, 'b1', 0),
      ],
    },
  },
  {
    id: 'dimmer',
    name: 'Fényerő-szabályzó',
    summary: 'Potenciométerrel folyamatosan állítható az izzó fényereje.',
    task: 'Húzd a potméter csúszkáját! Nagyobb ellenállás → kisebb áram → halványabb fény.',
    circuit: {
      parts: [
        P('b1', 'battery', 600, 560, { value: 4.5 }),
        P('pt1', 'potentiometer', 420, 200, { value: 100, wiper: 0.3 }),
        P('l1', 'lamp', 720, 200, { value: 30 }),
        P('a1', 'ammeter', 940, 380, { rot: 90 }),
        P('j1', 'junction', 260, 200),
        P('j2', 'junction', 260, 560),
      ],
      wires: [
        W('b1', 1, 'a1', 1),
        W('a1', 0, 'l1', 1),
        W('l1', 0, 'pt1', 1),
        W('pt1', 0, 'j1', 0),
        W('j1', 0, 'j2', 0),
        W('j2', 0, 'b1', 0),
      ],
    },
  },
];

/** friss, független másolat új azonosítókkal – a preset adatokat sosem módosítjuk helyben */
export function clonePreset(p: Preset, nextId: (prefix: string) => string): Circuit {
  const map = new Map<string, string>();
  const parts = p.circuit.parts.map((x) => {
    const id = nextId('p');
    map.set(x.id, id);
    return { ...x, id };
  });
  const wires = p.circuit.wires.map((x) => ({
    id: nextId('w'),
    a: { partId: map.get(x.a.partId)!, t: x.a.t },
    b: { partId: map.get(x.b.partId)!, t: x.b.t },
  }));
  return { parts, wires };
}
