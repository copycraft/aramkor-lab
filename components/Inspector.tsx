'use client';

import type { Circuit, Part, SolveResult } from '@/lib/types';
import { PART_DEFS, fmt, hu } from '@/lib/parts';
import { partResistance } from '@/lib/solver';
import type { Selection } from './CircuitCanvas';

interface Props {
  circuit: Circuit;
  result: SolveResult;
  selection: Selection;
  onValue: (id: string, v: number) => void;
  onWiper: (id: string, w: number) => void;
  onToggleSwitch: (id: string) => void;
  onRotate: (id: string) => void;
  onDelete: () => void;
  onRepair: (id: string) => void;
}

function Readout({ k, v, accent, wide }: { k: string; v: string; accent?: boolean; wide?: boolean }) {
  return (
    <div className={'readout' + (wide ? ' wide' : '')}>
      <div className="r-key">{k}</div>
      <div className={'r-val' + (accent ? ' accent' : '')}>{v}</div>
    </div>
  );
}

function PartEditor({ part, result, onValue, onWiper, onToggleSwitch, onRotate, onDelete, onRepair }: {
  part: Part;
  result: SolveResult;
  onValue: Props['onValue'];
  onWiper: Props['onWiper'];
  onToggleSwitch: Props['onToggleSwitch'];
  onRotate: Props['onRotate'];
  onDelete: Props['onDelete'];
  onRepair: Props['onRepair'];
}) {
  const def = PART_DEFS[part.kind];
  const res = result.parts[part.id] ?? {
    current: 0, voltage: 0, power: 0, brightness: 0, overload: false, stress: 0,
  };
  const R = partResistance(part);

  return (
    <>
      <div className="selected-head">
        <span className="swatch" style={{ background: part.burnt ? '#5a3b34' : def.color }} />
        <span>
          <span className="sh-name">{def.name}</span>
          <br />
          <span className="sh-kind">{part.burnt ? 'kiégett' : part.id}</span>
        </span>
      </div>

      {part.burnt && (
        <div className="field">
          <p className="burnt-note">
            Ez az izzó kiégett a túl nagy feszültségtől, ezért nem folyik rajta áram.
          </p>
          <button type="button" className="toggle-btn warn" onClick={() => onRepair(part.id)}>
            Új izzót teszek bele
          </button>
        </div>
      )}

      {part.kind === 'switch' && (
        <div className="field">
          <button
            type="button"
            className={'toggle-btn' + (part.closed ? ' on' : '')}
            onClick={() => onToggleSwitch(part.id)}
          >
            {part.closed ? 'Zárt — az áram folyhat' : 'Nyitott — szakadt a kör'}
          </button>
        </div>
      )}

      {def.param && (
        <div className="field">
          <div className="field-label">
            <span>{def.param.label}</span>
            <b>
              {hu(part.value, part.value % 1 === 0 ? 0 : 1)} {def.param.unit}
            </b>
          </div>
          <input
            type="range"
            min={def.param.min}
            max={def.param.max}
            step={def.param.step}
            value={part.value}
            onChange={(e) => onValue(part.id, Number(e.target.value))}
          />
          {def.param.presets && (
            <div className="chips">
              {def.param.presets.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={'chip' + (part.value === v ? ' on' : '')}
                  onClick={() => onValue(part.id, v)}
                >
                  {hu(v, v % 1 === 0 ? 0 : 1)} {def.param!.unit}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {part.kind === 'potentiometer' && (
        <div className="field">
          <div className="field-label">
            <span>Csúszka állása</span>
            <b>{hu((part.wiper ?? 0.5) * 100, 0)} %</b>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round((part.wiper ?? 0.5) * 100)}
            onChange={(e) => onWiper(part.id, Number(e.target.value) / 100)}
          />
        </div>
      )}

      <div className="readouts">
        <Readout k="Feszültség (U)" v={fmt(Math.abs(res.voltage), 'V', 2)} accent />
        <Readout k="Áramerősség (I)" v={fmt(Math.abs(res.current), 'A', 2)} accent />
        {part.kind === 'switch' ? (
          <Readout k="Ellenállás (R)" v={part.closed ? '≈ 0 Ω' : '∞ (szakadás)'} />
        ) : part.kind !== 'battery' && part.kind !== 'junction' ? (
          <Readout k="Ellenállás (R)" v={fmt(R, 'Ω', R >= 100 ? 0 : 1)} />
        ) : null}
        <Readout k="Teljesítmény (P)" v={fmt(res.power, 'W', 2)} />
        {part.kind === 'lamp' && (
          <Readout
            k="Fényerő"
            v={hu(res.brightness * 100, 0) + ' %' + (res.overload ? ' — túlterhelt!' : '')}
            wide
          />
        )}
      </div>

      <div className="btn-row">
        <button type="button" className="tool-btn" onClick={() => onRotate(part.id)}>
          Forgatás (R)
        </button>
        <button type="button" className="tool-btn danger" onClick={onDelete}>
          Törlés
        </button>
      </div>
    </>
  );
}

export default function Inspector(props: Props) {
  const { circuit, result, selection, onDelete } = props;
  const selectedPart =
    selection?.type === 'part' ? circuit.parts.find((p) => p.id === selection.id) : undefined;
  const selectedWire =
    selection?.type === 'wire' ? circuit.wires.find((w) => w.id === selection.id) : undefined;

  // --- áramkör-összegzés
  const batteries = circuit.parts.filter((p) => p.kind === 'battery');
  const uTotal = batteries.reduce((s, b) => s + Math.abs(result.parts[b.id]?.voltage ?? 0), 0);
  const iTotal = batteries.reduce((s, b) => s + Math.abs(result.parts[b.id]?.current ?? 0), 0);
  const pTotal = circuit.parts
    .filter((p) => p.kind !== 'battery')
    .reduce((s, p) => s + (result.parts[p.id]?.power ?? 0), 0);
  const rTotal = iTotal > 1e-6 ? uTotal / iTotal : 0;

  const state = result.shortCircuit
    ? 'rövidzár'
    : result.flowing
      ? 'zárt kör — folyik az áram'
      : 'nincs áram';

  return (
    <div className="col-inspector">
      <div className="panel">
        <div className="panel-head">
          <h2>Kijelölt elem</h2>
        </div>
        <div className="panel-body">
          {selectedPart ? (
            <PartEditor
              part={selectedPart}
              result={result}
              onValue={props.onValue}
              onWiper={props.onWiper}
              onToggleSwitch={props.onToggleSwitch}
              onRotate={props.onRotate}
              onDelete={onDelete}
              onRepair={props.onRepair}
            />
          ) : selection?.type === 'wire' ? (
            <>
              <div className="selected-head">
                <span className="swatch" style={{ background: selectedWire?.burnt ? '#5a3b34' : '#54637a' }} />
                <span>
                  <span className="sh-name">Vezeték</span>
                  <br />
                  <span className="sh-kind">{selectedWire?.burnt ? 'elszakadt' : selection.id}</span>
                </span>
              </div>
              {selectedWire?.burnt && (
                <div className="field">
                  <p className="burnt-note">
                    A rövidzár miatt akkora áram folyt itt, hogy a vezeték elszakadt.
                  </p>
                  <button type="button" className="toggle-btn warn" onClick={() => props.onRepair(selection.id)}>
                    Új vezetéket kötök be
                  </button>
                </div>
              )}
              <div className="readouts">
                <Readout
                  k="Áramerősség"
                  v={fmt(Math.abs(result.wireCurrent[selection.id] ?? 0), 'A', 2)}
                  accent
                  wide
                />
              </div>
              <div className="btn-row">
                <button type="button" className="tool-btn danger" onClick={onDelete}>
                  Vezeték törlése
                </button>
              </div>
            </>
          ) : (
            <p className="empty-note">
              Kattints egy alkatrészre vagy vezetékre a beállításaihoz. A kapcsolót a vásznon egyetlen kattintással
              nyithatod és zárhatod.
            </p>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Az áramkör egészében</h2>
        </div>
        <div className="panel-body">
          <div className="readouts">
            <Readout k="Állapot" v={state} wide accent={result.flowing && !result.shortCircuit} />
            <Readout k="Telep (U)" v={fmt(uTotal, 'V', 1)} />
            <Readout k="Főági áram (I)" v={fmt(iTotal, 'A', 2)} />
            <Readout k="Eredő ellenállás" v={rTotal > 0 ? fmt(rTotal, 'Ω', rTotal >= 100 ? 0 : 1) : '—'} />
            <Readout k="Összteljesítmény" v={fmt(pTotal, 'W', 2)} />
          </div>
        </div>
      </div>
    </div>
  );
}
