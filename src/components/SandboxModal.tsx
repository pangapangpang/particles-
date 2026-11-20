import React, { useEffect } from 'react';
import { Check, Copy, X } from 'lucide-react';

interface SandboxModalProps {
  open: boolean;
  htmlSource: string;
  copied: boolean;
  onCopyHtml: () => void;
  onClose: () => void;
}

export const SandboxModal: React.FC<SandboxModalProps> = ({
  open,
  htmlSource,
  copied,
  onCopyHtml,
  onClose,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Live JavaScript Output Sandbox"
    >
      <div className="w-full max-w-4xl h-[78vh] bg-[#121722] border border-white/15 rounded-xl flex flex-col overflow-hidden shadow-2xl">
        <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold text-slate-100 truncate">
              Standalone Output Sandbox
            </h3>
            <p className="text-xs text-slate-400 truncate">
              Executing the exact generated HTML + JavaScript snippet in an isolated frame. Move cursor or click inside.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onCopyHtml}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                copied
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy HTML + JS'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close sandbox"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-[#0B0E14]">
          <iframe
            title="Generated Particle JavaScript Sandbox"
            srcDoc={htmlSource}
            sandbox="allow-scripts"
            className="w-full h-full border-0 block"
          />
        </div>
      </div>
    </div>
  );
};
