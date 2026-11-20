import React, { useMemo } from 'react';

interface SyntaxHighlightedCodeProps {
  code: string;
}

type TokenType = 'plain' | 'keyword' | 'string' | 'number' | 'comment' | 'property' | 'builtin';

interface Token {
  type: TokenType;
  value: string;
}

const KEYWORDS = new Set([
  'const',
  'let',
  'var',
  'function',
  'return',
  'class',
  'constructor',
  'if',
  'else',
  'for',
  'while',
  'continue',
  'break',
  'new',
  'this',
  'true',
  'false',
  'null',
  'undefined',
]);

const BUILTINS = new Set([
  'Math',
  'document',
  'window',
  'requestAnimationFrame',
  'performance',
  'JSON',
  'Array',
  'Object',
]);

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < line.length) {
    // Line comment
    if (line[i] === '/' && line[i + 1] === '/') {
      tokens.push({ type: 'comment', value: line.slice(i) });
      break;
    }

    // HTML tag bracket highlight lightly as keyword
    if (line[i] === '<' && (line[i + 1] === '!' || line[i + 1] === '/' || /[a-zA-Z]/.test(line[i + 1] || ''))) {
      const closeIdx = line.indexOf('>', i);
      if (closeIdx !== -1) {
        tokens.push({ type: 'keyword', value: line.slice(i, closeIdx + 1) });
        i = closeIdx + 1;
        continue;
      }
    }

    // Strings ('...', "...", `...`)
    if (line[i] === "'" || line[i] === '"' || line[i] === '`') {
      const quote = line[i];
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === '\\') {
          j += 2;
          continue;
        }
        if (line[j] === quote) {
          j++;
          break;
        }
        j++;
      }
      tokens.push({ type: 'string', value: line.slice(i, j) });
      i = j;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(line[i]) && (i === 0 || !/[a-zA-Z_$]/.test(line[i - 1]))) {
      let j = i;
      while (j < line.length && /[0-9.]/.test(line[j])) j++;
      tokens.push({ type: 'number', value: line.slice(i, j) });
      i = j;
      continue;
    }

    // Identifiers / keywords / builtins
    if (/[a-zA-Z_$]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j++;
      const word = line.slice(i, j);
      if (KEYWORDS.has(word)) {
        tokens.push({ type: 'keyword', value: word });
      } else if (BUILTINS.has(word)) {
        tokens.push({ type: 'builtin', value: word });
      } else if (line[j] === ':') {
        tokens.push({ type: 'property', value: word });
      } else {
        tokens.push({ type: 'plain', value: word });
      }
      i = j;
      continue;
    }

    // Other punctuation / whitespace
    let j = i + 1;
    while (
      j < line.length &&
      !/[a-zA-Z0-9_$'"`<]/.test(line[j]) &&
      !(line[j] === '/' && line[j + 1] === '/')
    ) {
      j++;
    }
    tokens.push({ type: 'plain', value: line.slice(i, j) });
    i = j;
  }

  return tokens;
}

const TOKEN_CLASSES: Record<TokenType, string> = {
  plain: 'text-slate-200',
  keyword: 'text-amber-300',
  string: 'text-emerald-300',
  number: 'text-sky-300',
  comment: 'text-slate-500 italic',
  property: 'text-indigo-300',
  builtin: 'text-orange-300',
};

export const SyntaxHighlightedCode: React.FC<SyntaxHighlightedCodeProps> = ({ code }) => {
  const lines = useMemo(() => code.split('\n').map(tokenizeLine), [code]);

  return (
    <pre className="font-mono text-[12.5px] leading-[1.6] text-slate-200 select-text m-0">
      <code>
        {lines.map((tokens, idx) => (
          <div key={idx} className="table-row hover:bg-white/[0.03] transition-colors">
            <span className="table-cell pr-4 pl-3 text-right text-slate-600 select-none w-10 tabular-nums text-[11px]">
              {idx + 1}
            </span>
            <span className="table-cell pr-4 whitespace-pre">
              {tokens.length === 0
                ? ' '
                : tokens.map((tok, tIdx) => (
                    <span key={tIdx} className={TOKEN_CLASSES[tok.type]}>
                      {tok.value}
                    </span>
                  ))}
            </span>
          </div>
        ))}
      </code>
    </pre>
  );
};
