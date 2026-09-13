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

  const primaryBtn =
    'inline-flex cursor-pointer items-center justify-center rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90';
  const secondaryBtn =
    'inline-flex cursor-pointer items-center justify-center rounded-lg bg-surface-muted px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground';

  return (
    <div className="w-full">
      {isProcessing ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-medium text-foreground">Procesando archivo…</p>
            {selectedFileName ? (
              <p className="text-[13px] text-muted">{selectedFileName}</p>
            ) : null}
          </div>
          <div className="h-1 w-40 overflow-hidden rounded-full bg-border">
            <div className="h-full w-1/3 animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full bg-foreground/70" />
          </div>
        </div>
      ) : null}

      {!isProcessing && isRecording ? (
        <div className="overflow-hidden rounded-xl border border-border bg-surface px-5 py-8">
          <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <span className="text-[12px] font-medium text-foreground">Escuchando…</span>
            </div>

            <div className="max-h-45 min-h-28 w-full overflow-y-auto rounded-lg border border-border bg-input px-4 py-3 text-left">
              <p className="text-sm italic leading-relaxed text-body">
                {liveTranscription || 'Habla ahora, te estoy escuchando…'}
              </p>
            </div>

            <button
              id="stop-record-button"
              type="button"
              onClick={stopRecording}
              className={primaryBtn}
            >
              Detener y revisar
            </button>
          </div>
        </div>
      ) : null}

      {!isProcessing && !isRecording ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={[
            'mx-auto flex w-full max-w-lg flex-col items-center rounded-xl border px-5 py-8 text-center transition-colors animate-[fadeIn_0.3s_ease-out]',
            isDragging
              ? 'border-dashed border-primary/40 bg-primary/5'
              : 'border-transparent',
          ].join(' ')}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-surface-muted">
            <svg
              className={['h-6 w-6', isDragging ? 'text-primary' : 'text-muted'].join(' ')}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12.75h6.75m-6.75 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>

          <h3 className="mt-5 text-[15px] font-semibold tracking-tight text-foreground">
            {isDragging ? 'Suelta el archivo aquí' : 'Comparte el contexto del proyecto'}
          </h3>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
            Escríbelo a mano, graba una reunión o arrastra un archivo. Extraemos los
            requerimientos a partir de eso.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              id="write-text-button"
              onClick={() => onTranscriptionComplete?.('')}
              className={primaryBtn}
            >
              Escribir texto
            </button>
            <button
              type="button"
              id="start-record-button"
              onClick={startRecording}
              className={secondaryBtn}
            >
              Grabar audio
            </button>
          </div>

          <button
            type="button"
            id="file-select-button"
            onClick={handleUploadIntent}
            className="mt-4 cursor-pointer text-[12px] text-subtle transition-colors hover:text-foreground"
          >
            Subir archivo · {ALLOWED_EXTENSIONS.join(', ')} · máx. {MAX_FILE_SIZE_LABEL}
          </button>
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept={FILE_INPUT_ACCEPT}
        onChange={handleInputChange}
        className="hidden"
        aria-label="Seleccionar archivo"
      />

      {error ? (
        <div className="mx-auto mt-3 max-w-lg rounded-lg border border-red-500/25 bg-red-500/10 px-3.5 py-2.5">
          <p className="text-sm text-danger">{error}</p>
        </div>
      ) : null}

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

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setShowUploadNotice(false);
                onTranscriptionComplete?.('');
              }}
              className={primaryBtn}
            >
              Escribir texto
            </button>
            <button
              type="button"
              onClick={() => {
                setShowUploadNotice(false);
                startRecording();
              }}
              className={secondaryBtn}
            >
              Grabar audio
            </button>
          </div>
        </div>
      </DetailModal>
    </div>
  );
}