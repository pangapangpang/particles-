import React, { useMemo } from 'react';
import { Check, Copy, Download, Play } from 'lucide-react';
import { CodeOutputFormat } from '../types/particle';
import { SyntaxHighlightedCode } from './SyntaxHighlightedCode';

interface CodeOutputPanelProps {
  code: string;
  format: CodeOutputFormat;
  onFormatChange: (format: CodeOutputFormat) => void;
  includeDemoLoop: boolean;
  onIncludeDemoLoopChange: (val: boolean) => void;
  compact: boolean;
  onCompactChange: (val: boolean) => void;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
  onOpenSandbox: () => void;
}

export const CodeOutputPanel: React.FC<CodeOutputPanelProps> = ({
  code,
  format,
  onFormatChange,
  includeDemoLoop,
  onIncludeDemoLoopChange,
  compact,
  onCompactChange,
  copied,
  onCopy,
  onDownload,
  onOpenSandbox,
}) => {
  const stats = useMemo(() => {
    const lines = code.split('\n').length;
    const kb = (new Blob([code]).size / 1024).toFixed(1);
    return { lines, kb };
  }, [code]);

  return (
    <aside className="w-full lg:w-[440px] xl:w-[480px] shrink-0 bg-[#121722] border-l border-white/[0.08] flex flex-col h-full overflow-hidden">
      {/* Code Header & Format Switcher */}
      <div className="px-4 py-3 border-b border-white/[0.08] space-y-2.5 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-display text-sm font-semibold text-slate-100 whitespace-nowrap">
              JavaScript Output
            </h2>
            <span className="text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
              {stats.lines} lines · {stats.kb} KB
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onOpenSandbox}
              title="Run generated code in isolated sandbox"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-300 bg-[#1A2130] hover:bg-[#232C3F] hover:text-white border border-white/[0.08] transition-colors whitespace-nowrap shrink-0"
            >
              <Play className="w-3 h-3 text-amber-400" />
              <span>Run</span>
            </button>
            <button
              type="button"
              onClick={onDownload}
              title={format === 'html' ? 'Download .html file' : 'Download .js file'}
              className="p-1.5 rounded-md text-slate-300 bg-[#1A2130] hover:bg-[#232C3F] hover:text-white border border-white/[0.08] transition-colors shrink-0"
              aria-label="Download generated file"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Format Tabs + Options */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-[#0B0E14] border border-white/[0.06]">
            {(
              [
                { id: 'class', label: 'ES6 Class' },
                { id: 'function', label: 'Function' },
                { id: 'html', label: 'HTML + JS' },
              ] as { id: CodeOutputFormat; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onFormatChange(tab.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  format === tab.id
                    ? 'bg-[#1E2638] text-amber-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            {format !== 'html' && (
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={includeDemoLoop}
                  onChange={(e) => onIncludeDemoLoopChange(e.target.checked)}
                  className="rounded border-white/20 bg-[#0B0E14] text-amber-500 focus:ring-amber-500/40"
                />
                <span>Usage loop</span>
              </label>
            )}
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap">
              <input
                type="checkbox"
                checked={compact}
                onChange={(e) => onCompactChange(e.target.checked)}
                className="rounded border-white/20 bg-[#0B0E14] text-amber-500 focus:ring-amber-500/40"
              />
              <span>Compact</span>
            </label>
          </div>
        </div>
      </div>

      {/* Code Viewer */}
      <div className="flex-1 overflow-auto studio-scroll bg-[#0B0E14] py-3">
        <SyntaxHighlightedCode code={code} />
      </div>

      {/* Sticky Copy Footer */}
      <div className="px-4 py-3 border-t border-white/[0.08] bg-[#121722] flex items-center justify-between gap-3 shrink-0">
        <span className="text-xs text-slate-400 truncate">
          Zero dependencies · Vanilla Canvas 2D
        </span>
        <button
          type="button"
          onClick={onCopy}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            copied
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied Code' : format === 'html' ? 'Copy HTML + JS' : 'Copy JavaScript'}</span>
        </button>
      </div>
    </aside>
  );
};
