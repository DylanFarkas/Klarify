/**
 * @fileoverview FileUploader — Zona de carga de archivos con drag & drop.
 *
 * Componente principal de entrada del Agente 1. Permite al usuario
 * arrastrar o seleccionar archivos (.mp3, .wav, .txt, .pdf) con
 * validación en cliente (tipo + tamaño ≤ 50 MB).
 *
 * Muestra estados visuales para: idle, dragging, uploading, error.
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
  FILE_INPUT_ACCEPT,
  formatFileSize,
} from '@/lib/constants/agent-1';

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
      <div className="grid grid-cols-12 gap-6">
        {/* ── Zona de drop principal ───────────────────────────── */}
        <div className="col-span-12">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (!isProcessing && !isRecording) {
                fileInputRef.current?.click();
              }
            }}
            className={[
              'group relative flex h-[min(400px,55vh)] cursor-pointer flex-col items-center justify-center',
              'overflow-hidden rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-300',
              isDragging
                ? 'border-[#005BBF] bg-[#005BBF]/10 shadow-[0_8px_32px_rgba(0,91,191,0.2)]'
                : 'border-slate-300 bg-slate-50 shadow-sm hover:border-[#005BBF]/60 hover:shadow-md dark:border-white/20 dark:bg-white/[0.02]',
              isProcessing && 'pointer-events-none opacity-70',
              isRecording && 'cursor-default border-red-500/40',
              error && !isProcessing && 'border-red-500/40',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {/* Acento de fondo al hover */}
            <div
              className={[
                'pointer-events-none absolute inset-0 bg-[#005BBF]/5 transition-opacity duration-300',
                isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              ].join(' ')}
              aria-hidden="true"
            />

            {/* Estado: Procesando */}
            {isProcessing && selectedFileName && (
              <div className="relative z-10 flex flex-col items-center gap-5">
                <div className="h-14 w-14 animate-spin rounded-full border-2 border-slate-200 border-t-[#005BBF] dark:border-white/15" />
                <div className="flex flex-col items-center gap-1">
                  <p className="text-base font-semibold text-slate-900 dark:text-white">
                    Procesando archivo...
                  </p>
                  <p className="text-sm text-slate-500 dark:text-white/50">
                    {getFileIcon(selectedFileName)} {selectedFileName}
                  </p>
                </div>
                <div className="h-1.5 w-56 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                  <div className="h-full w-1/3 animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full bg-[#005BBF]" />
                </div>
              </div>
            )}

            {/* Estado: Grabando */}
            {!isProcessing && isRecording && (
              <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-5 animate-[fadeIn_0.3s_ease-out]">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                  </span>
                  <span className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Escuchando...
                  </span>
                </div>

                <div className="min-h-[120px] w-full max-h-[200px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-5 text-left dark:border-white/10 dark:bg-black/30">
                  <p className="text-sm italic leading-relaxed text-slate-700 dark:text-white/80">
                    {liveTranscription || 'Habla ahora, te estoy escuchando...'}
                  </p>
                </div>

                <button
                  id="stop-record-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    stopRecording();
                  }}
                  className={[
                    'rounded-xl bg-white px-8 py-3 text-sm font-bold text-black',
                    'transition-all duration-200 cursor-pointer',
                    'hover:scale-105 hover:bg-gray-100 active:scale-95',
                  ].join(' ')}
                >
                  Detener grabación y Revisar
                </button>
              </div>
            )}

            {/* Estado: Idle / Esperando archivo */}
            {!isProcessing && !isRecording && (
              <div className="relative z-10">
                <div
                  className={[
                    'mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border transition-all duration-500',
                    isDragging
                      ? 'scale-105 border-[#005BBF]/40 bg-[#005BBF]/20'
                      : 'border-slate-200 bg-slate-100 group-hover:scale-105 group-hover:border-[#005BBF]/30 group-hover:bg-[#005BBF]/10 dark:border-white/15 dark:bg-white/[0.06]',
                  ].join(' ')}
                >
                  <svg
                    className={[
                      'h-10 w-10 transition-colors duration-300',
                      isDragging ? 'text-[#005BBF]' : 'text-[#005BBF]/80',
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

                <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
                  {isDragging ? 'Suelta el archivo aquí' : 'Arrastra tu archivo aquí o selecciona un método'}
                </h3>
                <p className="mx-auto mb-8 max-w-md text-sm text-slate-500 dark:text-white/50">
                  Aceptamos archivos {ALLOWED_EXTENSIONS.join(', ')}. Tamaño máximo: {MAX_FILE_SIZE_LABEL}.
                </p>

                <button
                  id="file-select-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className={[
                    'mx-auto inline-flex items-center gap-2 rounded-xl bg-[#005BBF] px-8 py-3',
                    'text-sm font-bold text-white shadow-[0_4px_20px_rgba(0,91,191,0.35)]',
                    'transition-all duration-200 cursor-pointer',
                    'hover:bg-[#004a9e] hover:shadow-lg active:scale-95',
                  ].join(' ')}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                  </svg>
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
        </div>

        {/* ── Tarjetas de acción ───────────────────────────────── */}
        {!isProcessing && !isRecording && (
          <div className="col-span-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Subir Archivo */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={[
                'group rounded-2xl border border-slate-200 bg-white p-6 text-left',
                'transition-all duration-200 cursor-pointer',
                'hover:border-[#005BBF]/50 hover:bg-slate-50 hover:shadow-md dark:border-white/15 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]',
              ].join(' ')}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#005BBF]/15 transition-transform duration-200 group-hover:scale-110">
                <svg className="h-7 w-7 text-[#005BBF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h5 className="mb-1 font-bold text-slate-900 dark:text-white">Subir Archivo</h5>
              <p className="text-xs text-slate-500 dark:text-white/50">Importa documentos o audios pregrabados.</p>
            </button>

            {/* Grabar Audio */}
            <button
              type="button"
              id="start-record-button"
              onClick={startRecording}
              className={[
                'group rounded-2xl border border-slate-200 bg-white p-6 text-left',
                'transition-all duration-200 cursor-pointer',
                'hover:border-red-500/50 hover:bg-slate-50 hover:shadow-md dark:border-white/15 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]',
              ].join(' ')}
            >
              <div className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/15 transition-transform duration-200 group-hover:scale-110">
                <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h5 className="mb-1 font-bold text-slate-900 dark:text-white">Grabar Audio</h5>
              <p className="text-xs text-slate-500 dark:text-white/50">Captura una reunión en vivo ahora mismo.</p>
            </button>

            {/* Escribir Texto */}
            <button
              type="button"
              id="write-text-button"
              onClick={() => {
                if (onTranscriptionComplete) onTranscriptionComplete('');
              }}
              className={[
                'group rounded-2xl border border-slate-200 bg-white p-6 text-left',
                'transition-all duration-200 cursor-pointer',
                'hover:border-slate-300 hover:bg-slate-50 hover:shadow-md dark:border-white/15 dark:bg-white/[0.03] dark:hover:border-white/30 dark:hover:bg-white/[0.05]',
              ].join(' ')}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 transition-transform duration-200 group-hover:scale-110 dark:bg-white/10">
                <svg className="h-7 w-7 text-slate-500 dark:text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </div>
              <h5 className="mb-1 font-bold text-slate-900 dark:text-white">Escribir Texto</h5>
              <p className="text-xs text-slate-500 dark:text-white/50">Pega minutas de reunión o notas rápidas.</p>
            </button>
          </div>
        )}
      </div>

      {/* ── Mensaje de error ───────────────────────────────────── */}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3">
          <svg
            className="mt-0.5 h-5 w-5 shrink-0 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
}