import React from 'react';
import { RotateCcw, Plus, X } from 'lucide-react';
import { PARTICLE_PRESETS } from '../data/presets';
import {
  BlendMode,
  ColorMode,
  EmissionMode,
  EmitterShape,
  ParticleConfig,
  ParticleShape,
} from '../types/particle';

interface ControlsPanelProps {
  config: ParticleConfig;
  activePresetId: string | null;
  onSelectPreset: (presetId: string) => void;
  onChange: (patch: Partial<ParticleConfig>) => void;
  onReset: () => void;
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (val: number) => void;
}

const SliderRow: React.FC<SliderRowProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  onChange,
}) => {
  const displayValue = step < 1 ? value.toFixed(step < 0.05 ? 3 : 2).replace(/\.?0+$/, '') : Math.round(value);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <label className="text-slate-300 font-medium">{label}</label>
        <span className="font-mono text-slate-400 tabular-nums">
          {displayValue}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="studio-slider"
      />
    </div>
  );
};

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  config,
  activePresetId,
  onSelectPreset,
  onChange,
  onReset,
}) => {
  const handlePaletteColorChange = (index: number, hex: string) => {
    const next = [...config.palette];
    next[index] = hex;
    onChange({ palette: next });
  };

  const handleAddPaletteColor = () => {
    if (config.palette.length >= 8) return;
    onChange({ palette: [...config.palette, '#38BDF8'] });
  };

  const handleRemovePaletteColor = (index: number) => {
    if (config.palette.length <= 2) return;
    onChange({ palette: config.palette.filter((_, idx) => idx !== index) });
  };

  return (
    <aside className="w-full lg:w-[320px] xl:w-[340px] shrink-0 bg-[#121722] border-r border-white/[0.08] flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] shrink-0">
        <h2 className="font-display text-sm font-semibold text-slate-100">Parameters</h2>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto studio-scroll divide-y divide-white/[0.07]">
        {/* Presets */}
        <section className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-200">Presets</h3>
            <span className="text-[11px] text-slate-500">8 effects</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {PARTICLE_PRESETS.map((preset) => {
              const active = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset.id)}
                  className={`px-2.5 py-2 rounded-lg text-left transition-colors border whitespace-nowrap truncate ${
                    active
                      ? 'bg-amber-500/15 border-amber-500/60 text-amber-200'
                      : 'bg-[#171D2B] border-white/[0.06] text-slate-300 hover:border-white/15 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-medium truncate">{preset.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{preset.category}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Emitter */}
        <section className="p-4 space-y-4">
          <h3 className="text-xs font-semibold text-slate-200">Emitter</h3>

          <div className="space-y-1.5">
            <span className="block text-xs text-slate-300 font-medium">Emission Mode</span>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#0B0E14] border border-white/[0.06]">
              {(
                [
                  { id: 'continuous', label: 'Continuous' },
                  { id: 'burst', label: 'Burst' },
                ] as { id: EmissionMode; label: string }[]
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onChange({ emissionMode: m.id })}
                  className={`py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    config.emissionMode === m.id
                      ? 'bg-[#1E2638] text-amber-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {config.emissionMode === 'continuous' ? (
            <SliderRow
              label="Spawn Rate"
              value={config.rate}
              min={5}
              max={250}
              step={1}
              unit="/s"
              onChange={(v) => onChange({ rate: v })}
            />
          ) : null}

          <SliderRow
            label="Burst Count"
            value={config.burstCount}
            min={5}
            max={200}
            step={1}
            onChange={(v) => onChange({ burstCount: v })}
          />

          <div className="space-y-1.5">
            <span className="block text-xs text-slate-300 font-medium">Emitter Geometry</span>
            <div className="grid grid-cols-5 gap-1 p-1 rounded-lg bg-[#0B0E14] border border-white/[0.06]">
              {(
                [
                  { id: 'point', label: 'Point' },
                  { id: 'circle', label: 'Circle' },
                  { id: 'ring', label: 'Ring' },
                  { id: 'line', label: 'Line' },
                  { id: 'box', label: 'Box' },
                ] as { id: EmitterShape; label: string }[]
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange({ emitterShape: item.id })}
                  className={`py-1.5 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                    config.emitterShape === item.id
                      ? 'bg-[#1E2638] text-amber-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {config.emitterShape !== 'point' && (
            <SliderRow
              label={config.emitterShape === 'line' ? 'Emitter Half-Width' : 'Emitter Radius'}
              value={config.emitterRadius}
              min={4}
              max={300}
              step={2}
              unit="px"
              onChange={(v) => onChange({ emitterRadius: v })}
            />
          )}

          <SliderRow
            label="Direction Angle"
            value={config.angle}
            min={-180}
            max={180}
            step={1}
            unit="°"
            onChange={(v) => onChange({ angle: v })}
          />

          <SliderRow
            label="Spread Cone"
            value={config.spread}
            min={0}
            max={360}
            step={1}
            unit="°"
            onChange={(v) => onChange({ spread: v })}
          />
        </section>

        {/* Physics */}
        <section className="p-4 space-y-4">
          <h3 className="text-xs font-semibold text-slate-200">Motion & Physics</h3>

          <SliderRow
            label="Min Speed"
            value={config.speedMin}
            min={0}
            max={700}
            step={5}
            unit="px/s"
            onChange={(v) => onChange({ speedMin: v, speedMax: Math.max(v, config.speedMax) })}
          />

          <SliderRow
            label="Max Speed"
            value={config.speedMax}
            min={0}
            max={800}
            step={5}
            unit="px/s"
            onChange={(v) => onChange({ speedMax: v, speedMin: Math.min(v, config.speedMin) })}
          />

          <SliderRow
            label="Min Lifetime"
            value={config.lifeMin}
            min={0.1}
            max={4}
            step={0.05}
            unit="s"
            onChange={(v) => onChange({ lifeMin: v, lifeMax: Math.max(v, config.lifeMax) })}
          />

          <SliderRow
            label="Max Lifetime"
            value={config.lifeMax}
            min={0.1}
            max={5}
            step={0.05}
            unit="s"
            onChange={(v) => onChange({ lifeMax: v, lifeMin: Math.min(v, config.lifeMin) })}
          />

          <SliderRow
            label="Gravity Y"
            value={config.gravityY}
            min={-800}
            max={1200}
            step={10}
            onChange={(v) => onChange({ gravityY: v })}
          />

          <SliderRow
            label="Gravity X (Wind)"
            value={config.gravityX}
            min={-600}
            max={600}
            step={10}
            onChange={(v) => onChange({ gravityX: v })}
          />

          <SliderRow
            label="Air Drag"
            value={config.drag}
            min={0}
            max={0.2}
            step={0.005}
            onChange={(v) => onChange({ drag: v })}
          />

          <SliderRow
            label="Turbulence"
            value={config.turbulence}
            min={0}
            max={300}
            step={5}
            onChange={(v) => onChange({ turbulence: v })}
          />

          <SliderRow
            label="Spin Speed"
            value={config.rotationSpeed}
            min={0}
            max={540}
            step={10}
            unit="°/s"
            onChange={(v) => onChange({ rotationSpeed: v })}
          />
        </section>

        {/* Appearance & Color */}
        <section className="p-4 space-y-4">
          <h3 className="text-xs font-semibold text-slate-200">Appearance & Color</h3>

          <div className="space-y-1.5">
            <span className="block text-xs text-slate-300 font-medium">Particle Shape</span>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#0B0E14] border border-white/[0.06]">
              {(
                [
                  { id: 'circle', label: 'Circle' },
                  { id: 'spark', label: 'Spark' },
                  { id: 'square', label: 'Square' },
                  { id: 'ring', label: 'Ring' },
                  { id: 'star', label: 'Star' },
                  { id: 'triangle', label: 'Triangle' },
                ] as { id: ParticleShape; label: string }[]
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onChange({ shape: s.id })}
                  className={`py-1.5 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                    config.shape === s.id
                      ? 'bg-[#1E2638] text-amber-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="block text-xs text-slate-300 font-medium">Blend Mode</span>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#0B0E14] border border-white/[0.06]">
              {(
                [
                  { id: 'source-over', label: 'Normal' },
                  { id: 'lighter', label: 'Additive Glow' },
                ] as { id: BlendMode; label: string }[]
              ).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onChange({ blendMode: b.id })}
                  className={`py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    config.blendMode === b.id
                      ? 'bg-[#1E2638] text-amber-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <SliderRow
            label="Start Size"
            value={config.sizeStart}
            min={1}
            max={40}
            step={0.5}
            unit="px"
            onChange={(v) => onChange({ sizeStart: v })}
          />

          <SliderRow
            label="End Size"
            value={config.sizeEnd}
            min={0}
            max={50}
            step={0.5}
            unit="px"
            onChange={(v) => onChange({ sizeEnd: v })}
          />

          <SliderRow
            label="Size Variance"
            value={config.sizeVariance}
            min={0}
            max={0.8}
            step={0.05}
            onChange={(v) => onChange({ sizeVariance: v })}
          />

          <SliderRow
            label="Start Opacity"
            value={config.opacityStart}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => onChange({ opacityStart: v })}
          />

          <SliderRow
            label="End Opacity"
            value={config.opacityEnd}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => onChange({ opacityEnd: v })}
          />

          <div className="space-y-2">
            <span className="block text-xs text-slate-300 font-medium">Color Mode</span>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#0B0E14] border border-white/[0.06]">
              {(
                [
                  { id: 'gradient', label: 'Lifetime Ramp' },
                  { id: 'palette', label: 'Random Palette' },
                ] as { id: ColorMode; label: string }[]
              ).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onChange({ colorMode: c.id })}
                  className={`py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    config.colorMode === c.id
                      ? 'bg-[#1E2638] text-amber-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {config.colorMode === 'gradient' ? (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {(
                  [
                    { key: 'colorStart', label: 'Start' },
                    { key: 'colorMid', label: 'Mid' },
                    { key: 'colorEnd', label: 'End' },
                  ] as const
                ).map(({ key, label }) => (
                  <label key={key} className="block space-y-1 cursor-pointer">
                    <span className="block text-[11px] text-slate-400">{label}</span>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#0B0E14] border border-white/[0.08]">
                      <input
                        type="color"
                        value={config[key]}
                        onChange={(e) => onChange({ [key]: e.target.value })}
                        className="w-4 h-4 rounded border-0 bg-transparent p-0 cursor-pointer"
                      />
                      <span className="font-mono text-[11px] text-slate-300 uppercase truncate">
                        {config[key]}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {config.palette.map((hex, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md bg-[#0B0E14] border border-white/[0.08]"
                    >
                      <input
                        type="color"
                        value={hex}
                        onChange={(e) => handlePaletteColorChange(idx, e.target.value)}
                        className="w-4 h-4 rounded border-0 bg-transparent p-0 cursor-pointer"
                        aria-label={`Palette color ${idx + 1}`}
                      />
                      {config.palette.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePaletteColor(idx)}
                          className="text-slate-500 hover:text-slate-200"
                          aria-label={`Remove color ${idx + 1}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {config.palette.length < 8 && (
                    <button
                      type="button"
                      onClick={handleAddPaletteColor}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#0B0E14] border border-dashed border-white/20 text-xs text-slate-400 hover:text-white hover:border-white/40 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </aside>
  );
};
