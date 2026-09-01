'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/api-client';

export default function CliDevicePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userCode, setUserCode] = useState(searchParams.get('user_code') ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      const next = `/cli/device${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [loading, user, router, searchParams]);

  const submit = async () => {
    if (!user) return;
    setStatus('saving');
    setMessage(null);
    try {
      const response = await authFetch('/api/v1/auth/device/authorize', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userCode }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'No se pudo autorizar');
      setStatus('ok');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Error');
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center bg-background px-6 py-16 text-foreground">
      <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-subtle">Klarify CLI</p>
      <h1 className="mt-2 text-[28px] font-semibold tracking-tight">Autorizar terminal</h1>
      <p className="mt-2 text-[13px] text-muted">
        Introduce el código que muestra <code className="font-mono text-[12px]">klarify login</code>.
      </p>

      {status === 'ok' ? (
        <p className="mt-6 text-sm text-success">Listo. Vuelve a la terminal; el CLI guardará el token.</p>
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label className="block text-[12px] text-muted">
            Código
            <input
              value={userCode}
              onChange={(event) => setUserCode(event.target.value.toUpperCase())}
              className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 font-mono text-sm tracking-[0.2em] text-foreground"
              placeholder="ABCD-WXYZ"
              autoComplete="off"
              autoCapitalize="characters"
            />
          </label>
          {message ? <p className="text-[12px] text-danger">{message}</p> : null}
          <button
            type="submit"
            disabled={status === 'saving' || userCode.trim().length < 8}
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-40"
          >
            {status === 'saving' ? 'Autorizando…' : 'Autorizar CLI'}
          </button>
        </form>
      )}
    </main>
  );
}
