'use client';

import type { Part, PartResult } from '@/lib/types';
import { PART_DEFS, fmt, hu } from '@/lib/parts';

const HALF = 40;

/** az áramerősségből mozgási sebesség (px/s), majd animációs periódusidő */
export function flowDuration(current: number): number {
  const i = Math.abs(current);
  const speed = Math.max(18, Math.min(500, 45 * Math.pow(i / 0.1, 0.6)));
  return 26 / speed;
}

export function isFlowing(current: number): boolean {
  return Math.abs(current) > 1e-4;
}

function lead(x1: number, x2: number, color: string) {
  return <line x1={x1} y1={0} x2={x2} y2={0} stroke={color} strokeWidth={2.5} strokeLinecap="round" />;
}

/** potméter skálája: 135°-tól 270°-ot fordul az óramutató járásával egyezően */
function knobPoint(r: number, w: number) {
  const a = ((135 + 270 * w) * Math.PI) / 180;
  // kerekítés: így a szerveren és a böngészőben pontosan ugyanaz a szöveg jön ki
  return { x: Math.round(r * Math.cos(a) * 100) / 100, y: Math.round(r * Math.sin(a) * 100) / 100 };
}

function knobArc(r: number, w: number) {
  const s = knobPoint(r, 0);
  const e = knobPoint(r, Math.max(0.0001, w));
  const large = 270 * w > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

interface ShapeProps {
  part: Part;
  result: PartResult;
  selected: boolean;
}

/** Az alkatrész rajza saját (nem forgatott) koordinátákban, középpont az origó. */
export function PartBody({ part, result, selected }: ShapeProps) {
  const def = PART_DEFS[part.kind];
  const leadColor = selected ? '#7dd3fc' : '#5b6b80';
  const b = Math.pow(Math.max(0, Math.min(1, result.brightness)), 0.6);

  switch (part.kind) {
    case 'battery':
      return (
        <>
          {lead(-HALF, -22, leadColor)}
          {lead(22, HALF, leadColor)}
          <rect x={-22} y={-16} width={44} height={32} rx={4} fill={def.color} />
          <rect x={-8} y={-8} width={3} height={16} fill="#0b0f14" opacity={0.55} />
          <rect x={5} y={-16} width={3} height={32} fill="#0b0f14" opacity={0.55} />
          <text x={30} y={-9} textAnchor="middle" fontSize={14} fill={def.color} fontFamily="var(--mono)">
            +
          </text>
          <text x={-30} y={-9} textAnchor="middle" fontSize={14} fill="#6b7a8d" fontFamily="var(--mono)">
            –
          </text>
        </>
      );

    case 'switch': {
      const closed = !!part.closed;
      return (
        <>
          {lead(-HALF, -18, leadColor)}
          {lead(18, HALF, leadColor)}
          <circle cx={-18} cy={0} r={4} fill="#cbd5e1" />
          <circle cx={18} cy={0} r={4} fill={closed ? '#cbd5e1' : '#4b5a6d'} />
          <line
            x1={-18}
            y1={0}
            x2={closed ? 18 : 12}
            y2={closed ? 0 : -18}
            stroke={closed ? '#e2e8f0' : '#94a3b8'}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <circle cx={-18} cy={0} r={7} fill="none" stroke="#33415a" strokeWidth={1.5} />
        </>
      );
    }

    case 'lamp': {
      if (part.burnt) {
        return (
          <>
            {lead(-HALF, -18, leadColor)}
            {lead(18, HALF, leadColor)}
            <circle cx={0} cy={0} r={18} fill="#15191f" stroke="#54606f" strokeWidth={2} />
            <line x1={-9} y1={-9} x2={-2} y2={-2} stroke="#7c8695" strokeWidth={2} />
            <line x1={9} y1={9} x2={3} y2={3} stroke="#7c8695" strokeWidth={2} />
            <line x1={-9} y1={9} x2={-3} y2={3} stroke="#7c8695" strokeWidth={2} />
            <line x1={9} y1={-9} x2={2} y2={-2} stroke="#7c8695" strokeWidth={2} />
            <circle cx={0} cy={0} r={2.5} fill="#3b444f" />
          </>
        );
      }
      const glow = result.overload ? '#fca5a5' : '#ffe07a';
      return (
        <>
          {lead(-HALF, -18, leadColor)}
          {lead(18, HALF, leadColor)}
          {b > 0.02 && <circle cx={0} cy={0} r={18 + 30 * b} fill="url(#glowGrad)" opacity={0.55 * b} />}
          <circle cx={0} cy={0} r={18} fill="#121a23" stroke={result.overload ? '#f87171' : def.color} strokeWidth={2} />
          {b > 0.02 && <circle cx={0} cy={0} r={17} fill={glow} opacity={b} />}
          <line x1={-9} y1={-9} x2={9} y2={9} stroke={b > 0.35 ? '#7a5c00' : def.color} strokeWidth={2} />
          <line x1={-9} y1={9} x2={9} y2={-9} stroke={b > 0.35 ? '#7a5c00' : def.color} strokeWidth={2} />
        </>
      );
    }

    case 'resistor':
      return (
        <>
          {lead(-HALF, -24, leadColor)}
          {lead(24, HALF, leadColor)}
          <rect x={-24} y={-11} width={48} height={22} rx={3} fill={def.color} />
          <rect x={-11} y={-11} width={3} height={22} fill="#0b0f14" opacity={0.35} />
          <rect x={-1} y={-11} width={3} height={22} fill="#0b0f14" opacity={0.35} />
          <rect x={9} y={-11} width={3} height={22} fill="#0b0f14" opacity={0.35} />
        </>
      );

    case 'potentiometer': {
      const w = Math.max(0, Math.min(1, part.wiper ?? 0.5));
      const tip = knobPoint(11, w);
      return (
        <>
          {lead(-HALF, -21, leadColor)}
          {lead(21, HALF, leadColor)}
          <circle cx={0} cy={0} r={21} fill="#1a1710" stroke="#5c4a30" strokeWidth={1.5} />
          <path d={knobArc(16, 1)} fill="none" stroke="#3b3020" strokeWidth={4} strokeLinecap="round" />
          <path d={knobArc(16, w)} fill="none" stroke={def.color} strokeWidth={4} strokeLinecap="round" />
          <circle cx={0} cy={0} r={9} fill={def.color} />
          <line
            x1={0}
            y1={0}
            x2={tip.x}
            y2={tip.y}
            stroke="#1a1710"
            strokeWidth={3.5}
            strokeLinecap="round"
          />
        </>
      );
    }

    case 'ammeter':
    case 'voltmeter': {
      const letter = part.kind === 'ammeter' ? 'A' : 'V';
      return (
        <>
          {lead(-HALF, -18, leadColor)}
          {lead(18, HALF, leadColor)}
          <circle cx={0} cy={0} r={18} fill="#0d141c" stroke={def.color} strokeWidth={2} />
          <text
            x={0}
            y={6}
            textAnchor="middle"
            fontSize={17}
            fontWeight={600}
            fill={def.color}
            fontFamily="var(--mono)"
          >
            {letter}
          </text>
        </>
      );
    }

    case 'junction':
      return <circle cx={0} cy={0} r={5.5} fill={selected ? '#7dd3fc' : '#94a3b8'} />;

    default:
      return null;
  }
}

/** Az alkatrész alatt/mellett megjelenő feliratok (mindig vízszintesek). */
export function partLabels(part: Part, result: PartResult, selected: boolean): { value: string; meas: string } {
  let value = '';
  let meas = '';

  switch (part.kind) {
    case 'battery':
      value = hu(part.value, part.value % 1 === 0 ? 0 : 1) + ' V';
      break;
    case 'lamp':
      value = part.burnt ? 'kiégett' : hu(part.value, 0) + ' Ω';
      break;
    case 'resistor':
      value = hu(part.value, 0) + ' Ω';
      break;
    case 'potentiometer':
      value = hu(part.value * (part.wiper ?? 0.5), 0) + ' / ' + hu(part.value, 0) + ' Ω';
      break;
    case 'switch':
      value = part.closed ? 'zárt' : 'nyitott';
      break;
    case 'ammeter':
      value = fmt(Math.abs(result.current), 'A', 2);
      break;
    case 'voltmeter':
      value = fmt(Math.abs(result.voltage), 'V', 2);
      break;
    default:
      value = '';
  }

  if (selected && part.kind !== 'junction' && part.kind !== 'ammeter' && part.kind !== 'voltmeter') {
    meas = fmt(Math.abs(result.voltage), 'V', 2) + ' · ' + fmt(Math.abs(result.current), 'A', 2);
  }

  return { value, meas };
}
