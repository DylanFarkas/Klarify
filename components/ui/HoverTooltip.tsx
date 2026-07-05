'use client';

import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface HoverTooltipProps {
  children: ReactNode;
  title: string;
  description?: string;
  detail?: string;
  className?: string;
  widthClass?: string;
}

export function HoverTooltip({
  children,
  title,
  description,
  detail,
  className = '',
  widthClass = 'w-72',
}: HoverTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
    });
  }, []);

  const show = useCallback(() => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
    updatePosition();
    setVisible(true);
  }, [updatePosition]);

  const hide = useCallback(() => {
    hideTimeout.current = setTimeout(() => {
      setVisible(false);
      hideTimeout.current = null;
    }, 100);
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onScroll = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [visible, updatePosition]);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={className}
        tabIndex={0}
        role="button"
        aria-label={title}
      >
        {children}
      </span>

      {visible &&
        createPortal(
          <div
            className={`fixed z-9999 ${widthClass} rounded-lg border border-border bg-surface p-3 shadow-xl`}
            style={{
              top: pos.top,
              left: pos.left,
              transform: 'translate(-50%, -100%)',
            }}
            onMouseEnter={cancelHide}
            onMouseLeave={hide}
          >
            <p className="text-[11px] font-semibold text-foreground">{title}</p>
            {description && (
              <p className="mt-1 whitespace-pre-line text-[10px] leading-relaxed text-muted-foreground">{description}</p>
            )}
            {detail && (
              <p className="mt-1.5 whitespace-pre-line text-[10px] leading-relaxed text-muted-foreground/70">{detail}</p>
            )}
            <div className="absolute left-1/2 -bottom-1 h-2 w-2 -translate-x-1/2 rotate-45 border-r border-b border-border bg-surface" />
          </div>,
          document.body
        )}
    </>
  );
}