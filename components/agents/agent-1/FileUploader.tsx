/**
 * @fileoverview FileUploader — Entrada de contexto (archivos, voz y texto).
 *
 * Componente principal de entrada del Agente 1. La opción de archivos es
 * visible siempre, pero mientras ENABLE_FILE_UPLOAD sea false muestra un
 * aviso de "funcionalidad en prueba" en lugar de procesar el archivo.
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ALLOWED_EXTENSIONS,
  ENABLE_FILE_UPLOAD,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
  FILE_INPUT_ACCEPT,
  formatFileSize,
} from '@/lib/constants/agent-1';
import { DetailModal } from '@/components/agents/shared/DetailModal';

interface FileUploaderProps {
  /** Callback cuando el usuario selecciona un archivo válido */
  onFileSelect: (file: File) => void;
  /** Indica si el archivo está siendo subido/procesado */
  isProcessing: boolean;
  /** Mensaje de error externo (ej: del API) */
  error: string | null;
  /** Callback opcional cuando se finaliza una transcripción en vivo */
  onTranscriptionComplete?: (text: string) => void;
}

export function FileUploader({ onFileSelect, isProcessing, error: externalError, onTranscriptionComplete }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [showUploadNotice, setShowUploadNotice] = useState(false);
  
  // ── Estado de grabación en vivo ──
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState('');
  
  // Usaremos useRef para mantener la instancia de SpeechRecognition
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const accumulatedTranscriptRef = useRef('');
  const isIntentionallyStoppedRef = useRef(false);
  const latestTranscriptionRef = useRef('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const error = externalError || localError;

  // ── Limpieza ──
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        // Al desmontar sí queremos detener todo
        isIntentionallyStoppedRef.current = true;
        recognitionRef.current.stop();
      }
    };
  }, []);

  // ── Validación del archivo en cliente ───────────────────────────
  const validateFile = useCallback((file: File): string | null => {
    const dotIndex = file.name.lastIndexOf('.');
    const extension = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : '';

    if (!ALLOWED_EXTENSIONS.includes(extension as typeof ALLOWED_EXTENSIONS[number])) {
      return `Formato "${extension || 'desconocido'}" no soportado. Usa: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `El archivo (${formatFileSize(file.size)}) excede el límite de ${MAX_FILE_SIZE_LABEL}.`;
    }

    return null;
  }, []);

  // ── Handler principal ──────────────────────────────────────────
  const handleFile = useCallback(
    (file: File) => {
      setLocalError(null);
      const validationError = validateFile(file);
      if (validationError) {
        setLocalError(validationError);
        return;
      }
      setSelectedFileName(file.name);
      onFileSelect(file);
    },
    [validateFile, onFileSelect]
  );

  // ── Intención de subir archivo ─────────────────────────────────
  // Mientras la carga esté deshabilitada, mostramos el aviso de
  // funcionalidad en prueba en lugar de abrir el selector.
  const handleUploadIntent = useCallback(() => {
    if (!ENABLE_FILE_UPLOAD) {
      setShowUploadNotice(true);
      return;
    }
    fileInputRef.current?.click();
  }, []);

  // ── Drag & Drop ────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (!ENABLE_FILE_UPLOAD) {
        setShowUploadNotice(true);
        return;
      }
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // ── Input file change ──────────────────────────────────────────
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset para permitir re-selección del mismo archivo
      e.target.value = '';
    },
    [handleFile]
  );

  // ── Grabación en vivo (SpeechRecognition) ──────────────────────────
  const startRecording = async () => {
    setLocalError(null);
    setLiveTranscription('');
    accumulatedTranscriptRef.current = '';
    latestTranscriptionRef.current = '';
    isIntentionallyStoppedRef.current = false;

    try {
      // Pedir permisos de micrófono explícitamente para asegurar que el navegador lo active
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Podemos detener el stream inmediatamente, solo queríamos asegurar los permisos
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error('Error de permisos de micrófono:', err);
      setLocalError('No se pudo acceder al micrófono. Por favor revisa los permisos del navegador.');
      return;
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setLocalError('Tu navegador no soporta reconocimiento de voz nativo. Por favor usa Google Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Sigue escuchando aunque haya pausas
    recognition.interimResults = true; // Muestra resultados parciales
    recognition.lang = 'es-ES';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      
      // Combinar texto anterior guardado con lo que está escuchando ahora mismo
      const combined = (accumulatedTranscriptRef.current + ' ' + currentTranscript).trim();
      latestTranscriptionRef.current = combined;
      setLiveTranscription(combined);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.warn('SpeechRecognition error:', event.error);
      // Si el error no es no-speech, mostramos alerta.
      // Si es no-speech, simplemente lo ignoramos y dejamos que el onend lo reinicie.
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setLocalError(`Error al escuchar: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // Si no fue detenido intencionalmente por el usuario, lo reiniciamos
      if (!isIntentionallyStoppedRef.current) {
        // Guardamos lo que haya transcrito hasta ahora para no perderlo al reiniciar
        // Usamos una función de setState para asegurarnos de tener el valor más reciente de liveTranscription
        setLiveTranscription((currentLiveText) => {
          accumulatedTranscriptRef.current = currentLiveText;
          return currentLiveText;
        });

        try {
          recognition.start();
        } catch(e) {
          console.error('Error al intentar reiniciar el reconocimiento de voz', e);
        }
      } else {
        setIsRecording(false);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setLocalError('Error al iniciar la grabación.');
    }
  };

  const stopRecording = () => {
    isIntentionallyStoppedRef.current = true;
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      
      const finalText = latestTranscriptionRef.current;
      if (finalText.trim().length > 0) {
        onTranscriptionComplete?.(finalText);
      } else {
        setLocalError('No se detectó audio/texto. Asegúrate de hablar claramente al micrófono.');
      }
    }
  };

  // ── Obtener icono según extensión ──────────────────────────────
  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'mp3' || ext === 'wav') return '🎵';
    if (ext === 'pdf') return '📄';
    if (ext === 'txt') return '📝';
    return '📁';
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4">
        {/* ── Zona de drop principal ───────────────────────────── */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!isProcessing && !isRecording) {
              handleUploadIntent();
            }
          }}
          className={[
            'group relative flex min-h-55 cursor-pointer flex-col items-center justify-center',
            'overflow-hidden rounded-xl border border-dashed p-6 text-center transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border-strong bg-surface hover:border-primary/50 hover:bg-surface-hover/40',
            isProcessing && 'pointer-events-none opacity-70',
            isRecording && 'cursor-default border-red-500/40',
            error && !isProcessing && 'border-red-500/40',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {/* Estado: Procesando archivo */}
          {isProcessing && selectedFileName && (
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm font-medium text-foreground">Procesando archivo…</p>
                <p className="text-[13px] text-muted">
                  {getFileIcon(selectedFileName)} {selectedFileName}
                </p>
              </div>
              <div className="h-1 w-48 overflow-hidden rounded-full bg-border">
                <div className="h-full w-1/3 animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full bg-primary" />
              </div>
            </div>
          )}

          {/* Estado: Grabando */}
          {!isProcessing && isRecording && (
            <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-4">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-foreground">
                  Escuchando…
                </span>
              </div>

              <div className="max-h-45 min-h-25 w-full overflow-y-auto rounded-lg border border-border bg-input p-4 text-left">
                <p className="text-sm italic leading-relaxed text-body">
                  {liveTranscription || 'Habla ahora, te estoy escuchando…'}
                </p>
              </div>

              <button
                id="stop-record-button"
                onClick={(e) => {
                  e.stopPropagation();
                  stopRecording();
                }}
                className="cursor-pointer rounded-lg bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Detener y revisar
              </button>
            </div>
          )}

          {/* Estado: Idle / Esperando archivo */}
          {!isProcessing && !isRecording && (
            <div className="relative z-10">
              <div
                className={[
                  'mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border transition-colors',
                  isDragging
                    ? 'border-primary/40 bg-primary/15'
                    : 'border-border bg-surface-muted group-hover:border-primary/30',
                ].join(' ')}
              >
                <svg
                  className={[
                    'h-6 w-6 transition-colors',
                    isDragging ? 'text-primary' : 'text-muted',
                  ].join(' ')}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                  />
                </svg>
              </div>

              <h3 className="mb-1.5 text-[15px] font-semibold text-foreground">
                {isDragging ? 'Suelta el archivo aquí' : 'Arrastra un archivo o elige un método'}
              </h3>
              <p className="mx-auto mb-5 max-w-md text-[13px] text-muted">
                Aceptamos {ALLOWED_EXTENSIONS.join(', ')}. Máx. {MAX_FILE_SIZE_LABEL}.
              </p>

              <button
                id="file-select-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUploadIntent();
                }}
                className="mx-auto inline-flex cursor-pointer items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Seleccionar archivo
              </button>
            </div>
          )}

          {/* Input oculto */}
          <input
            ref={fileInputRef}
            type="file"
            accept={FILE_INPUT_ACCEPT}
            onChange={handleInputChange}
            className="hidden"
            aria-label="Seleccionar archivo"
          />
        </div>

        {/* ── Acciones ─────────────────────────────────────────── */}
        {!isProcessing && !isRecording && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={handleUploadIntent}
              className="group flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-left transition-colors hover:bg-surface-hover"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
                <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h5 className="text-sm font-medium text-foreground">Subir archivo</h5>
                <p className="mt-0.5 text-xs text-muted">Documentos o audios</p>
              </div>
            </button>

            <button
              type="button"
              id="start-record-button"
              onClick={startRecording}
              className="group flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-left transition-colors hover:bg-surface-hover"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
                <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h5 className="text-sm font-medium text-foreground">Grabar audio</h5>
                <p className="mt-0.5 text-xs text-muted">Reunión en vivo</p>
              </div>
            </button>

            <button
              type="button"
              id="write-text-button"
              onClick={() => {
                if (onTranscriptionComplete) onTranscriptionComplete('');
              }}
              className="group flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-left transition-colors hover:bg-surface-hover"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
                <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </div>
              <div className="min-w-0">
                <h5 className="text-sm font-medium text-foreground">Escribir texto</h5>
                <p className="mt-0.5 text-xs text-muted">Notas o minutas</p>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* ── Mensaje de error ───────────────────────────────────── */}
      {error && (
        <div className="mt-3 rounded-lg border border-red-500/25 bg-red-500/10 px-3.5 py-2.5">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* ── Aviso: carga de archivos en prueba ─────────────────── */}
      <DetailModal
        open={showUploadNotice}
        onClose={() => setShowUploadNotice(false)}
        eyebrow="Funcionalidad en prueba"
        title="La carga de archivos llegará muy pronto"
        maxWidth="md"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-muted">
            Estamos desarrollando el MVP de Klarify y la carga de archivos
            (.mp3, .wav, .txt, .pdf) todavía está en proceso de prueba.
            Mientras tanto, puedes compartir el contexto de tu proyecto
            grabando audio en vivo o escribiendo el texto directamente.
          </p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setShowUploadNotice(false);
                startRecording();
              }}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-left transition-colors hover:bg-surface-hover"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
                <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h5 className="text-sm font-medium text-foreground">Grabar audio</h5>
                <p className="mt-0.5 text-xs text-muted">Reunión en vivo</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowUploadNotice(false);
                onTranscriptionComplete?.('');
              }}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-left transition-colors hover:bg-surface-hover"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
                <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </div>
              <div>
                <h5 className="text-sm font-medium text-foreground">Escribir texto</h5>
                <p className="mt-0.5 text-xs text-muted">Notas o minutas</p>
              </div>
            </button>
          </div>
        </div>
      </DetailModal>
    </div>
  );
}