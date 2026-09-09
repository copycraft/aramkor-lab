'use client';

import type { PartKind, Part, PartResult } from '@/lib/types';
import { PALETTE_ORDER, PART_DEFS } from '@/lib/parts';
import { PartBody } from './PartShape';

const previewResult: PartResult = {
  current: 0,
  voltage: 0,
  power: 0,
  brightness: 0.85,
  overload: false,
  stress: 0,
};

function preview(kind: PartKind): Part {
  return {
    id: 'preview-' + kind,
    kind,
    x: 0,
    y: 0,
    rot: 0,
    value: PART_DEFS[kind].defaultValue,
    closed: true,
    wiper: 0.6,
  };
}

export default function Palette({ onAdd }: { onAdd: (kind: PartKind) => void }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Alkatrészek</h2>
      </div>
      <div className="palette-list">
        {PALETTE_ORDER.map((kind) => {
          const def = PART_DEFS[kind];
          return (
            <button
              key={kind}
              type="button"
              className="palette-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', kind);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => onAdd(kind)}
              title={def.hint}
            >
              <span className="palette-icon">
                <svg width={42} height={28} viewBox="-52 -34 104 68" aria-hidden="true">
                  <PartBody part={preview(kind)} result={previewResult} selected={false} />
                </svg>
              </span>
              <span>
                <span className="pi-name">{def.name}</span>
                <br />
                <span className="pi-sub">{def.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="palette-hint">
        <b>Vezeték:</b> fogd meg az egyik alkatrész kék csatlakozási pontját, és húzd rá egy másikra. A vezeték
        törléséhez kattints rá, majd nyomd meg a Delete gombot.
      </div>
    </div>
  );
}
