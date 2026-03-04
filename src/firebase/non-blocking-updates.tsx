'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import {FirestorePermissionError} from '@/firebase/errors';

function parseEntityFromPath(path: string) {
  const parts = path.split('/');
  const entityType = parts[parts.length - 2] || parts[parts.length - 1] || 'unknown';
  const entityId = parts.length % 2 === 0 ? parts[parts.length - 1] : undefined;
  return { entityType, entityId };
}

function sendAuditLog(operation: string, path: string, data?: any) {
  const { entityType, entityId } = parseEntityFromPath(path);
  fetch('/api/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: operation,
      entityType,
      entityId,
      entityName: data?.name || data?.firmName || data?.companyName || entityId || '',
      changes: data ? { fields: Object.keys(data) } : {},
    }),
  }).catch(() => {});
}

export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options: SetOptions) {
  setDoc(docRef, data, options).then(() => {
    sendAuditLog('set', docRef.path, data);
  }).catch(error => {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: 'write',
        requestResourceData: data,
      })
    )
  })
}

export function addDocumentNonBlocking(colRef: CollectionReference, data: any) {
  const promise = addDoc(colRef, data)
    .then((docRef) => {
      sendAuditLog('create', colRef.path + '/' + docRef.id, data);
      return docRef;
    })
    .catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: colRef.path,
          operation: 'create',
          requestResourceData: data,
        })
      )
    });
  return promise;
}

export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  updateDoc(docRef, data)
    .then(() => {
      sendAuditLog('update', docRef.path, data);
    })
    .catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: data,
        })
      )
    });
}

export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  deleteDoc(docRef)
    .then(() => {
      sendAuditLog('delete', docRef.path);
    })
    .catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        })
      )
    });
}