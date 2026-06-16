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

import { useState, useRef, useCallback } from 'react';
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
}

export function FileUploader({ onFileSelect, isProcessing, error: externalError }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const error = externalError || localError;

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
      {/* ── Zona de drop ───────────────────────────────────────── */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed',
          'px-6 py-16 text-center transition-all duration-300',
          'backdrop-blur-sm',
          isDragging
            ? 'border-[#005BBF] bg-[#005BBF]/10 shadow-[0_0_40px_rgba(0,91,191,0.15)]'
            : 'border-white/20 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.05]',
          isProcessing && 'pointer-events-none opacity-60',
          error && 'border-red-500/50',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Estado: Procesando */}
        {isProcessing && selectedFileName && (
          <div className="flex flex-col items-center gap-4">
            {/* Spinner */}
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/20 border-t-[#005BBF]" />
            <div className="flex flex-col items-center gap-1">
              <p className="text-sm font-medium text-white">
                Procesando archivo...
              </p>
              <p className="text-xs text-white/50">
                {getFileIcon(selectedFileName)} {selectedFileName}
              </p>
            </div>
            {/* Barra de progreso indeterminada */}
            <div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/3 animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full bg-[#005BBF]" />
            </div>
          </div>
        )}

        {/* Estado: Idle / Esperando archivo */}
        {!isProcessing && (
          <>
            {/* Icono de carga */}
            <div
              className={[
                'mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors duration-300',
                isDragging ? 'bg-[#005BBF]/20' : 'bg-white/[0.06]',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <svg
                className={[
                  'h-8 w-8 transition-colors duration-300',
                  isDragging ? 'text-[#005BBF]' : 'text-white/40',
                ]
                  .filter(Boolean)
                  .join(' ')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
            </div>

            {/* Texto principal */}
            <p className="mb-1 text-base font-medium text-white">
              {isDragging ? 'Suelta el archivo aquí' : 'Arrastra tu archivo aquí'}
            </p>
            <p className="mb-5 text-sm text-white/50">
              o selecciona un archivo desde tu equipo
            </p>

            {/* Botón de selección */}
            <button
              id="file-select-button"
              onClick={() => fileInputRef.current?.click()}
              className={[
                'rounded-xl border border-white/20 bg-white/10 px-6 py-3',
                'text-sm font-bold text-white backdrop-blur-sm',
                'transition-all duration-200',
                'hover:bg-white/15 hover:border-white/30',
                'active:scale-95',
                'cursor-pointer',
              ].join(' ')}
            >
              Seleccionar archivo
            </button>

            {/* Formatos aceptados */}
            <p className="mt-4 text-xs text-white/35">
              Formatos: {ALLOWED_EXTENSIONS.join(', ')} · Máximo {MAX_FILE_SIZE_LABEL}
            </p>
          </>
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

      {/* ── Mensaje de error ───────────────────────────────────── */}
      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
          <svg
            className="h-5 w-5 shrink-0 text-red-400 mt-0.5"
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
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
}
