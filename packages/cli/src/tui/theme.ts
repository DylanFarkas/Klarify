import { mixHex } from './hex';
import type { TuiColors } from './palettes';

export type { TuiColors };
export { mixHex };
export { ThemeProvider, useTheme } from './ThemeContext';
export { resolveTuiColors, statusColors, priorityColors } from './palettes';

export const TAGLINE = 'idea → backlog ejecutable';

export { landingInner, pageGutter } from './layout';
