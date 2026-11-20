import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { CodeOutputPanel } from './components/CodeOutputPanel';
import { ControlsPanel } from './components/ControlsPanel';
import { ParticleCanvas, ParticleCanvasHandle } from './components/ParticleCanvas';
import { SandboxModal } from './components/SandboxModal';
import { PARTICLE_PRESETS } from './data/presets';
import {
  CanvasBackground,
  CodeOutputFormat,
  InteractionMode,
  ParticleConfig,
} from './types/particle';
import { generateJavaScriptCode } from './utils/codeGenerator';

type MobilePane = 'canvas' | 'controls' | 'code';

async function copyTextSafe(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back to textarea selection inside sandboxed iframes
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function App() {
  const initialPreset = PARTICLE_PRESETS[0];

  const [activePresetId, setActivePresetId] = useState<string | null>(initialPreset.id);
  const [config, setConfig] = useState<ParticleConfig>(() => ({ ...initialPreset.config }));
  const [background, setBackground] = useState<CanvasBackground>('obsidian');
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('cursor');

  const [format, setFormat] = useState<CodeOutputFormat>('class');
  const [includeDemoLoop, setIncludeDemoLoop] = useState(true);
  const [compact, setCompact] = useState(false);

  const [copied, setCopied] = useState(false);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<MobilePane>('canvas');

  const canvasRef = useRef<ParticleCanvasHandle>(null);
  const copyTimerRef = useRef<number | null>(null);

  const generatedCode = useMemo(
    () => generateJavaScriptCode(config, format, includeDemoLoop, background, compact),
    [config, format, includeDemoLoop, background, compact]
  );

  const sandboxHtml = useMemo(
    () => generateJavaScriptCode(config, 'html', true, background, false),
    [config, background]
  );

  const handleSelectPreset = useCallback((presetId: string) => {
    const found = PARTICLE_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setActivePresetId(found.id);
    setConfig({ ...found.config, palette: [...found.config.palette] });
  }, []);

  const handleConfigChange = useCallback((patch: Partial<ParticleConfig>) => {
    setActivePresetId(null);
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleReset = useCallback(() => {
    const targetPreset =
      PARTICLE_PRESETS.find((p) => p.id === activePresetId) || PARTICLE_PRESETS[0];
    setActivePresetId(targetPreset.id);
    setConfig({ ...targetPreset.config, palette: [...targetPreset.config.palette] });
  }, [activePresetId]);

  const triggerCopiedBanner = () => {
    setCopied(true);
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopied(false), 1800);
  };

  const handleCopyCode = useCallback(async () => {
    const ok = await copyTextSafe(generatedCode);
    if (ok) triggerCopiedBanner();
  }, [generatedCode]);

  const handleCopySandboxHtml = useCallback(async () => {
    const ok = await copyTextSafe(sandboxHtml);
    if (ok) triggerCopiedBanner();
  }, [sandboxHtml]);

  const handleDownload = useCallback(() => {
    const isHtml = format === 'html';
    const mime = isHtml ? 'text/html;charset=utf-8' : 'application/javascript;charset=utf-8';
    const ext = isHtml ? 'html' : 'js';
    const slug = activePresetId || 'custom-particles';
    const blob = new Blob([generatedCode], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slug}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [activePresetId, format, generatedCode]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#0B0E14] text-slate-100">
      {/* 3-Zone Top Bar */}
      <header className="flex items-center justify-between gap-8 px-5 py-3 bg-[#121722] border-b border-white/[0.08] shrink-0">
        <a
          href="#top"
          onClick={(e) => e.preventDefault()}
          className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          ParticleForge
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            type="button"
            onClick={() => canvasRef.current?.triggerBurst()}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Trigger Burst
          </button>
          <button
            type="button"
            onClick={() => canvasRef.current?.clearParticles()}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Clear Canvas
          </button>
          <button
            type="button"
            onClick={() =>
              setInteractionMode((m) => (m === 'playtest' ? 'cursor' : 'playtest'))
            }
            className={`transition-colors whitespace-nowrap shrink-0 ${
              interactionMode === 'playtest' ? 'text-amber-300' : 'hover:text-white'
            }`}
          >
            Target Arena
          </button>
          <button
            type="button"
            onClick={() => setSandboxOpen(true)}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Run Sandbox
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Download File
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleCopyCode}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              copied
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy JavaScript'}</span>
          </button>
        </div>
      </header>

      {/* Mobile/Tablet Pane Switcher */}
      <div className="lg:hidden grid grid-cols-3 border-b border-white/[0.08] bg-[#121722] shrink-0">
        {(
          [
            { id: 'canvas', label: 'Preview' },
            { id: 'controls', label: 'Parameters' },
            { id: 'code', label: 'JS Code' },
          ] as { id: MobilePane; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMobilePane(tab.id)}
            className={`py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              mobilePane === tab.id
                ? 'border-amber-500 text-amber-300 bg-white/[0.02]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main 3-Column Studio Workspace */}
      <main className="flex-1 flex min-h-0 overflow-hidden">
        <div
          className={`${
            mobilePane === 'controls' ? 'flex' : 'hidden'
          } lg:flex h-full w-full lg:w-auto min-h-0`}
        >
          <ControlsPanel
            config={config}
            activePresetId={activePresetId}
            onSelectPreset={handleSelectPreset}
            onChange={handleConfigChange}
            onReset={handleReset}
          />
        </div>

        <div
          className={`${
            mobilePane === 'canvas' ? 'flex' : 'hidden'
          } lg:flex flex-1 min-w-0 min-h-0 relative`}
        >
          <ParticleCanvas
            ref={canvasRef}
            config={config}
            background={background}
            onBackgroundChange={setBackground}
            interactionMode={interactionMode}
            onInteractionModeChange={setInteractionMode}
          />
        </div>

        <div
          className={`${
            mobilePane === 'code' ? 'flex' : 'hidden'
          } lg:flex h-full w-full lg:w-auto min-h-0`}
        >
          <CodeOutputPanel
            code={generatedCode}
            format={format}
            onFormatChange={setFormat}
            includeDemoLoop={includeDemoLoop}
            onIncludeDemoLoopChange={setIncludeDemoLoop}
            compact={compact}
            onCompactChange={setCompact}
            copied={copied}
            onCopy={handleCopyCode}
            onDownload={handleDownload}
            onOpenSandbox={() => setSandboxOpen(true)}
          />
        </div>
      </main>

      <SandboxModal
        open={sandboxOpen}
        htmlSource={sandboxHtml}
        copied={copied}
        onCopyHtml={handleCopySandboxHtml}
        onClose={() => setSandboxOpen(false)}
      />
    </div>
  );
}
