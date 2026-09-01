'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAgentTheme } from '@/context/AgentThemeContext';
import {
  AGENT_THEMES,
  KLARIFY_ACCENTS,
  getKlarifyAccentMeta,
  type KlarifyAccent,
} from '@/lib/constants/agent-theme';

const WHEEL_SIZE = 176;
const WHEEL_CENTER = WHEEL_SIZE / 2;
const OUTER_R = 78;
const INNER_R = 42;
const SEGMENT_GAP_DEG = 4;

const POPOVER_WIDTH = 240;
const POPOVER_HEIGHT = 310;
const VIEWPORT_PADDING = 12;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeDonutSegment(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startDeg: number,
  endDeg: number
) {
  const outerStart = polarToCartesian(cx, cy, outerR, endDeg);
  const outerEnd = polarToCartesian(cx, cy, outerR, startDeg);
  const innerStart = polarToCartesian(cx, cy, innerR, startDeg);
  const innerEnd = polarToCartesian(cx, cy, innerR, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 1 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ');
}

function computePopoverPosition(rect: DOMRect) {
  let left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
  let top = rect.bottom + 10;

  if (left + POPOVER_WIDTH > window.innerWidth - VIEWPORT_PADDING) {
    left = Math.max(VIEWPORT_PADDING, window.innerWidth - POPOVER_WIDTH - VIEWPORT_PADDING);
  }
  if (left < VIEWPORT_PADDING) {
    left = VIEWPORT_PADDING;
  }

  if (top + POPOVER_HEIGHT > window.innerHeight - VIEWPORT_PADDING) {
    top = Math.max(VIEWPORT_PADDING, rect.top - POPOVER_HEIGHT - 10);
  }

  return { top, left };
}

function KlarifyAccentWheel({
  value,
  onChange,
}: {
  value: KlarifyAccent;
  onChange: (accent: KlarifyAccent) => void;
}) {
  const [hovered, setHovered] = useState<KlarifyAccent | null>(null);
  const active = getKlarifyAccentMeta(value);
  const slice = 360 / KLARIFY_ACCENTS.length;

  function accentAtPoint(clientX: number, clientY: number, rect: DOMRect): KlarifyAccent | null {
    const scaleX = WHEEL_SIZE / rect.width;
    const scaleY = WHEEL_SIZE / rect.height;
    const x = (clientX - rect.left) * scaleX - WHEEL_CENTER;
    const y = (clientY - rect.top) * scaleY - WHEEL_CENTER;
    const dist = Math.sqrt(x * x + y * y);
    if (dist < INNER_R - 2 || dist > OUTER_R + 6) return null;

    let angle = (Math.atan2(x, -y) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    const index = Math.min(KLARIFY_ACCENTS.length - 1, Math.floor(angle / slice));
    return KLARIFY_ACCENTS[index]?.id ?? null;
  }

  return (
    <div
      className="relative mx-auto"
      role="radiogroup"
      aria-label="Acento de Klarify"
      style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}
    >
      <svg
        width={WHEEL_SIZE}
        height={WHEEL_SIZE}
        viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
        className="relative cursor-pointer"
        onClick={(event) => {
          const next = accentAtPoint(
            event.clientX,
            event.clientY,
            event.currentTarget.getBoundingClientRect()
          );
          if (next) onChange(next);
        }}
        onMouseMove={(event) => {
          const next = accentAtPoint(
            event.clientX,
            event.clientY,
            event.currentTarget.getBoundingClientRect()
          );
          setHovered(next);
        }}
        onMouseLeave={() => setHovered(null)}
      >
        <circle
          cx={WHEEL_CENTER}
          cy={WHEEL_CENTER}
          r={OUTER_R + 2}
          className="fill-surface-muted stroke-border/70"
          strokeWidth={1}
        />

        {KLARIFY_ACCENTS.map((accent, index) => {
          const isSelected = value === accent.id;
          const isHovered = hovered === accent.id;
          const start = index * slice + SEGMENT_GAP_DEG / 2;
          const end = (index + 1) * slice - SEGMENT_GAP_DEG / 2;
          const mid = (start + end) / 2;
          const marker = polarToCartesian(WHEEL_CENTER, WHEEL_CENTER, OUTER_R - 7, mid);

          return (
            <g key={accent.id}>
              <path
                d={describeDonutSegment(WHEEL_CENTER, WHEEL_CENTER, OUTER_R, INNER_R, start, end)}
                fill={accent.primary}
                opacity={isSelected || isHovered ? 1 : 0.72}
                className="pointer-events-none transition-opacity duration-200 motion-reduce:transition-none"
                style={
                  isSelected
                    ? { filter: 'brightness(1.08)' }
                    : isHovered
                      ? { filter: 'brightness(1.04)' }
                      : undefined
                }
              />
              {isSelected && (
                <circle
                  cx={marker.x}
                  cy={marker.y}
                  r={3.25}
                  className="pointer-events-none fill-white"
                  opacity={0.95}
                />
              )}
            </g>
          );
        })}

        <circle
          cx={WHEEL_CENTER}
          cy={WHEEL_CENTER}
          r={INNER_R - 5}
          className="pointer-events-none fill-surface stroke-border/80"
          strokeWidth={1}
        />
        <circle
          cx={WHEEL_CENTER}
          cy={WHEEL_CENTER}
          r={INNER_R - 13}
          fill={active.primary}
          className="pointer-events-none transition-[fill] duration-300 motion-reduce:transition-none"
        />
      </svg>

      <div className="sr-only">
        {KLARIFY_ACCENTS.map((accent) => (
          <button
            key={accent.id}
            type="button"
            role="radio"
            aria-checked={value === accent.id}
            aria-label={accent.label}
            onClick={() => onChange(accent.id)}
          >
            {accent.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ThemeSettingsPanel() {
  const { theme, setTheme, klarifyAccent, setKlarifyAccent } = useAgentTheme();
  const activeKlarifyAccent = getKlarifyAccentMeta(klarifyAccent);

  const [accentOpen, setAccentOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const klarifyCardRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const rect =
      triggerRef.current?.getBoundingClientRect() ??
      klarifyCardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition(computePopoverPosition(rect));
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (theme !== 'klarify') {
      setAccentOpen(false);
    }
  }, [theme]);

  useEffect(() => {
    if (!accentOpen) return;

    updatePosition();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target) ||
        klarifyCardRef.current?.contains(target)
      ) {
        return;
      }
      setAccentOpen(false);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setAccentOpen(false);
      }
    };

    const handleReposition = () => updatePosition();

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape, true);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape, true);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [accentOpen, updatePosition]);

  const openAccentMenu = useCallback(() => {
    updatePosition();
    setAccentOpen(true);
  }, [updatePosition]);

  const handleSelectTheme = (id: (typeof AGENT_THEMES)[number]['id']) => {
    setTheme(id);
    if (id === 'klarify') {
      // Abre el submenu de acento al elegir Klarify
      requestAnimationFrame(() => openAccentMenu());
    } else {
      setAccentOpen(false);
    }
  };

  const popover =
    accentOpen && mounted
      ? createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Elegir acento de Klarify"
            className={[
              'fixed z-300 overflow-hidden rounded-xl border border-border/60 bg-surface',
              'animate-[fadeIn_0.15s_ease-out]',
            ].join(' ')}
            style={{ top: position.top, left: position.left, width: POPOVER_WIDTH }}
          >
            <div className="flex items-start justify-between gap-2 border-b border-border/60 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-foreground">Acento</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
                  Combina Klarify con el color que prefieras.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAccentOpen(false)}
                className="cursor-pointer rounded-md p-1.5 text-subtle transition-colors hover:bg-surface-hover hover:text-foreground"
                aria-label="Cerrar"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-4 py-4">
              <KlarifyAccentWheel
                value={klarifyAccent}
                onChange={(next) => {
                  setKlarifyAccent(next);
                }}
              />
              <div className="mt-3 flex items-center justify-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: activeKlarifyAccent.primary }}
                  aria-hidden="true"
                />
                <p className="text-[12px] font-medium text-foreground">
                  {activeKlarifyAccent.label}
                </p>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div>
      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        role="radiogroup"
        aria-label="Tema del workspace"
      >
        {AGENT_THEMES.map((option) => {
          const isSelected = theme === option.id;
          const isKlarify = option.id === 'klarify';
          const previewAccent = isKlarify
            ? activeKlarifyAccent.primary
            : option.preview.accent;

          return (
            <div
              key={option.id}
              ref={isKlarify ? klarifyCardRef : undefined}
              className="relative flex flex-col gap-1"
            >
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSelectTheme(option.id)}
                className={[
                  'group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border text-left transition-colors',
                  isSelected
                    ? 'border-border-strong bg-elevated'
                    : 'border-border/60 hover:bg-surface-hover/30',
                ].join(' ')}
              >
                <div
                  className="relative h-12 w-full"
                  style={{ backgroundColor: option.preview.bg }}
                  aria-hidden="true"
                >
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: previewAccent }}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                  <span
                    className={[
                      'truncate text-[12px] font-medium',
                      isSelected ? 'text-foreground' : 'text-muted',
                    ].join(' ')}
                  >
                    {option.label}
                  </span>
                  {isSelected ? (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  ) : null}
                </div>
              </button>

              {isKlarify && isSelected ? (
                <button
                  ref={triggerRef}
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={accentOpen}
                  onClick={() => {
                    if (accentOpen) {
                      setAccentOpen(false);
                    } else {
                      openAccentMenu();
                    }
                  }}
                  className={[
                    'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                    accentOpen ? 'bg-elevated' : 'hover:bg-surface-hover',
                  ].join(' ')}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: activeKlarifyAccent.primary }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-muted">
                    Acento · {activeKlarifyAccent.label}
                  </span>
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {popover}
    </div>
  );
}
