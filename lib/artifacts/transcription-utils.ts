/**
 * @fileoverview Helpers puros de transcripción (seguros para el cliente).
 */

import type { TranscriptionResult } from '@/lib/types/agent-1';
import {
  TRANSCRIPTION_ARTIFACT_ID,
  TRANSCRIPTION_PREVIEW_CHARS,
  type TranscriptionPointer,
} from '@/lib/types/project-schema';

export function isTranscriptionPointer(value: unknown): value is TranscriptionPointer {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as TranscriptionPointer;
  return candidate.artifactId === TRANSCRIPTION_ARTIFACT_ID && typeof candidate.preview === 'string';
}

export function isTranscriptionResult(value: unknown): value is TranscriptionResult {
  if (!value || typeof value !== 'object') return false;
  if (isTranscriptionPointer(value)) return false;
  const candidate = value as TranscriptionResult;
  return typeof candidate.fullText === 'string' && Array.isArray(candidate.segments);
}

export function isSlimTranscription(value: TranscriptionResult): boolean {
  return value.segments.length === 0 && value.fullText.length <= TRANSCRIPTION_PREVIEW_CHARS;
}

export function toTranscriptionPointer(result: TranscriptionResult): TranscriptionPointer {
  return {
    artifactId: TRANSCRIPTION_ARTIFACT_ID,
    duration: result.duration,
    language: result.language,
    preview: result.fullText.slice(0, TRANSCRIPTION_PREVIEW_CHARS),
    segmentCount: result.segments.length,
  };
}

export function pointerToSlimResult(pointer: TranscriptionPointer): TranscriptionResult {
  return {
    fullText: pointer.preview,
    segments: [],
    duration: pointer.duration,
    language: pointer.language,
  };
}

export function getTranscriptSegmentCount(
  transcription: TranscriptionResult | TranscriptionPointer | null | undefined
): number {
  if (!transcription) return 0;
  if (isTranscriptionPointer(transcription)) return transcription.segmentCount;
  return transcription.segments.length;
}
