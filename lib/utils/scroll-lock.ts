type ScrollLockSnapshot = {
  overflow: string;
  paddingRight: string;
};

let lockCount = 0;
const snapshots = new Map<HTMLElement, ScrollLockSnapshot>();

function hasVerticalScrollbar(el: HTMLElement): boolean {
  return el.scrollHeight > el.clientHeight;
}

function getElementScrollbarWidth(el: HTMLElement): number {
  return Math.max(0, el.offsetWidth - el.clientWidth);
}

function getViewportScrollbarWidth(): number {
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
}

function hasStableScrollbarGutter(el: HTMLElement): boolean {
  const gutter = getComputedStyle(el).scrollbarGutter;
  return gutter === 'stable' || gutter === 'stable both-edges';
}

function lockElement(el: HTMLElement, scrollbarWidth: number): void {
  snapshots.set(el, {
    overflow: el.style.overflow,
    paddingRight: el.style.paddingRight,
  });

  el.style.overflow = 'hidden';

  const shouldPad = scrollbarWidth > 0 && !hasStableScrollbarGutter(el);
  if (shouldPad) {
    const current = parseFloat(getComputedStyle(el).paddingRight) || 0;
    el.style.paddingRight = `${current + scrollbarWidth}px`;
  }
}

function getScrollLockTargets(): Array<{ el: HTMLElement; scrollbarWidth: number }> {
  const targets: Array<{ el: HTMLElement; scrollbarWidth: number }> = [];
  const seen = new Set<HTMLElement>();

  const addTarget = (el: HTMLElement, width: number) => {
    if (seen.has(el)) return;
    seen.add(el);
    targets.push({ el, scrollbarWidth: width });
  };

  document.querySelectorAll<HTMLElement>('main, aside').forEach((el) => {
    const { overflowY } = getComputedStyle(el);
    if (overflowY === 'auto' || overflowY === 'scroll') {
      const width = hasVerticalScrollbar(el) ? getElementScrollbarWidth(el) : 0;
      addTarget(el, width);
    }
  });

  const viewportWidth = getViewportScrollbarWidth();
  if (
    viewportWidth > 0 &&
    (hasVerticalScrollbar(document.documentElement) ||
      hasVerticalScrollbar(document.body))
  ) {
    addTarget(document.body, viewportWidth);
  }

  return targets;
}

/** Bloquea el scroll del workspace sin provocar salto de layout por la barra. */
export function lockPageScroll(): () => void {
  lockCount += 1;

  if (lockCount > 1) {
    return () => {
      lockCount = Math.max(0, lockCount - 1);
    };
  }

  getScrollLockTargets().forEach(({ el, scrollbarWidth }) => {
    lockElement(el, scrollbarWidth);
  });

  // Evita scroll por encadenamiento aunque el contenedor no tenga barra visible.
  if (!snapshots.has(document.body)) {
    snapshots.set(document.body, {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
    });
    document.body.style.overflow = 'hidden';
  }

  return () => {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount > 0) return;

    snapshots.forEach((snapshot, el) => {
      el.style.overflow = snapshot.overflow;
      el.style.paddingRight = snapshot.paddingRight;
    });
    snapshots.clear();
  };
}
