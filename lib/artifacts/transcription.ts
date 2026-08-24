/**
 * @fileoverview Persistencia de la transcripción fuera del documento de proyecto.
 */

import 'server-only';

import type { TranscriptionResult } from '@/lib/types/agent-1';
import type { TranscriptionArtifact, TranscriptionPointer } from '@/lib/types/project-schema';
import { transcriptionDoc } from '@/lib/project-store/paths';

export {
  getTranscriptSegmentCount,
  isSlimTranscription,
  isTranscriptionPointer,
  isTranscriptionResult,
  pointerToSlimResult,
  toTranscriptionPointer,
} from '@/lib/artifacts/transcription-utils';

import { toTranscriptionPointer } from '@/lib/artifacts/transcription-utils';

export async function readTranscriptionArtifact(
  uid: string,
  projectId: string
): Promise<TranscriptionResult | null> {
  const snap = await transcriptionDoc(uid, projectId).get();
  if (!snap.exists) return null;
  const data = snap.data() as TranscriptionArtifact;
  return {
    fullText: data.fullText ?? '',
    segments: data.segments ?? [],
    duration: data.duration ?? 0,
    language: data.language ?? 'es',
  };
}

export async function writeTranscriptionArtifact(
  uid: string,
  projectId: string,
  result: TranscriptionResult
): Promise<TranscriptionPointer> {
  const artifact: TranscriptionArtifact = {
    fullText: result.fullText,
    segments: result.segments,
    duration: result.duration,
    language: result.language,
    updatedAt: Date.now(),
  };
  await transcriptionDoc(uid, projectId).set(JSON.parse(JSON.stringify(artifact)));
  return toTranscriptionPointer(result);
}

export async function deleteTranscriptionArtifact(uid: string, projectId: string): Promise<void> {
  await transcriptionDoc(uid, projectId).delete();
}
