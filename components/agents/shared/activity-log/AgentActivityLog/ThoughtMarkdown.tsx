'use client';

import { Fragment, type ReactNode } from 'react';

/**
 * Renderizador markdown ligero (sin dependencias) para el razonamiento del LLM.
 * Soporta: encabezados (**linea**), negrita inline, `code`, y viñetas (- / *).
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
  return (
    (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 4) ||
    trimmed.startsWith('#')
  );
}

function headingText(line: string): string {
  const trimmed = line.trim();
  if (trimmed.startsWith('#')) return trimmed.replace(/^#+\s*/, '');
  return trimmed.slice(2, -2);
}

function isBullet(line: string): boolean {
  return /^\s*[-*]\s+/.test(line);
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
        {bullets.map((b, i) => (
          <li key={`${key}-${i}`} className="flex gap-2 text-muted">
            <span className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full bg-foreground/35" />
            <span>{renderInline(b.replace(/^\s*[-*]\s+/, ''), `${key}-${i}`)}</span>
          </li>
        ))}
      </ul>
    );
    bullets = [];
  };

  lines.forEach((line, index) => {
    const key = `blk-${index}`;

    if (line.trim() === '') {
      flushParagraph(key);
      flushBullets(key);
      return;
    }

    if (isHeading(line)) {
      flushParagraph(key);
      flushBullets(key);
      blocks.push(
        <h4 key={key} className="pt-0.5 text-[12px] font-semibold tracking-tight text-foreground">
          {headingText(line)}
        </h4>
      );
      return;
    }

    if (isBullet(line)) {
      flushParagraph(key);
      bullets.push(line);
      return;
    }

    flushBullets(key);
    paragraph.push(line.trim());
  });

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
