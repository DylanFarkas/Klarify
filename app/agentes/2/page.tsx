'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Agent2Page() {
  const [data, setData] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem('agent_2_input');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData(JSON.stringify(parsed, null, 2));
      } catch {
        setData(saved);
      }
    } else {
      setData('No se recibieron datos del Agente 1.');
    }
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-4xl w-full">
      <div className="flex items-center gap-4">
        <Link href="/agentes/1" className="text-muted hover:text-foreground transition-colors">
          ← Volver al Agente 1
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl tracking-[-0.03em]">
          Agente 2: Backlog Inicial
        </h1>
        <p className="text-base text-muted">
          Esta es una página de prueba. Aquí es donde el Agente 2 recibirá los deseos procesados y los usará como contexto para generar las historias de usuario.
        </p>
      </div>
      
      <div className="rounded-2xl border border-border bg-surface-muted p-6 animate-[fadeIn_0.3s_ease-out]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Datos recibidos (JSON Payload)</h2>
            <p className="text-sm text-muted">
              Este es el objeto extraído desde localStorage (clave: <code className="rounded bg-surface-hover px-1">agent_2_input</code>).
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-success/20 px-3 py-1 text-xs font-bold text-success">
            Integración Exitosa
          </span>
        </div>
        
        <pre className="bg-code-bg p-4 rounded-xl text-green-400 text-sm overflow-auto max-h-[600px] font-mono border border-border">
          {data || 'Cargando...'}
        </pre>
      </div>
    </div>
  );
}
