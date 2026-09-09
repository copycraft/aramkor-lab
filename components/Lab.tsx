'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Circuit, PartKind, TerminalRef, Wire } from '@/lib/types';
import { makePart, snap } from '@/lib/parts';
import { hitWire } from '@/lib/geometry';
import { solveCircuit } from '@/lib/solver';
import { PRESETS, clonePreset } from '@/lib/presets';
import CircuitCanvas, { VW, VH, type Selection } from './CircuitCanvas';
import Palette from './Palette';
import Inspector from './Inspector';

function makeInitial() {
  let n = 0;
  const gen = (prefix: string) => prefix + ++n;
  return { circuit: clonePreset(PRESETS[0], gen), n };
}

export default function Lab() {
  const initial = useRef<{ circuit: Circuit; n: number } | null>(null);
  if (!initial.current) initial.current = makeInitial();

  const [circuit, setCircuit] = useState<Circuit>(initial.current.circuit);
  const [selection, setSelection] = useState<Selection>(null);
  const [activePreset, setActivePreset] = useState<string | null>(PRESETS[0].id);
  /** az utoljára betöltött minta – akkor is visszaállítható, ha közben átalakítottad */
  const [lastPreset, setLastPreset] = useState<string | null>(PRESETS[0].id);
  const [burning, setBurning] = useState<string[]>([]);
  const uid = useRef(initial.current.n);
  const burnTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const nextId = useCallback((prefix: string) => prefix + ++uid.current, []);
  const result = useMemo(() => solveCircuit(circuit), [circuit]);

  const dirty = useCallback(() => setActivePreset(null), []);

  /** szabad hely keresése új alkatrésznek */
  const freeSpot = useCallback(
    (c: Circuit) => {
      const taken = (x: number, y: number) => c.parts.some((p) => Math.abs(p.x - x) < 100 && Math.abs(p.y - y) < 60);
      for (let y = 120; y <= VH - 120; y += 100) {
        for (let x = 160; x <= VW - 160; x += 120) {
          if (!taken(x, y)) return { x: snap(x), y: snap(y) };
        }
      }
      return { x: 600, y: 400 };
    },
    []
  );

  /**
   * Alkatrész beékelése egy meglévő vezetékbe: a vezeték helyére két új
   * vezeték kerül, így nem kell törölni és újrahúzni.
   */
  const spliceInto = useCallback(
    (c: Circuit, wireId: string, partId: string): Circuit => {
      const w = c.wires.find((x) => x.id === wireId);
      if (!w) return c;
      return {
        parts: c.parts,
        wires: [
          ...c.wires.filter((x) => x.id !== wireId),
          { id: nextId('w'), a: w.a, b: { partId, t: 0 } },
          { id: nextId('w'), a: { partId, t: 1 }, b: w.b },
        ],
      };
    },
    [nextId]
  );

  const addPart = useCallback(
    (kind: PartKind, at?: { x: number; y: number }) => {
      const id = nextId('p');
      setCircuit((c) => {
        // vezetékre ejtve: illesszük a vonalba, a vonal irányába forgatva
        const hit = at ? hitWire(c, at) : null;
        if (at && hit) {
          const pos = hit.horizontal
            ? { x: snap(hit.point.x), y: hit.point.y }
            : { x: hit.point.x, y: snap(hit.point.y) };
          const part = makePart(kind, pos.x, pos.y, id);
          part.rot = hit.horizontal ? 0 : 90;
          return spliceInto({ ...c, parts: [...c.parts, part] }, hit.wire.id, id);
        }
        const pos = at ?? freeSpot(c);
        return { ...c, parts: [...c.parts, makePart(kind, pos.x, pos.y, id)] };
      });
      setSelection({ type: 'part', id });
      dirty();
    },
    [dirty, freeSpot, nextId, spliceInto]
  );

  /** meglévő, még be nem kötött alkatrész ejtése egy vezetékre */
  const partDropped = useCallback(
    (id: string, x: number, y: number) => {
      setCircuit((c) => {
        const free = !c.wires.some((w) => w.a.partId === id || w.b.partId === id);
        if (!free) return c;
        const hit = hitWire(c, { x, y }, 24, id);
        if (!hit) return c;
        const parts = c.parts.map((p) =>
          p.id === id
            ? {
                ...p,
                rot: p.kind === 'junction' ? p.rot : hit.horizontal ? 0 : 90,
                x: hit.horizontal ? snap(hit.point.x) : hit.point.x,
                y: hit.horizontal ? hit.point.y : snap(hit.point.y),
              }
            : p
        );
        return spliceInto({ ...c, parts }, hit.wire.id, id);
      });
      dirty();
    },
    [dirty, spliceInto]
  );

  const movePart = useCallback((id: string, x: number, y: number) => {
    setCircuit((c) => ({ ...c, parts: c.parts.map((p) => (p.id === id ? { ...p, x, y } : p)) }));
  }, []);

  const setValue = useCallback(
    (id: string, v: number) => {
      setCircuit((c) => ({ ...c, parts: c.parts.map((p) => (p.id === id ? { ...p, value: v } : p)) }));
      dirty();
    },
    [dirty]
  );

  const setWiper = useCallback((id: string, w: number) => {
    setCircuit((c) => ({ ...c, parts: c.parts.map((p) => (p.id === id ? { ...p, wiper: w } : p)) }));
  }, []);

  const toggleSwitch = useCallback((id: string) => {
    setCircuit((c) => ({ ...c, parts: c.parts.map((p) => (p.id === id ? { ...p, closed: !p.closed } : p)) }));
  }, []);

  const rotate = useCallback(
    (id: string) => {
      setCircuit((c) => ({
        ...c,
        parts: c.parts.map((p) => (p.id === id ? { ...p, rot: (p.rot + 90) % 360 } : p)),
      }));
      dirty();
    },
    [dirty]
  );

  const addWire = useCallback(
    (a: TerminalRef, b: TerminalRef) => {
      if (a.partId === b.partId && a.t === b.t) return;
      setCircuit((c) => {
        const exists = c.wires.some(
          (w) =>
            (w.a.partId === a.partId && w.a.t === a.t && w.b.partId === b.partId && w.b.t === b.t) ||
            (w.a.partId === b.partId && w.a.t === b.t && w.b.partId === a.partId && w.b.t === a.t)
        );
        if (exists) return c;
        return { ...c, wires: [...c.wires, { id: nextId('w'), a, b }] };
      });
      dirty();
    },
    [dirty, nextId]
  );

  const deleteSelection = useCallback(() => {
    if (!selection) return;
    setCircuit((c) => {
      if (selection.type === 'wire') {
        return { ...c, wires: c.wires.filter((w) => w.id !== selection.id) };
      }

      const id = selection.id;
      const attached = c.wires.filter((w) => w.a.partId === id || w.b.partId === id);
      const rest = c.wires.filter((w) => w.a.partId !== id && w.b.partId !== id);

      // ha az alkatrész két vezeték között ült, a hézagot egyetlen vezeték zárja be
      if (attached.length === 2) {
        const farEnd = (w: Wire) => (w.a.partId === id ? w.b : w.a);
        const e1 = farEnd(attached[0]);
        const e2 = farEnd(attached[1]);
        const sameEnd = e1.partId === e2.partId && e1.t === e2.t;
        if (!sameEnd) {
          rest.push({
            id: nextId('w'),
            a: e1,
            b: e2,
            ...(attached[0].burnt || attached[1].burnt ? { burnt: true } : {}),
          });
        }
      }

      return { parts: c.parts.filter((p) => p.id !== id), wires: rest };
    });
    setSelection(null);
    dirty();
  }, [dirty, nextId, selection]);

  /** egy kiégett elem cseréje */
  const repair = useCallback((id: string) => {
    setCircuit((c) => ({
      parts: c.parts.map((p) => (p.id === id && p.burnt ? { ...p, burnt: false } : p)),
      wires: c.wires.map((w) => (w.id === id && w.burnt ? { ...w, burnt: false } : w)),
    }));
  }, []);

  const repairAll = useCallback(() => {
    setCircuit((c) => ({
      parts: c.parts.map((p) => (p.burnt ? { ...p, burnt: false } : p)),
      wires: c.wires.map((w) => (w.burnt ? { ...w, burnt: false } : w)),
    }));
  }, []);

  // --- túlterhelés: előbb felvillan, aztán kiég / elszakad
  useEffect(() => {
    for (const id of result.doomed) {
      if (burnTimers.current[id]) continue;
      burnTimers.current[id] = setTimeout(() => {
        delete burnTimers.current[id];
        setBurning((b) => b.filter((x) => x !== id));
        setCircuit((c) => ({
          parts: c.parts.map((p) => (p.id === id ? { ...p, burnt: true } : p)),
          wires: c.wires.map((w) => (w.id === id ? { ...w, burnt: true } : w)),
        }));
      }, 900);
    }
    setBurning((b) => {
      const add = result.doomed.filter((id) => !b.includes(id));
      return add.length ? [...b, ...add] : b;
    });
  }, [result]);

  useEffect(() => {
    const timers = burnTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const hasBurnt = circuit.wires.some((w) => w.burnt) || circuit.parts.some((p) => p.burnt);

  const stopBurning = useCallback(() => {
    Object.values(burnTimers.current).forEach(clearTimeout);
    burnTimers.current = {};
    setBurning([]);
  }, []);

  const clearAll = useCallback(() => {
    stopBurning();
    setCircuit({ parts: [], wires: [] });
    setSelection(null);
    setActivePreset(null);
    setLastPreset(null);
  }, [stopBurning]);

  const loadPreset = useCallback(
    (id: string) => {
      const preset = PRESETS.find((p) => p.id === id);
      if (!preset) return;
      stopBurning();
      setCircuit(clonePreset(preset, nextId));
      setSelection(null);
      setActivePreset(id);
      setLastPreset(id);
    },
    [nextId, stopBurning]
  );

  // --- a választóoldalról érkező minta betöltése (/labor/?kor=…)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('kor');
    if (!id) return;
    if (id === 'ures') clearAll();
    else if (PRESETS.some((p) => p.id === id)) loadPreset(id);
  }, [clearAll, loadPreset]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection) {
          e.preventDefault();
          deleteSelection();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (selection?.type === 'part') rotate(selection.id);
      } else if (e.key === 'Escape') {
        setSelection(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleteSelection, rotate, selection]);

  const preset = PRESETS.find((p) => p.id === activePreset);

  return (
    <div className="lab">
      <div className="col-palette">
        <Palette onAdd={(k) => addPart(k)} />

        <div className="panel">
          <div className="panel-head">
            <h2>Minta-áramkörök</h2>
          </div>
          <div className="preset-list">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={'preset-item' + (activePreset === p.id ? ' on' : '')}
                onClick={() => loadPreset(p.id)}
              >
                <span className="p-name">{p.name}</span>
                <br />
                <span className="p-sub">{p.summary}</span>
              </button>
            ))}
          </div>
          {preset && <div className="task-note">{preset.task}</div>}
        </div>
      </div>

      <div className="col-canvas">
        <div className="canvas-col">
          <div className="canvas-toolbar">
            <button
              type="button"
              className="tool-btn"
              disabled={selection?.type !== 'part'}
              onClick={() => selection?.type === 'part' && rotate(selection.id)}
            >
              Forgatás
            </button>
            <button type="button" className="tool-btn danger" disabled={!selection} onClick={deleteSelection}>
              Kijelölt törlése
            </button>
            <span className="tool-sep" />
            <button
              type="button"
              className="tool-btn"
              onClick={() => lastPreset && loadPreset(lastPreset)}
              disabled={!lastPreset}
            >
              Minta visszaállítása
            </button>
            <button type="button" className="tool-btn danger" onClick={clearAll} disabled={circuit.parts.length === 0}>
              Vászon ürítése
            </button>
            {hasBurnt && (
              <button type="button" className="tool-btn warn" onClick={repairAll}>
                Hibás elemek cseréje
              </button>
            )}
            <span className="tool-status">
              <span className={'dot' + (result.shortCircuit ? ' bad' : result.flowing ? ' live' : '')} />
              {result.shortCircuit ? 'rövidzár' : result.flowing ? 'áram folyik' : 'nincs áram'}
            </span>
          </div>

          <CircuitCanvas
            circuit={circuit}
            result={result}
            selection={selection}
            onSelect={setSelection}
            onMovePart={movePart}
            onAddWire={addWire}
            onToggleSwitch={toggleSwitch}
            onDropPart={(kind, x, y) => addPart(kind as PartKind, { x, y })}
            onPartDropped={partDropped}
            burning={burning}
          />
        </div>
      </div>

      <Inspector
        circuit={circuit}
        result={result}
        selection={selection}
        onValue={setValue}
        onWiper={setWiper}
        onToggleSwitch={toggleSwitch}
        onRotate={rotate}
        onDelete={deleteSelection}
        onRepair={repair}
      />
    </div>
  );
}
