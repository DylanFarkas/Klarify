'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/api-client';

interface TokenRow {
  id: string;
  name: string;
  prefix: string;
  createdAt: number;
  lastUsedAt: number | null;
}

export function CliTokensPanel() {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('CLI');
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch('/api/v1/tokens', user);
      const data = (await response.json()) as { tokens?: TokenRow[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? 'No se pudieron cargar los tokens');
      setTokens(data.tokens ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar tokens');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    setError(null);
    try {
      const response = await authFetch('/api/v1/tokens', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = (await response.json()) as {
        token?: string;
        record?: TokenRow;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? 'No se pudo crear el token');
      if (data.token) setPlaintext(data.token);
      if (data.record) setTokens((current) => [data.record!, ...current]);
      setName('CLI');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el token');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!user) return;
    setError(null);
    try {
      const response = await authFetch(`/api/v1/tokens/${id}`, user, { method: 'DELETE' });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? 'No se pudo revocar');
      }
      setTokens((current) => current.filter((token) => token.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al revocar');
    }
  };

  return (
    <div className="border-t border-border/60 pt-6">
      <h4 className="text-[13px] font-medium text-foreground">CLI / agentes de código</h4>
      <p className="mt-1 text-[12px] text-muted">
        Tokens para <code className="font-mono text-[11px]">klarify login --token</code>. No pases por
        Klark: el CLI escribe el backlog directo.
      </p>

      {plaintext ? (
        <div className="mt-3 rounded-lg border border-border bg-input px-3 py-2">
          <p className="text-[11px] text-muted">Cópialo ahora. No se volverá a mostrar.</p>
          <p className="mt-1 break-all font-mono text-[12px] text-foreground">{plaintext}</p>
          <button
            type="button"
            className="mt-2 text-[12px] text-primary hover:underline"
            onClick={() => {
              void navigator.clipboard.writeText(plaintext);
            }}
          >
            Copiar
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-[12px] text-danger">{error}</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-lg border border-border bg-input px-3 py-1.5 text-[12px] text-foreground"
          placeholder="Nombre del token"
          aria-label="Nombre del token"
        />
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={creating}
          className="rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-background hover:opacity-90 disabled:opacity-40"
        >
          {creating ? 'Creando…' : 'Generar token'}
        </button>
      </div>

      <div className="mt-4">
        {loading ? (
          <p className="text-[12px] text-subtle">Cargando tokens…</p>
        ) : tokens.length === 0 ? (
          <p className="text-[12px] text-subtle">Aún no hay tokens.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {tokens.map((token) => (
              <li key={token.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-foreground">{token.name}</p>
                  <p className="font-mono text-[11px] text-subtle">{token.prefix}…</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRevoke(token.id)}
                  className="shrink-0 rounded-md px-2 py-1 text-[12px] text-muted hover:bg-surface-hover hover:text-danger"
                >
                  Revocar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
