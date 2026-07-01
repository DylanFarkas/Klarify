/**
 * @fileoverview Componente principal del espacio de trabajo del Agente 3.
 * Gestiona el estado interactivo de la estimación, la consulta a la IA y la persistencia en Firestore.
 */

'use client';
import { useState, useCallback } from 'react';
import { useAgentActivity } from '@/hooks/useAgentActivity';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/api-client';
import type { Agent3Input } from '@/lib/types/workspace';
import { db } from '@/lib/firestore'; // Archivo puente para Firestore que reutiliza la app central
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useWorkspace } from '@/hooks/useWorkspace';

// 1. Definimos la estructura exacta que responderá el backend del Agente 3
export interface Agent3SuggestionItem {
  storyId: string;
  suggestedPoints: number;
  justification: string;
}

export interface Agent3EstimationResponse {
  suggestions: Agent3SuggestionItem[];
}

interface EstimationWorkspaceProps {
  input: Agent3Input;
}

// Escala Fibonacci estandarizada para el proyecto
const FIBONACCI_SCALE = [1, 2, 3, 5, 8, 13, 21];

export function EstimationWorkspace({ input }: EstimationWorkspaceProps) {
  const { user } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { consumeStream } = useAgentActivity();
  const { workspace, isLoading, sessionVersion, saveAgent2, approveAgent2 } = useWorkspace();
  
  // Estado que mapea: [storyId] -> { points: number, justification: string, isModified: boolean }
  const [estimations, setEstimations] = useState<Record<string, { points: number; justification: string; isModified: boolean }>>({});

    /**
     * Simula u obtiene la llamada al endpoint del Agente 3 (LLM)
     */
    /**
     * Petición real al Agente 3 usando el patrón de Streams y Autenticación del proyecto
     */
    const handleAnalyzeWithAgent = useCallback(async () => {
        // 1. Validaciones iniciales de seguridad
        if (!input || !user) return; 

        // 2. Cambiamos el estado a analizando/generando
        setIsAnalyzing(true);
    
        try {
            // 3. Petición autenticada al endpoint del Agente 3
            const response = await authFetch('/api/agentes/3/estimate', user, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ epics: input.epics }), // Enviamos las épicas e historias del Agente 2
            });
            console.log('ruta ejecutada: ', response)
            if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al obtener las estimaciones del Scrum Master');
            }

            // 4. Consumimos el stream de datos estructurados que envía el LLM
            // Asumiendo que el backend te retorna un formato mapeado por storyId
            const data = await consumeStream<Agent3EstimationResponse>(response);
            
            // 5. Mapeamos el resultado de la IA a nuestro estado local de estimaciones
            const aiResult: Record<string, { points: number; justification: string; isModified: boolean }> = {};
            
            // 'data.suggestions' sería el array o mapa que configuremos en la API del Agente 3
            data.suggestions.forEach((sug) => {
            aiResult[sug.storyId] = {
                points: sug.suggestedPoints, // Puntos en escala Fibonacci (ej: 1, 2, 3, 5, 8...)
                justification: sug.justification, // Justificación del Scrum Master IA
                isModified: false // Por defecto inicia sin intervención HITL
            };
            });

            setEstimations(aiResult);
        } catch (error) {
            console.error("Error en la conexión con el Agente 3:", error);
            alert(error instanceof Error ? error.message : 'Error al procesar la estimación.');
        } finally {
            setIsAnalyzing(false);
        }
    }, [input, user, consumeStream ]);

  /**
   * CA1 (HITL): Sobrescribe el valor sugerido por la IA localmente en el estado
   */
  const handlePointChange = (storyId: string, newPoints: number) => {
    setEstimations((prev) => ({
      ...prev,
      [storyId]: {
        ...prev[storyId],
        points: newPoints,
        isModified: true // Marcamos que hubo intervención humana (HITL)
      }
    }));
  };

  /**
   * Consolida y guarda por lotes (Batch) en Firebase Firestore
   */
  const handleSaveToFirestore = async () => {
    if (!workspace) {
      alert('Error: No se encontró el ID del workspace actual.');
      return;
    }

    setIsSaving(true);
    try {
      console.log("aqui: ", estimations, input.epics)
    
      alert('¡Backlog estimado consolidado exitosamente! El Agente 4 ya está habilitado.');
    } catch (error) {
      console.error("Error al persistir en Firestore:", error);
      alert('Ocurrió un error al guardar en la base de datos.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasEstimations = Object.keys(estimations).length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Barra de Acciones del Agente ─────────────────────── */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-6 py-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Acciones del Scrum Master IA</h3>
          <p className="text-xs text-muted-foreground">Presiona el botón para que el agente calcule el esfuerzo inicial.</p>
        </div>
        <button
          onClick={handleAnalyzeWithAgent}
          disabled={isAnalyzing || isSaving}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-600 px-4 text-xs font-medium text-white shadow transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          {isAnalyzing ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Analizando complejidad...
            </>
          ) : (
            'Sugerir Story Points'
          )}
        </button>
      </div>

      {/* ── Listado de Épicas e Historias ────────────────────── */}
      <div className="flex flex-col gap-6">
        {input.epics.map((epic) => (
          <div key={epic.id} className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
            <div className="bg-muted/40 px-6 py-3 border-b border-border">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Épica</span>
              <h4 className="text-base font-bold text-foreground mt-0.5">{epic.title}</h4>
            </div>

            <div className="divide-y divide-border">
              {(epic.userStories || []).map((story) => {
                const est = estimations[story.id];
                return (
                  <div key={story.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 items-start">
                    {/* Detalle de la HU */}
                    <div className="md:col-span-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-white">
                          {story.id}
                        </span>
                        <h5 className="text-sm font-semibold text-foreground">{story.title}</h5>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">{story.description}</p>
                    </div>

                    {/* Justificación de la IA */}
                    <div className="text-xs bg-muted/30 p-3 rounded-lg border border-border/60">
                      {est ? (
                        <p className="text-muted-foreground italic leading-relaxed">{est.justification}</p>
                      ) : (
                        <p className="text-muted-foreground/60 italic">Esperando análisis del Agente 3...</p>
                      )}
                    </div>

                    {/* CA1 (HITL): Control e Intervención Humana */}
                    <div className="flex flex-col items-end gap-2 justify-self-end">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {est?.isModified ? 'Modificado (HITL)' : 'Story Points'}
                      </label>
                      <select
                        disabled={!est}
                        value={est ? est.points : ''}
                        onChange={(e) => handlePointChange(story.id, Number(e.target.value))}
                        className="h-9 w-28 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40"
                      >
                        {!est && <option value="">---</option>}
                        {FIBONACCI_SCALE.map((num) => (
                          <option key={num} value={num}>
                            {num} SP
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Guardar y Consolidar en Firestore ───────────────── */}
      {hasEstimations && (
        <div className="flex justify-end gap-4 mt-2">
          <button
            onClick={handleSaveToFirestore}
            disabled={isSaving || isAnalyzing}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {isSaving ? 'Avanzar al agente 3' : 'Consolidar Backlog Estimado'}
          </button>
        </div>
      )}
    </div>
  );
}