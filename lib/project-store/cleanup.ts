/**
 * @fileoverview Borrado de subcolecciones del proyecto.
 */

import 'server-only';

import { adminDb } from '@/lib/firebase-admin';
import {
  artifactsCol,
  backlogEpicsCol,
  backlogLiveDoc,
  backlogStoriesCol,
  executionStoriesCol,
  pipelineHistoryCol,
  pipelineMetaDoc,
} from '@/lib/project-store/paths';

async function deleteQueryBatch(col: FirebaseFirestore.CollectionReference): Promise<void> {
  const snap = await col.get();
  if (snap.empty) return;
  const CHUNK = 400;
  for (let i = 0; i < snap.docs.length; i += CHUNK) {
    const batch = adminDb.batch();
    for (const doc of snap.docs.slice(i, i + CHUNK)) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }
}

export async function deleteProjectSlices(uid: string, projectId: string): Promise<void> {
  await Promise.all([
    deleteQueryBatch(artifactsCol(uid, projectId)),
    deleteQueryBatch(pipelineHistoryCol(uid, projectId)),
    deleteQueryBatch(backlogEpicsCol(uid, projectId)),
    deleteQueryBatch(backlogStoriesCol(uid, projectId)),
    deleteQueryBatch(executionStoriesCol(uid, projectId)),
    backlogLiveDoc(uid, projectId).delete().catch(() => undefined),
    pipelineMetaDoc(uid, projectId).delete().catch(() => undefined),
  ]);
}
