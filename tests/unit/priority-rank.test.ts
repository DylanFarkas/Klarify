import { describe, expect, it } from 'vitest';
import {
  getPriorityOrderLabel,
  getPriorityRank,
  violatesPriorityOrder,
} from '@/lib/utils/priority-rank';

describe('ranking de prioridad (Agente 4)', () => {
  it('asigna menor rank a mayor prioridad en MoSCoW', () => {
    expect(getPriorityRank('moscow', 'must')).toBe(0);
    expect(getPriorityRank('moscow', 'should')).toBe(1);
    expect(getPriorityRank('moscow', 'could')).toBe(2);
    expect(getPriorityRank('moscow', 'wont')).toBe(3);
  });

  it('devuelve 99 para categorías desconocidas', () => {
    expect(getPriorityRank('moscow', 'unknown')).toBe(99);
  });

  it('detecta violación cuando el prerequisito tiene menor prioridad', () => {
    expect(violatesPriorityOrder('must', 'could', 'moscow')).toBe(true);
    expect(violatesPriorityOrder('could', 'must', 'moscow')).toBe(false);
  });

  it('genera etiqueta de orden legible', () => {
    expect(getPriorityOrderLabel('moscow')).toContain('Must');
    expect(getPriorityOrderLabel('moscow')).toContain('Should');
  });
});
