'use client';

import { useEffect, useRef, useState } from 'react';
import type { Circuit, Part, SolveResult, TerminalRef } from '@/lib/types';
import { PART_DEFS, GRID, snap, terminalKey, terminalPos } from '@/lib/parts';
import { PartBody, partLabels, flowDuration, isFlowing } from './PartShape';
import { wirePoints, pointsToStr, midPoint, hitWire, isHoriz } from '@/lib/geometry';

export const VW = 1200;
export const VH = 760;
const PAD = 48;
/** legnagyobb nagyítás: ekkora vászondarab látszik */
const MIN_W = 420;

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** gyűrű alakú fogófelület (két körrel, evenodd kitöltéssel) */
function donut(cx: number, cy: number, outer: number, inner: number): string {
  const ring = (r: number) =>
    `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
  return ring(outer) + ' ' + ring(inner);
}

export type Selection = { type: 'part' | 'wire'; id: string } | null;

interface Props {
  circuit: Circuit;
  result: SolveResult;
  selection: Selection;
  onSelect: (s: Selection) => void;
  onMovePart: (id: string, x: number, y: number) => void;
  onAddWire: (a: TerminalRef, b: TerminalRef) => void;
  onToggleSwitch: (id: string) => void;
  onDropPart: (kind: string, x: number, y: number) => void;
  /** meglévő alkatrész elengedése: ha vezetékre esett, be kell ékelni */
  onPartDropped: (id: string, x: number, y: number) => void;
  /** most éppen kiégő elemek azonosítói */
  burning: string[];
}

interface DragState {
  id: string;
  dx: number;
  dy: number;
  moved: boolean;
}

interface WireDrag {
  from: TerminalRef;
  x: number;
  y: number;
  overKey: string | null;
}

export default function CircuitCanvas({
  circuit,
  result,
  selection,
  onSelect,
  onMovePart,
  onAddWire,
  onToggleSwitch,
  onDropPart,
  onPartDropped,
  burning,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [wireDrag, setWireDrag] = useState<WireDrag | null>(null);
  const [hoverWire, setHoverWire] = useState<string | null>(null);
  /** az a vezeték, amelybe az éppen húzott alkatrész beékelődne */
  const [spliceTarget, setSpliceTarget] = useState<string | null>(null);
  /** kivágat: nagyítás és pásztázás (mobilon ez teszi használhatóvá) */
  const [view, setView] = useState<ViewBox>({ x: 0, y: 0, w: VW, h: VH });
  const [panning, setPanning] = useState<{ x: number; y: number } | null>(null);
  /** lenyomott ujjak / egérgombok – két ujjnál csippentés van */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; view: ViewBox; mid: { x: number; y: number } } | null>(null);
  /** a vászon tényleges magasság/szélesség aránya */
  const aspect = useRef(VH / VW);
  const didFit = useRef(false);

  const partsById = new Map(circuit.parts.map((p) => [p.id, p]));

  /** képernyő -> vászon koordináta (a nagyítást is figyelembe véve) */
  const toLocal = (clientX: number, clientY: number) => {
    const el = svgRef.current;
    const m = el?.getScreenCTM();
    if (!el || !m) return { x: 0, y: 0 };
    const pt = el.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const q = pt.matrixTransform(m.inverse());
    return { x: q.x, y: q.y };
  };

  const clamp = (v: number, max: number) => Math.max(PAD, Math.min(max - PAD, v));

  /** nagyítás egy rögzített pont körül */
  const zoomTo = (factor: number, anchor?: { x: number; y: number }, from?: ViewBox) => {
    setView((v0) => {
      const v = from ?? v0;
      const w = Math.max(MIN_W, Math.min(VW * 1.3, v.w * factor));
      const k = w / v.w;
      const h = w * aspect.current;
      const a = anchor ?? { x: v.x + v.w / 2, y: v.y + v.h / 2 };
      return {
        x: a.x - (a.x - v.x) * k,
        y: a.y - (a.y - v.y) * k,
        w,
        h,
      };
    });
  };

  /** a teljes áramkör beillesztése a képbe */
  const fitView = () => {
    if (circuit.parts.length === 0) {
      setView({ x: 0, y: 0, w: VW, h: VW * aspect.current });
      return;
    }
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
    const pad = 80;
    const bw = maxX - minX + pad * 2;
    const bh = maxY - minY + pad * 2;
    const w = Math.max(MIN_W, Math.min(VW * 1.3, Math.max(bw, bh / aspect.current)));
    const h = w * aspect.current;
    setView({
      x: (minX + maxX) / 2 - w / 2,
      y: (minY + maxY) / 2 - h / 2,
      w,
      h,
    });
  };

  // a vászon képarányát követjük, hogy állóban is kitöltse a helyet
  useEffect(() => {
    const el = svgRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      const a = r.height / r.width;
      if (Math.abs(a - aspect.current) < 0.01) return;
      aspect.current = a;
      setView((v) => ({ ...v, h: v.w * a }));
      // álló (mobil) nézetben induláskor ráközelítünk az áramkörre
      if (!didFit.current && a > 0.9) {
        didFit.current = true;
        window.setTimeout(fitView, 0);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // görgő = nagyítás (nem passzív figyelő kell hozzá)
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = toLocal(e.clientX, e.clientY);
      zoomTo(e.deltaY > 0 ? 1.15 : 1 / 1.15, p);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** minden lenyomást követünk, hogy észrevegyük a két ujjat */
  const trackDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        view,
        mid: toLocal((a.x + b.x) / 2, (a.y + b.y) / 2),
      };
      setDrag(null);
      setWireDrag(null);
      setPanning(null);
    }
  };

  const trackUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  /** legközelebbi kivezetés a megadott ponthoz (adott sugáron belül) */
  const nearestTerminal = (x: number, y: number, exclude?: TerminalRef): { ref: TerminalRef; d: number } | null => {
    let best: { ref: TerminalRef; d: number } | null = null;
    for (const p of circuit.parts) {
      for (const t of [0, 1] as const) {
        if (exclude && exclude.partId === p.id && exclude.t === t) continue;
        if (p.kind === 'junction' && t === 1) continue;
        const pos = terminalPos(p, t);
        const d = Math.hypot(pos.x - x, pos.y - y);
        if (d < 22 && (!best || d < best.d)) best = { ref: { partId: p.id, t }, d };
      }
    }
    return best;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId)) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // két ujj: csippentéses nagyítás
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      zoomTo(pinch.current.dist / dist, pinch.current.mid, pinch.current.view);
      return;
    }

    // üres területen húzva pásztázunk
    if (panning) {
      const { x, y } = toLocal(e.clientX, e.clientY);
      setView((v) => ({
        ...v,
        x: v.x - (x - panning.x),
        y: v.y - (y - panning.y),
      }));
      return;
    }

    if (!drag && !wireDrag) return;
    const { x, y } = toLocal(e.clientX, e.clientY);
    if (drag) {
      const nx = clamp(snap(x - drag.dx), VW);
      const ny = clamp(snap(y - drag.dy), VH);
      const p = partsById.get(drag.id);
      if (p && (p.x !== nx || p.y !== ny)) {
        onMovePart(drag.id, nx, ny);
        setDrag({ ...drag, moved: true });
      }
      const free = !circuit.wires.some((w) => w.a.partId === drag.id || w.b.partId === drag.id);
      const hit = free ? hitWire(circuit, { x: nx, y: ny }, 22, drag.id) : null;
      setSpliceTarget(hit ? hit.wire.id : null);
    } else if (wireDrag) {
      const near = nearestTerminal(x, y, wireDrag.from);
      setWireDrag({
        ...wireDrag,
        x,
        y,
        overKey: near ? terminalKey(near.ref.partId, near.ref.t) : null,
      });
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    trackUp(e);
    if (panning) setPanning(null);
    if (wireDrag) {
      const { x, y } = toLocal(e.clientX, e.clientY);
      const near = nearestTerminal(x, y, wireDrag.from);
      if (near) onAddWire(wireDrag.from, near.ref);
      setWireDrag(null);
    }
    if (drag) {
      const p = partsById.get(drag.id);
      if (!drag.moved) {
        if (p?.kind === 'switch') onToggleSwitch(p.id);
        onSelect({ type: 'part', id: drag.id });
      } else if (p) {
        onPartDropped(p.id, p.x, p.y);
      }
      setDrag(null);
      setSpliceTarget(null);
    }
  };

  const startPartDrag = (e: React.PointerEvent, p: Part) => {
    e.stopPropagation();
    e.preventDefault();
    trackDown(e);
    if (pointers.current.size > 1) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const { x, y } = toLocal(e.clientX, e.clientY);
    onSelect({ type: 'part', id: p.id });
    setDrag({ id: p.id, dx: x - p.x, dy: y - p.y, moved: false });
  };

  const startWire = (e: React.PointerEvent, ref: TerminalRef) => {
    e.stopPropagation();
    e.preventDefault();
    trackDown(e);
    if (pointers.current.size > 1) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const p = partsById.get(ref.partId)!;
    const pos = terminalPos(p, ref.t);
    setWireDrag({ from: ref, x: pos.x, y: pos.y, overKey: null });
  };

  /** üres vászon: kijelölés megszüntetése + pásztázás indítása */
  const startPan = (e: React.PointerEvent) => {
    trackDown(e);
    if (pointers.current.size > 1) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    onSelect(null);
    setPanning(toLocal(e.clientX, e.clientY));
  };

  const flowColor = result.shortCircuit ? '#f87171' : '#38bdf8';

  return (
    <div
      className="canvas-wrap"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const kind = e.dataTransfer.getData('text/plain');
        if (!kind) return;
        const { x, y } = toLocal(e.clientX, e.clientY);
        onDropPart(kind, clamp(snap(x), VW), clamp(snap(y), VH));
      }}
    >
      <svg
        ref={svgRef}
        className={'canvas-svg' + (panning ? ' panning' : '')}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        role="application"
        aria-label="Áramköri vászon"
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={(e) => {
          trackUp(e);
          setDrag(null);
          setWireDrag(null);
          setPanning(null);
        }}
        onPointerDown={startPan}
      >
        <defs>
          <pattern id="grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
            <circle cx={0.5} cy={0.5} r={0.9} fill="#1d2733" />
          </pattern>
          <radialGradient id="glowGrad">
            <stop offset="0%" stopColor="#ffe07a" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#ffe07a" stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* pásztázáshoz fogható háttér + a vászon kijelölt területe */}
        <rect x={-VW} y={-VH} width={VW * 3} height={VH * 3} fill="var(--bg-soft)" />
        <rect x={0} y={0} width={VW} height={VH} fill="url(#grid)" />
        <rect
          x={0}
          y={0}
          width={VW}
          height={VH}
          fill="none"
          stroke="#1b2531"
          strokeWidth={2}
          pointerEvents="none"
        />

        {/* --- vezetékek --- */}
        <g>
          {circuit.wires.map((w) => {
            const pa = partsById.get(w.a.partId);
            const pb = partsById.get(w.b.partId);
            if (!pa || !pb) return null;
            const pts = wirePoints(terminalPos(pa, w.a.t), terminalPos(pb, w.b.t), pa, pb);
            const str = pointsToStr(pts);
            const cur = result.wireCurrent[w.id] ?? 0;
            const sel = selection?.type === 'wire' && selection.id === w.id;
            const hov = hoverWire === w.id;
            const isBurning = burning.includes(w.id);
            const mid = midPoint(pts);
            return (
              <g key={w.id}>
                <polyline
                  className={isBurning ? 'burning-line' : undefined}
                  points={str}
                  fill="none"
                  stroke={
                    w.burnt
                      ? '#5a3b34'
                      : spliceTarget === w.id
                        ? '#4ade80'
                        : sel
                          ? '#7dd3fc'
                          : hov
                            ? '#8595a8'
                            : '#54637a'
                  }
                  strokeWidth={sel || spliceTarget === w.id ? 4 : 3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={w.burnt ? '10 9' : undefined}
                  opacity={w.burnt ? 0.9 : 1}
                />
                {w.burnt && (
                  <g transform={`translate(${mid.x},${mid.y})`}>
                    <line x1={-7} y1={-7} x2={7} y2={7} stroke="#f87171" strokeWidth={2.5} strokeLinecap="round" />
                    <line x1={-7} y1={7} x2={7} y2={-7} stroke="#f87171" strokeWidth={2.5} strokeLinecap="round" />
                  </g>
                )}
                {isBurning && (
                  <g transform={`translate(${mid.x},${mid.y})`}>
                    <circle className="spark" r={12} fill="#fff0b3" />
                    <circle className="spark spark-2" r={18} fill="#f87171" />
                  </g>
                )}
                {!w.burnt && isFlowing(cur) && (
                  <polyline
                    className="flow-dots"
                    points={str}
                    fill="none"
                    stroke={flowColor}
                    strokeWidth={5}
                    style={{
                      animationDuration: `${flowDuration(cur)}s`,
                      animationDirection: cur < 0 ? 'reverse' : 'normal',
                    }}
                  />
                )}
                <polyline
                  className="wire-hit"
                  points={str}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onSelect({ type: 'wire', id: w.id });
                  }}
                  onPointerEnter={() => setHoverWire(w.id)}
                  onPointerLeave={() => setHoverWire((h) => (h === w.id ? null : h))}
                />
              </g>
            );
          })}
        </g>

        {/* --- alkatrészek --- */}
        <g>
          {circuit.parts.map((p) => {
            const res = result.parts[p.id] ?? {
              current: 0,
              voltage: 0,
              power: 0,
              brightness: 0,
              overload: false,
              stress: 0,
            };
            const sel = selection?.type === 'part' && selection.id === p.id;
            const labels = partLabels(p, res, sel);
            const vertical = !isHoriz(p);
            const def = PART_DEFS[p.kind];
            return (
              <g
                key={p.id}
                className={
                  'part-g' +
                  (drag?.id === p.id ? ' dragging' : '') +
                  (burning.includes(p.id) ? ' burning-part' : '')
                }
                transform={`translate(${p.x},${p.y})`}
                onPointerDown={(e) => startPartDrag(e, p)}
              >
                <g transform={`rotate(${p.rot})`}>
                  {sel && (
                    <rect
                      x={-46}
                      y={-30}
                      width={92}
                      height={60}
                      rx={8}
                      fill="none"
                      stroke="#2b7fa6"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                    />
                  )}
                  {/* teljes felületű fogópont: könnyű megfogni és kattintani */}
                  <rect
                    x={p.kind === 'junction' ? -13 : -42}
                    y={p.kind === 'junction' ? -13 : -26}
                    width={p.kind === 'junction' ? 26 : 84}
                    height={p.kind === 'junction' ? 26 : 52}
                    fill="transparent"
                  />
                  {p.kind !== 'junction' && isFlowing(res.current) && (
                    <line
                      className="flow-dots"
                      x1={-40}
                      y1={0}
                      x2={40}
                      y2={0}
                      stroke={flowColor}
                      strokeWidth={5}
                      style={{
                        animationDuration: `${flowDuration(res.current)}s`,
                        animationDirection: res.current < 0 ? 'reverse' : 'normal',
                      }}
                    />
                  )}
                  <PartBody part={p} result={res} selected={sel} />
                </g>

                {labels.value && (
                  <text
                    className="svg-label value"
                    x={vertical ? 32 : 0}
                    y={vertical ? 2 : 40}
                    textAnchor={vertical ? 'start' : 'middle'}
                  >
                    {labels.value}
                  </text>
                )}
                {labels.meas && (
                  <text
                    className="svg-label meas"
                    x={vertical ? 32 : 0}
                    y={vertical ? 18 : 55}
                    textAnchor={vertical ? 'start' : 'middle'}
                  >
                    {labels.meas}
                  </text>
                )}
                <title>{def.name}</title>
              </g>
            );
          })}
        </g>

        {/* --- kivezetések --- */}
        <g>
          {circuit.parts.flatMap((p) =>
            ([0, 1] as const)
              .filter((t) => !(p.kind === 'junction' && t === 1))
              .map((t) => {
                const pos = terminalPos(p, t);
                const key = terminalKey(p.id, t);
                const active = wireDrag?.overKey === key;
                const isSource = wireDrag?.from.partId === p.id && wireDrag?.from.t === t;
                return (
                  <g key={key}>
                    {/*
                      Nagyobb, láthatatlan fogófelület a vezetékhúzáshoz.
                      Az elágazásnál gyűrű alakú, hogy a közepénél fogva
                      magát a csomópontot lehessen arrébb húzni.
                    */}
                    {p.kind === 'junction' ? (
                      <path
                        className="terminal"
                        d={donut(pos.x, pos.y, 20, 11)}
                        fillRule="evenodd"
                        fill="transparent"
                        onPointerDown={(e) => startWire(e, { partId: p.id, t })}
                      />
                    ) : (
                      <circle
                        className="terminal"
                        cx={pos.x}
                        cy={pos.y}
                        r={14}
                        fill="transparent"
                        onPointerDown={(e) => startWire(e, { partId: p.id, t })}
                      />
                    )}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={active || isSource ? 8 : 5}
                      fill={active ? '#38bdf8' : isSource ? '#7dd3fc' : '#0f1720'}
                      stroke={active || isSource ? '#7dd3fc' : '#5b6b80'}
                      strokeWidth={2}
                      pointerEvents="none"
                    />
                  </g>
                );
              })
          )}
        </g>

        {/* --- éppen húzott vezeték --- */}
        {wireDrag && (
          <line
            x1={terminalPos(partsById.get(wireDrag.from.partId)!, wireDrag.from.t).x}
            y1={terminalPos(partsById.get(wireDrag.from.partId)!, wireDrag.from.t).y}
            x2={wireDrag.x}
            y2={wireDrag.y}
            stroke="#38bdf8"
            strokeWidth={2.5}
            strokeDasharray="6 5"
            pointerEvents="none"
          />
        )}
      </svg>

      <div className="zoom-controls">
        <button type="button" onClick={() => zoomTo(1 / 1.3)} aria-label="Nagyítás" title="Nagyítás">
          +
        </button>
        <button type="button" onClick={() => zoomTo(1.3)} aria-label="Kicsinyítés" title="Kicsinyítés">
          −
        </button>
        <button type="button" onClick={fitView} aria-label="Teljes kép" title="Teljes áramkör">
          ⤢
        </button>
      </div>

      {result.warning ? (
        <div className="canvas-banner">{result.warning}</div>
      ) : circuit.parts.length === 0 ? (
        <div className="canvas-banner info">
          Húzz ide alkatrészeket a bal oldali listából, vagy tölts be egy minta-áramkört.
        </div>
      ) : null}
    </div>
  );
}
