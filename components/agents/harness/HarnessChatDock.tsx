/**
 * @fileoverview Panel lateral redimensionable de Klark (asistente de backlog).
 * Solo disponible en /agentes/dashboard como split-view no bloqueante.
 */

'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { HarnessChatPanel } from '@/components/agents/harness/HarnessChatPanel';
import { useWorkspace } from '@/hooks/useWorkspace';

const PANEL_WIDTH_KEY = 'klarify.klark.panelWidth';
const DEFAULT_WIDTH = 420;
const MIN_WIDTH = 320;
const MAX_WIDTH = 720;

function readStoredWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_WIDTH;
  try {
    const raw = window.localStorage.getItem(PANEL_WIDTH_KEY);
    if (!raw) return DEFAULT_WIDTH;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return DEFAULT_WIDTH;
    return clampWidth(parsed);
  } catch {
    return DEFAULT_WIDTH;
  }
}

function clampWidth(width: number): number {
  if (typeof window === 'undefined') {
    return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
  }
  const maxForViewport = Math.min(MAX_WIDTH, Math.floor(window.innerWidth * 0.55));
  const minForViewport = Math.min(MIN_WIDTH, maxForViewport);
  return Math.min(maxForViewport, Math.max(minForViewport, Math.round(width)));
}

export function HarnessChatDock() {
  const { workspace, isLoading, plan, refreshWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const titleId = useId();
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(DEFAULT_WIDTH);

  const harnessEnabled = Boolean(workspace?.pipeline.agent6Input);
  const maxHarness = plan?.limits.maxHarnessMessages;
  const usedHarness = plan?.usage.harnessMessages ?? 0;
  const harnessRemaining =
    maxHarness === null
      ? null
      : typeof maxHarness === 'number'
        ? Math.max(0, maxHarness - usedHarness)
        : undefined;

  const handleWorkspaceMutated = useCallback(async () => {
    await refreshWorkspace({ silent: true });
  }, [refreshWorkspace]);

  const close = useCallback(() => setOpen(false), []);
  const openPanel = useCallback(() => setOpen(true), []);

  useEffect(() => {
    setMounted(true);
    setPanelWidth(readStoredWidth());
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  useEffect(() => {
    if (!isResizing) return;

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const onPointerMove = (event: PointerEvent) => {
      const delta = dragStartX.current - event.clientX;
      setPanelWidth(clampWidth(dragStartWidth.current + delta));
    };

    const onPointerUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (!mounted || isResizing) return;
    try {
      window.localStorage.setItem(PANEL_WIDTH_KEY, String(panelWidth));
    } catch {
      // ignore quota / private mode
    }
  }, [panelWidth, isResizing, mounted]);

  const onResizePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    dragStartX.current = event.clientX;
    dragStartWidth.current = panelWidth;
    setIsResizing(true);
  };

  if (!mounted || isLoading) {
    return null;
  }

  const fab =
    !open ? (
      <button
        type="button"
        className="harness-fab"
        onClick={openPanel}
        aria-expanded={false}
        aria-controls="klark-panel"
        title={
          harnessEnabled
            ? 'Abrir Klark'
            : 'Klark (disponible al completar el pipeline)'
        }
      >
        <AgentIcon />
        <span className="harness-fab__label">Klark</span>
        {!harnessEnabled ? <span className="harness-fab__lock" aria-hidden /> : null}
      </button>
    ) : null;

  return (
    <>
      {fab ? createPortal(fab, document.body) : null}

      <div
        id="klark-panel"
        className={`harness-dock${open ? '' : ' harness-dock--collapsed'}${
          isResizing ? ' harness-dock--resizing' : ''
        }`}
        style={{
          width: open ? panelWidth : 0,
          flexBasis: open ? panelWidth : 0,
        }}
        role="complementary"
        aria-labelledby={titleId}
        aria-hidden={!open}
        inert={!open ? true : undefined}
      >
        {open ? (
          <button
            type="button"
            className="harness-dock__resize"
            aria-label="Redimensionar panel de Klark"
            title="Arrastra para redimensionar"
            onPointerDown={onResizePointerDown}
          />
        ) : null}
        <span id={titleId} className="sr-only">
          Klark — asistente de backlog
        </span>
        <div className="harness-dock__panel">
          <HarnessChatPanel
            enabled={harnessEnabled}
            remainingMessages={harnessRemaining}
            onWorkspaceMutated={handleWorkspaceMutated}
            onClose={close}
          />
        </div>
      </div>
    </>
  );
}

function AgentIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3.5v2.25"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="2.75" r="1.1" fill="currentColor" />
      <rect
        x="5"
        y="6.5"
        width="14"
        height="11"
        rx="3.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="9.25" cy="11.5" r="1.35" fill="currentColor" />
      <circle cx="14.75" cy="11.5" r="1.35" fill="currentColor" />
      <path
        d="M9.5 15.25h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M3.75 11v2.5M20.25 11v2.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
