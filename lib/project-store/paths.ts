/**
 * @fileoverview Rutas Firestore del proyecto (doc raíz + subcolecciones).
 */

import 'server-only';

import { adminDb } from '@/lib/firebase-admin';

export function userDocRef(uid: string) {
  return adminDb.collection('users').doc(uid);
}

export function projectsColRef(uid: string) {
  return userDocRef(uid).collection('projects');
}

export function projectRef(uid: string, projectId: string) {
  return projectsColRef(uid).doc(projectId);
}

export function artifactsCol(uid: string, projectId: string) {
  return projectRef(uid, projectId).collection('artifacts');
}

export function transcriptionDoc(uid: string, projectId: string) {
  return artifactsCol(uid, projectId).doc('transcription');
}

export function pipelineHistoryCol(uid: string, projectId: string) {
  return projectRef(uid, projectId).collection('pipelineHistory');
}

export function pipelineHistoryDoc(uid: string, projectId: string, key: string) {
  return pipelineHistoryCol(uid, projectId).doc(key);
}

export function backlogRoot(uid: string, projectId: string) {
  return projectRef(uid, projectId).collection('backlog');
}

export function backlogLiveDoc(uid: string, projectId: string) {
  return backlogRoot(uid, projectId).doc('live');
}

export function backlogEpicsCol(uid: string, projectId: string) {
  return backlogRoot(uid, projectId).doc('epics').collection('items');
}

export function backlogStoriesCol(uid: string, projectId: string) {
  return backlogRoot(uid, projectId).doc('stories').collection('items');
}

export function pipelineMetaDoc(uid: string, projectId: string) {
  return projectRef(uid, projectId).collection('pipeline').doc('meta');
}

export function executionStoriesCol(uid: string, projectId: string) {
  return projectRef(uid, projectId).collection('execution').doc('stories').collection('items');
}
