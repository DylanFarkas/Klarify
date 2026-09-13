export function mixHex(from: string, to: string, t: number): string {
  const parse = (hex: string) => {
    const n = hex.replace('#', '');
    return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)] as const;
  };
  const a = parse(from);
  const b = parse(to);
  const c = a.map((value, i) => Math.round(value + (b[i]! - value) * t));
  return `#${c.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

export function hexLuminance(hex: string): number {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
