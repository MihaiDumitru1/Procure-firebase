/**
 * SQL Server implementation of DataProvider.
 *
 * MIGRATION TEMPLATE — fill in the API calls to your SQL Server backend.
 *
 * Architecture:
 *   Frontend (React) → REST API → SQL Server
 *
 * This provider calls a REST API that you build on your backend.
 * The backend connects to SQL Server using your preferred ORM/driver:
 *   - mssql (tedious) — raw queries
 *   - Prisma — type-safe ORM
 *   - Drizzle — lightweight ORM
 *   - Knex — query builder
 *
 * API endpoints expected:
 *   GET    /api/tenders              → list tenders
 *   GET    /api/tenders/:id          → get tender by id
 *   POST   /api/tenders              → create tender
 *   PUT    /api/tenders/:id          → update tender
 *   DELETE /api/tenders/:id          → delete tender
 *   ... (same pattern for suppliers, properties, invitations)
 *   POST   /api/manage-users         → user CRUD (admin)
 *   POST   /api/evaluate-offers      → AI evaluation
 */

import type { DataProvider, TenderRow, SupplierRow, PropertyRow, InvitationRow, UserRow, ListOptions } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function getAuthHeaders(): Promise<Record<string, string>> {
  // Option A: Keep Firebase Auth (works independently of DB)
  // import { auth } from '@/integrations/firebase/client';
  // const token = await auth.currentUser?.getIdToken();
  // return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Option B: Use your own auth (JWT, session cookie, etc.)
  const token = localStorage.getItem('auth_token') ?? '';
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function apiGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function apiPost<T>(path: string, body: any): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `API error: ${res.status}`);
  }
  return res.json();
}

async function apiPut(path: string, body: any): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}

async function apiDelete(path: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}

// ─── SQL Server Provider ───────────────────────────────────────────────────────

export const sqlServerProvider: DataProvider = {

  tenders: {
    list:     (opts) => apiGet(`/tenders?${buildQueryString(opts)}`),
    getById:  (id) => apiGet(`/tenders/${id}`),
    create:   (data) => apiPost<{ id: string }>('/tenders', data).then(r => r.id),
    update:   (id, data) => apiPut(`/tenders/${id}`, data),
    delete:   (id) => apiDelete(`/tenders/${id}`),
  },

  suppliers: {
    list:     (opts) => apiGet(`/suppliers?${buildQueryString(opts)}`),
    getById:  (id) => apiGet(`/suppliers/${id}`),
    upsert:   (data) => apiPost('/suppliers', data).then(() => {}),
    delete:   (id) => apiDelete(`/suppliers/${id}`),
  },

  properties: {
    list:     (opts) => apiGet(`/properties?${buildQueryString(opts)}`),
    getById:  (id) => apiGet(`/properties/${id}`),
    create:   (data) => apiPost<{ id: string }>('/properties', data).then(r => r.id),
    update:   (id, data) => apiPut(`/properties/${id}`, data),
    delete:   (id) => apiDelete(`/properties/${id}`),
  },

  invitations: {
    listBySupplierIds: (ids) => apiPost('/invitations/by-suppliers', { supplier_ids: ids }),
    listByTenderId:    (id) => apiGet(`/invitations?tender_id=${id}`),
    createBatch:       (tenderId, supplierIds, status, invitedBy) =>
      apiPost('/invitations/batch', { tender_id: tenderId, supplier_ids: supplierIds, status, invited_by: invitedBy }).then(() => {}),
    updateStatus:      (id, status) => apiPut(`/invitations/${id}`, { status }),
    delete:            (id) => apiDelete(`/invitations/${id}`),
  },

  users: {
    list:              () => apiPost('/manage-users', { action: 'list' }),
    create:            (data) => apiPost('/manage-users', { action: 'create', ...data }),
    update:            (data) => apiPost('/manage-users', { action: 'update', ...data }).then(() => {}),
    delete:            (userId) => apiPost('/manage-users', { action: 'delete', user_id: userId }).then(() => {}),
    getCurrentProfile: (uid) => apiGet(`/users/${uid}`),
  },

  ai: {
    evaluateOffers: (body) => apiPost('/evaluate-offers', body),
  },
};

// ─── Utility ───────────────────────────────────────────────────────────────────

function buildQueryString(opts?: ListOptions): string {
  if (!opts) return '';
  const params = new URLSearchParams();
  if (opts.orderBy) params.set('order_by', opts.orderBy);
  if (opts.orderDir) params.set('order_dir', opts.orderDir);
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.offset) params.set('offset', String(opts.offset));
  return params.toString();
}


/**
 * ─── SQL SERVER SCHEMA (for your backend team) ────────────────────────────────
 *
 * CREATE TABLE tenders (
 *   id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
 *   reference_code  NVARCHAR(50),
 *   title           NVARCHAR(255) NOT NULL,
 *   description     NVARCHAR(MAX),
 *   category        NVARCHAR(50),
 *   status          NVARCHAR(20) DEFAULT 'draft',
 *   participation_deadline      DATE,
 *   participation_deadline_time NVARCHAR(5) DEFAULT '17:00',
 *   submission_start_date       DATE,
 *   submission_start_time       NVARCHAR(5) DEFAULT '09:00',
 *   submission_end_date         DATE,
 *   submission_end_time         NVARCHAR(5) DEFAULT '17:00',
 *   min_participants INT DEFAULT 3,
 *   budget          NVARCHAR(100),
 *   location        NVARCHAR(255),
 *   spv_id          UNIQUEIDENTIFIER REFERENCES properties(id),
 *   documents       NVARCHAR(MAX),    -- JSON
 *   questions       NVARCHAR(MAX),    -- JSON
 *   rounds          NVARCHAR(MAX),    -- JSON
 *   articles        NVARCHAR(MAX),    -- JSON
 *   compulsory_offer_items NVARCHAR(MAX), -- JSON
 *   selection_criteria     NVARCHAR(MAX), -- JSON
 *   current_round   INT DEFAULT 1,
 *   total_rounds    INT DEFAULT 1,
 *   created_by      UNIQUEIDENTIFIER REFERENCES users(id),
 *   created_at      DATETIME2 DEFAULT GETUTCDATE(),
 *   updated_at      DATETIME2
 * );
 *
 * CREATE TABLE suppliers (
 *   id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
 *   name            NVARCHAR(255) NOT NULL,
 *   fiscal_code     NVARCHAR(50),
 *   categories      NVARCHAR(MAX),    -- JSON array
 *   contacts        NVARCHAR(MAX),    -- JSON array
 *   active_offers   INT DEFAULT 0,
 *   total_contracts INT DEFAULT 0,
 *   created_by      UNIQUEIDENTIFIER,
 *   created_at      DATETIME2 DEFAULT GETUTCDATE(),
 *   updated_at      DATETIME2
 * );
 *
 * CREATE TABLE properties (
 *   id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
 *   name            NVARCHAR(255) NOT NULL,
 *   code            NVARCHAR(50),
 *   address         NVARCHAR(500),
 *   city            NVARCHAR(100),
 *   country         NVARCHAR(100),
 *   property_type   NVARCHAR(50),
 *   total_area      DECIMAL(12,2),
 *   year_built      INT,
 *   manager         NVARCHAR(255),
 *   description     NVARCHAR(MAX),
 *   created_at      DATETIME2 DEFAULT GETUTCDATE(),
 *   updated_at      DATETIME2
 * );
 *
 * CREATE TABLE tender_invitations (
 *   id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
 *   tender_id       UNIQUEIDENTIFIER NOT NULL REFERENCES tenders(id),
 *   supplier_id     UNIQUEIDENTIFIER NOT NULL REFERENCES suppliers(id),
 *   status          NVARCHAR(20) DEFAULT 'pending',
 *   invited_by      UNIQUEIDENTIFIER REFERENCES users(id),
 *   created_at      DATETIME2 DEFAULT GETUTCDATE()
 * );
 *
 * CREATE TABLE users (
 *   id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
 *   email           NVARCHAR(255) UNIQUE NOT NULL,
 *   full_name       NVARCHAR(255),
 *   role            NVARCHAR(50),
 *   company         NVARCHAR(255),
 *   password_hash   NVARCHAR(255),   -- if not using Firebase Auth
 *   created_at      DATETIME2 DEFAULT GETUTCDATE()
 * );
 *
 * -- Indexes
 * CREATE INDEX IX_tenders_status ON tenders(status);
 * CREATE INDEX IX_tenders_created_at ON tenders(created_at DESC);
 * CREATE INDEX IX_invitations_supplier ON tender_invitations(supplier_id);
 * CREATE INDEX IX_invitations_tender ON tender_invitations(tender_id);
 * CREATE INDEX IX_suppliers_created_at ON suppliers(created_at);
 */
