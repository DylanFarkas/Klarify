/** Ancho usable del hub: nunca mayor que la terminal. */
export function pageGutter(columns: number): number {
  if (columns >= 120) return 5;
  if (columns >= 90) return 3;
  if (columns >= 56) return 2;
  return 1;
}

export function landingInner(columns: number): number {
  return Math.max(1, columns - pageGutter(columns) * 2);
}

export type Viewport = {
  columns: number;
  rows: number;
  gutter: number;
  inner: number;
  /** Tres columnas del backlog ya no caben. */
  stacked: boolean;
  /** Filas de tabla → tarjeta de dos líneas. */
  cards: boolean;
  /** Poca altura: recortar chrome. */
  short: boolean;
  compact: boolean;
};

export function viewport(columns: number, rows: number): Viewport {
  const gutter = pageGutter(columns);
  const inner = landingInner(columns);
  return {
    columns,
    rows,
    gutter,
    inner,
    stacked: columns < 80,
    cards: inner < 68,
    short: rows < 16,
    compact: rows < 22,
  };
}

export function packHintRows(
  items: Array<readonly [string, string]>,
  width: number,
): Array<Array<readonly [string, string]>> {
  const gap = 4;
  const rows: Array<Array<readonly [string, string]>> = [];
  let row: Array<readonly [string, string]> = [];
  let used = 0;
  for (const item of items) {
    const w = item[0].length + 2 + item[1].length;
    const need = row.length === 0 ? w : used + gap + w;
    if (row.length > 0 && need > width) {
      rows.push(row);
      row = [item];
      used = w;
    } else {
      row.push(item);
      used = need;
    }
  }
  if (row.length > 0) rows.push(row);
  return rows;
}

export function clampWidth(width: number, columns: number): number {
  return Math.max(1, Math.min(width, landingInner(columns)));
}
