import { describe, expect, it } from 'vitest';
import { handleApiError } from '@/lib/api-error';
import { PlanLimitError } from '@/lib/plans/plan-errors';

describe('handleApiError (integración de respuestas API)', () => {
  it('responde 401 ante UNAUTHORIZED', async () => {
    const response = handleApiError(new Error('UNAUTHORIZED'), 'Error genérico');
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'No autorizado' });
  });

  it('permite mensaje 401 personalizado', async () => {
    const response = handleApiError(new Error('UNAUTHORIZED'), 'Error genérico', {
      unauthorizedMessage: 'Sesión inválida',
    });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Sesión inválida' });
  });

  it('responde 403 ante PlanLimitError', async () => {
    const error = new PlanLimitError(
      'Límite de proyectos alcanzado',
      'PLAN_PROJECT_LIMIT',
      { upgradeTo: 'starter' }
    );
    const response = handleApiError(error, 'Error genérico');
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: 'Límite de proyectos alcanzado',
      code: 'PLAN_PROJECT_LIMIT',
      upgradeTo: 'starter',
    });
  });

  it('responde 404 ante NO_PROJECTS', async () => {
    const response = handleApiError(new Error('NO_PROJECTS'), 'Error genérico');
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('No tienes proyectos'),
    });
  });

  it('responde 500 ante errores desconocidos', async () => {
    const response = handleApiError(new Error('BOOM'), 'Error interno de prueba');
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Error interno de prueba' });
  });
});
