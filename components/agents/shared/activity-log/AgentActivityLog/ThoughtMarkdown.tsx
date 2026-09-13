'use client';

import { Fragment, type ReactNode } from 'react';

/**
 * Renderizador markdown ligero (sin dependencias) para el razonamiento del LLM
 * y las respuestas de Klark.
 * Soporta: encabezados (# / **linea**), negrita, `code`, cursiva, viñetas y tablas GFM.
 */

const INLINE_REGEX = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE_REGEX).map((part, i) => {
    if (!part) return null;
    const key = `${keyPrefix}-${i}`;

    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={key} className="font-medium text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={key}
          className="rounded bg-surface-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={key} className="text-foreground/90">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

function isHeading(line: string): boolean {
  const trimmed = line.trim();
  if (/^#{1,6}\s+\S/.test(trimmed)) return true;
  // Solo una frase entera en negrita cuenta como título: **Alcance**
  // Evita tratar `**Backlog:** … **MoSCoW**` como heading.
  return /^\*\*[^*]+\*\*$/.test(trimmed);
}

function headingText(line: string): string {
  const trimmed = line.trim();
  if (trimmed.startsWith('#')) return trimmed.replace(/^#+\s*/, '');
  return trimmed.slice(2, -2);
}

function isBullet(line: string): boolean {
  return /^\s*[-*]\s+/.test(line);
}

function splitTableRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
  return trimmed.split('|').map((cell) => cell.trim());
}

function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|')) return false;
  return splitTableRow(trimmed).length >= 2;
}

function isTableSeparator(line: string): boolean {
  if (!isTableRow(line)) return false;
  return splitTableRow(line).every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, '')));
}

function renderTable(
  header: string[],
  body: string[][],
  key: string,
  compact: boolean
): ReactNode {
  const colCount = header.length;

  return (
    <div
      key={key}
      className={['thought-md-table-wrap', compact ? 'thought-md-table-wrap--compact' : ''].join(
        ' '
      )}
    >
      <table className="thought-md-table">
        <thead>
          <tr>
            {header.map((cell, i) => (
              <th key={`${key}-h-${i}`}>{renderInline(cell, `${key}-h-${i}`)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, r) => (
            <tr key={`${key}-r-${r}`}>
              {Array.from({ length: colCount }, (_, c) => (
                <td key={`${key}-r-${r}-c-${c}`}>
                  {renderInline(row[c] ?? '', `${key}-r-${r}-c-${c}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ThoughtMarkdownProps {
  text: string;
  compact?: boolean;
}

export function ThoughtMarkdown({ text, compact = false }: ThoughtMarkdownProps) {
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];

  let paragraph: string[] = [];
  let bullets: string[] = [];
  let i = 0;

  const flushParagraph = (key: string) => {
    if (paragraph.length === 0) return;
    const content = paragraph.join(' ');
    blocks.push(
      <p key={key} className="text-muted">
        {renderInline(content, key)}
      </p>
    );
    paragraph = [];
  };

  const flushBullets = (key: string) => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={key} className="flex flex-col gap-1.5 pl-0.5">
        {bullets.map((b, idx) => (
          <li key={`${key}-${idx}`} className="flex gap-2 text-muted">
            <span className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full bg-foreground/35" />
            <span>{renderInline(b.replace(/^\s*[-*]\s+/, ''), `${key}-${idx}`)}</span>
          </li>
        ))}
      </ul>
    );
    bullets = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    const key = `blk-${i}`;

    if (line.trim() === '') {
      flushParagraph(key);
      flushBullets(key);
      i += 1;
      continue;
    }

    if (isTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flushParagraph(key);
      flushBullets(key);

      const header = splitTableRow(line);
      const body: string[][] = [];
      i += 2;
      while (i < lines.length && isTableRow(lines[i]) && !isTableSeparator(lines[i])) {
        body.push(splitTableRow(lines[i]));
        i += 1;
      }

      blocks.push(renderTable(header, body, key, compact));
      continue;
    }

    if (isHeading(line)) {
      flushParagraph(key);
      flushBullets(key);
      blocks.push(
        <h4 key={key} className="pt-0.5 text-[12px] font-semibold tracking-tight text-foreground">
          {headingText(line)}
        </h4>
      );
      i += 1;
      continue;
    }

    if (isBullet(line)) {
      flushParagraph(key);
      bullets.push(line);
      i += 1;
      continue;
    }

    flushBullets(key);
    paragraph.push(line.trim());
    i += 1;
  }

  flushParagraph('blk-final');
  flushBullets('blk-final-b');

  return (
    <div
      className={[
        'flex flex-col leading-relaxed',
        compact ? 'gap-2 text-[12.5px]' : 'gap-2.5 text-[13px]',
      ].join(' ')}
    >
      {blocks}
    </div>
  );
}
