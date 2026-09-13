/**
 * Patrones de estilo del sidebar.
 * Mantener h-8, gap-2, rounded-md y labels text-xs en todos los items.
 *
 * Filas: 2 columnas `24px | 1fr` → `24px | 0fr`. `1fr` interpola; `justify-center`
 * solo actúa cuando la segunda columna ya no ocupa espacio y centra el icono.
 */

export const SIDEBAR_EASE = 'ease-[cubic-bezier(0.16,1,0.3,1)]';
export const SIDEBAR_DURATION = 'duration-[380ms]';

const sidebarMotion = `transition-[grid-template-columns,gap,padding,opacity] ${SIDEBAR_DURATION} ${SIDEBAR_EASE} motion-reduce:transition-none`;

/** Slot fijo 24×24: centra glifos de 16–24px. */
export const sidebarIconSlotClass = 'flex size-6 shrink-0 items-center justify-center';

export const sidebarFadeClass = [
  'min-w-0 overflow-hidden whitespace-nowrap',
  `transition-opacity ${SIDEBAR_DURATION} ${SIDEBAR_EASE} motion-reduce:transition-none`,
  'group-data-[collapsed=true]/sidebar:pointer-events-none',
  'group-data-[collapsed=true]/sidebar:opacity-0',
].join(' ');

export const sidebarLabelClass = `min-w-0 overflow-hidden ${sidebarFadeClass}`;

/** Fila icono + texto. Expandido 24px|1fr · colapsado 24px|0fr (icono centrado). */
export const sidebarRowClass = [
  'grid h-8 w-full grid-cols-[1.5rem_minmax(0,1fr)] items-center justify-center gap-x-2 overflow-hidden rounded-md px-2',
  sidebarMotion,
  'group-data-[collapsed=true]/sidebar:grid-cols-[1.5rem_0fr]',
  'group-data-[collapsed=true]/sidebar:gap-x-0',
  'group-data-[collapsed=true]/sidebar:px-0',
].join(' ');

export function sidebarNavItemClass(isActive = false): string {
  return [
    sidebarRowClass,
    'text-left text-sm',
    '[&_svg]:shrink-0',
    isActive
      ? 'font-semibold text-primary'
      : 'text-foreground-contrast hover:bg-surface-hover hover:text-foreground',
  ].join(' ');
}

export const sidebarGroupLabelClass = [
  'flex h-8 shrink-0 items-center overflow-hidden px-2 text-xs font-medium text-subtle',
  `transition-[height,opacity,margin] ${SIDEBAR_DURATION} ${SIDEBAR_EASE} motion-reduce:transition-none`,
  'group-data-[collapsed=true]/sidebar:mt-0',
  'group-data-[collapsed=true]/sidebar:h-0',
  'group-data-[collapsed=true]/sidebar:opacity-0',
].join(' ');

export const sidebarCollapsibleClass = [
  'grid grid-rows-[1fr]',
  `transition-[grid-template-rows,opacity] ${SIDEBAR_DURATION} ${SIDEBAR_EASE} motion-reduce:transition-none`,
  'group-data-[collapsed=true]/sidebar:grid-rows-[0fr]',
  'group-data-[collapsed=true]/sidebar:opacity-0',
].join(' ');

export const sidebarCollapsibleInnerClass = 'min-h-0 overflow-hidden';

export const sidebarIconTileClass =
  'inline-flex size-6 shrink-0 items-center justify-center rounded bg-surface-muted text-[11px] font-semibold text-foreground';

export const SIDEBAR_ICON_CLASS = 'h-4 w-4 shrink-0';
