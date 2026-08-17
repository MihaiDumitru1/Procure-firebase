/**
 * Firestore implementation of DataProvider.
 *
 * This is the ONLY file that imports firebase/firestore.
 * To migrate to SQL Server, create a new provider and swap the export in index.ts.
 */

import {
  collection, getDocs, getDoc, doc, setDoc, addDoc, deleteDoc, updateDoc,
  query, where, orderBy as fsOrderBy, limit as fsLimit, documentId,
} from 'firebase/firestore';
import { db, auth } from '@/integrations/firebase/client';
import type { DataProvider, TenderRow, SupplierRow, PropertyRow, InvitationRow, UserRow, ListOptions } from './types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

async function apiCall(endpoint: string, body: any): Promise<any> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) throw new Error('Rate limit exceeded. Please try again in a few minutes.');
  if (res.status === 402) throw new Error('Insufficient AI credits.');
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function buildQuery(col: any, options?: ListOptions) {
  const constraints: any[] = [];
  if (options?.orderBy) {
    constraints.push(fsOrderBy(options.orderBy, options.orderDir ?? 'asc'));
  }
  if (options?.limit) {
    constraints.push(fsLimit(options.limit));
  }
  return query(col, ...constraints);
}

// ─── Firestore Provider ────────────────────────────────────────────────────────

export const firestoreProvider: DataProvider = {

  // ── Tenders ──────────────────────────────────────────────────────────────
  tenders: {
    async list(options?: ListOptions): Promise<TenderRow[]> {
      const q = buildQuery(
        collection(db, 'tenders'),
        options ?? { orderBy: 'created_at', orderDir: 'desc' }
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as TenderRow));
    },

    async getById(id: string): Promise<TenderRow | null> {
      const snap = await getDoc(doc(db, 'tenders', id));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as TenderRow;
    },

    async create(data): Promise<string> {
      const clean = JSON.parse(JSON.stringify(data));
      const docRef = await addDoc(collection(db, 'tenders'), {
        ...clean,
        created_at: new Date().toISOString(),
      });
      return docRef.id;
    },

    async update(id, data): Promise<void> {
      const clean = JSON.parse(JSON.stringify(data));
      await updateDoc(doc(db, 'tenders', id), {
        ...clean,
        updated_at: new Date().toISOString(),
      });
    },

    async delete(id): Promise<void> {
      await deleteDoc(doc(db, 'tenders', id));
    },
  },

  // ── Suppliers ────────────────────────────────────────────────────────────
  suppliers: {
    async list(options?: ListOptions): Promise<SupplierRow[]> {
      const q = buildQuery(
        collection(db, 'suppliers'),
        options ?? { orderBy: 'created_at', orderDir: 'asc' }
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as SupplierRow));
    },

    async getById(id: string): Promise<SupplierRow | null> {
      const snap = await getDoc(doc(db, 'suppliers', id));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as SupplierRow;
    },

    async upsert(supplier: SupplierRow): Promise<void> {
      const { id, ...data } = supplier;
      // Firestore rejects undefined values — strip them recursively
      const clean = JSON.parse(JSON.stringify(data));
      await setDoc(doc(db, 'suppliers', id), {
        ...clean,
        updated_at: new Date().toISOString(),
      }, { merge: true });
    },

    async delete(id: string): Promise<void> {
      await deleteDoc(doc(db, 'suppliers', id));
    },
  },

  // ── Properties ───────────────────────────────────────────────────────────
  properties: {
    async list(options?: ListOptions): Promise<PropertyRow[]> {
      const q = buildQuery(
        collection(db, 'properties'),
        options ?? { orderBy: 'created_at', orderDir: 'asc' }
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as PropertyRow));
    },

    async getById(id: string): Promise<PropertyRow | null> {
      const snap = await getDoc(doc(db, 'properties', id));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as PropertyRow;
    },

    async create(data): Promise<string> {
      const clean = JSON.parse(JSON.stringify(data));
      const docRef = await addDoc(collection(db, 'properties'), {
        ...clean,
        created_at: new Date().toISOString(),
      });
      return docRef.id;
    },

    async update(id, data): Promise<void> {
      const clean = JSON.parse(JSON.stringify(data));
      await updateDoc(doc(db, 'properties', id), {
        ...clean,
        updated_at: new Date().toISOString(),
      });
    },

    async delete(id): Promise<void> {
      await deleteDoc(doc(db, 'properties', id));
    },
  },

  // ── Invitations ──────────────────────────────────────────────────────────
  invitations: {
    async listBySupplierIds(supplierIds: string[]): Promise<InvitationRow[]> {
      if (supplierIds.length === 0) return [];
      // Firestore 'in' limit = 10 — batch if needed
      const all: InvitationRow[] = [];
      for (let i = 0; i < supplierIds.length; i += 10) {
        const batch = supplierIds.slice(i, i + 10);
        const q = query(collection(db, 'tender_invitations'), where('supplier_id', 'in', batch));
        const snap = await getDocs(q);
        snap.docs.forEach(d => all.push({ id: d.id, ...d.data() } as InvitationRow));
      }
      return all;
    },

    async listByTenderId(tenderId: string): Promise<InvitationRow[]> {
      const q = query(collection(db, 'tender_invitations'), where('tender_id', '==', tenderId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as InvitationRow));
    },

    async createBatch(tenderId, supplierIds, status, invitedBy): Promise<void> {
      await Promise.all(supplierIds.map(supplierId =>
        addDoc(collection(db, 'tender_invitations'), {
          tender_id: tenderId,
          supplier_id: supplierId,
          status,
          invited_by: invitedBy,
          created_at: new Date().toISOString(),
        })
      ));
    },

    async updateStatus(id, status): Promise<void> {
      await updateDoc(doc(db, 'tender_invitations', id), { status });
    },

    async delete(id): Promise<void> {
      await deleteDoc(doc(db, 'tender_invitations', id));
    },
  },

  // ── Users (via API — works with both Firebase Auth and future SQL auth) ─
  users: {
    list: () => apiCall('manage-users', { action: 'list' }),

    async create(data) {
      const result = await apiCall('manage-users', { action: 'create', ...data });
      return { id: result.user?.id ?? result.id };
    },

    async update(data) {
      await apiCall('manage-users', { action: 'update', ...data });
    },

    async delete(userId) {
      await apiCall('manage-users', { action: 'delete', user_id: userId });
    },

    async getCurrentProfile(uid: string): Promise<UserRow | null> {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as UserRow;
    },
  },

  // ── AI ───────────────────────────────────────────────────────────────────
  ai: {
    evaluateOffers: (body) => apiCall('evaluate-offers', body),
  },
};
