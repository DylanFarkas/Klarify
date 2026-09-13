/**
 * @fileoverview Generadores de IDs del Agente 1 (seguros para cliente).
 */

import type { Wish } from '@/lib/types/agent-1';
import { WISH_ID_PREFIX } from '@/lib/constants/agent-1';

export function generateWishId(existingWishes: Wish[] = []): string {
  const maxNum = existingWishes.reduce((max, wish) => {
    const numStr = wish.id.replace(`${WISH_ID_PREFIX}-`, '');
    const num = parseInt(numStr, 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);

  return `${WISH_ID_PREFIX}-${String(maxNum + 1).padStart(3, '0')}`;
}
