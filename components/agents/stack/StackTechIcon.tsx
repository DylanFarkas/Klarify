/**
 * @fileoverview Icono de tecnología vía Simple Icons CDN con fallback monograma.
 */

'use client';

import { useState } from 'react';
import { guessIconSlug, resolveTechFromStackItem } from '@/lib/constants/tech-catalog';
import type { StackItem } from '@/lib/types/stack';

interface StackTechIconProps {
  item: StackItem;
  size?: number;
  className?: string;
}

export function StackTechIcon({ item, size = 20, className = '' }: StackTechIconProps) {
  const catalog = resolveTechFromStackItem(item);
  const name = catalog?.name ?? item.customName ?? item.catalogId ?? '?';
  const slug = catalog?.iconSlug ?? guessIconSlug(name);
  const hex = catalog?.hex ?? '888888';

  const [failed, setFailed] = useState(false);
  const src = `https://cdn.simpleicons.org/${slug}/${hex}`;

  if (failed) {
    const letter = name.charAt(0).toUpperCase();
    return (
      <span
        className={[
          'inline-flex shrink-0 items-center justify-center rounded-md bg-surface-muted text-[10px] font-semibold text-muted',
          className,
        ].join(' ')}
        style={{ width: size, height: size }}
        aria-hidden
      >
        {letter}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={['shrink-0 rounded-sm', className].join(' ')}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}

export function StackTechIconById({
  catalogId,
  size = 20,
  className = '',
}: {
  catalogId: string;
  size?: number;
  className?: string;
}) {
  return <StackTechIcon item={{ catalogId }} size={size} className={className} />;
}
