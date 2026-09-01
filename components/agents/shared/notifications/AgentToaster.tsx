'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Toaster } from 'sileo';
import 'sileo/styles.css';
import './agent-toaster.css';
import { useAgentTheme } from '@/context/AgentThemeContext';
import type { AgentTheme } from '@/lib/constants/agent-theme';

/** Solo `light` es claro; el resto de presets del workspace son oscuros. */
function toSileoTheme(theme: AgentTheme): 'light' | 'dark' {
  return theme === 'light' ? 'light' : 'dark';
}

const LIGHT_OPTIONS = {
  fill: '#ffffff',
  duration: 2000,
  roundness: 16,
  autopilot: true as const,
  styles: {
    title: 'text-slate-900!',
    description: 'text-slate-600!',
    badge: 'bg-slate-900!',
    button: 'bg-slate-900/8! hover:bg-slate-900/12!',
  },
};

const DARK_OPTIONS = {
  fill: '#000000',
  duration: 2000,
  roundness: 16,
  autopilot: true as const,
  styles: {
    title: 'text-white!',
    description: 'text-white/75!',
    badge: 'bg-white/10!',
    button: 'bg-white/10! hover:bg-white/15!',
  },
};

/** Toaster de Sileo sincronizado con el tema del workspace de agentes. */
export function AgentToaster() {
  const { theme } = useAgentTheme();
  const sileoTheme = toSileoTheme(theme);
  const options = useMemo(
    () => (sileoTheme === 'light' ? LIGHT_OPTIONS : DARK_OPTIONS),
    [sileoTheme]
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 isolate"
      style={{ zIndex: 9999 }}
    >
      <Toaster
        position="top-right"
        theme={sileoTheme}
        offset={{ top: 16, right: 16 }}
        options={options}
      />
    </div>,
    document.body
  );
}
