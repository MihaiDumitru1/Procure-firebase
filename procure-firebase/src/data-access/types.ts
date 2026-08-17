/**
 * Data Access Layer — Interface
 *
 * This file defines the contract for ALL database operations in ProCure.
 * The frontend imports ONLY from this interface (via the concrete provider).
 *
 * To migrate from Firestore → SQL Server:
 *   1. Create  src/data-access/providers/sqlserver.ts  implementing DataProvider
 *   2. Change  src/data-access/index.ts  to export the SQL Server provider
 *   3. Done — zero frontend changes required.
 */

import { Tender, SPV, Supplier } from '@/types/tender';

// ─── Row types (DB-shape, snake_case) ──────────────────────────────────────────

export interface TenderRow {
  id: string;
  reference_code?: string;
  title: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
  participation_deadline: string;
  participation_deadline_time?: string;
  submission_start_date: string;
  submission_start_time?: string;
  submission_end_date: string;
  submission_end_time?: string;
  min_participants: number;
  budget?: string;
  location: string;
  spv_id: string;
  documents: any[];
  questions: any[];
  rounds: any[];
  articles: any[];
  compulsory_offer_items: any[];
  selection_criteria: any[];
  current_round: number;
  total_rounds: number;
  created_by: string;
}

export interface SupplierRow {
  id: string;
  name: string;
  fiscal_code: string;
  categories: string[];
  contacts: any[];
  active_offers: number;
  total_contracts: number;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export interface PropertyRow {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  country: string;
  property_type: string;
  total_area: number;
  year_built?: number;
  manager: string;
  description?: string;
  created_at: string;
}

export interface InvitationRow {
  id: string;
  tender_id: string;
  supplier_id: string;
  status: string;
  invited_by: string;
  created_at: string;
}

export interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  company?: string;
  created_at: string;
}

// ─── Query options ─────────────────────────────────────────────────────────────

export interface ListOptions {
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// ─── Data Provider Interface ───────────────────────────────────────────────────

export interface DataProvider {
  // ── Tenders ──────────────────────────────────────────────────────────────
  tenders: {
    list(options?: ListOptions): Promise<TenderRow[]>;
    getById(id: string): Promise<TenderRow | null>;
    create(data: Omit<TenderRow, 'id' | 'created_at'>): Promise<string>;
    update(id: string, data: Partial<TenderRow>): Promise<void>;
    delete(id: string): Promise<void>;
  };

  // ── Suppliers ────────────────────────────────────────────────────────────
  suppliers: {
    list(options?: ListOptions): Promise<SupplierRow[]>;
    getById(id: string): Promise<SupplierRow | null>;
    upsert(data: SupplierRow): Promise<void>;
    delete(id: string): Promise<void>;
  };

  // ── Properties (SPVs) ────────────────────────────────────────────────────
  properties: {
    list(options?: ListOptions): Promise<PropertyRow[]>;
    getById(id: string): Promise<PropertyRow | null>;
    create(data: Omit<PropertyRow, 'id' | 'created_at'>): Promise<string>;
    update(id: string, data: Partial<PropertyRow>): Promise<void>;
    delete(id: string): Promise<void>;
  };

  // ── Tender Invitations ───────────────────────────────────────────────────
  invitations: {
    listBySupplierIds(supplierIds: string[]): Promise<InvitationRow[]>;
    listByTenderId(tenderId: string): Promise<InvitationRow[]>;
    createBatch(tenderId: string, supplierIds: string[], status: string, invitedBy: string): Promise<void>;
    updateStatus(id: string, status: string): Promise<void>;
    delete(id: string): Promise<void>;
  };

  // ── Users (admin operations — goes through API) ──────────────────────────
  users: {
    list(): Promise<UserRow[]>;
    create(data: { email: string; password: string; full_name: string; role: string; company?: string }): Promise<{ id: string }>;
    update(data: { user_id: string; full_name?: string; role?: string; password?: string; company?: string }): Promise<void>;
    delete(userId: string): Promise<void>;
    getCurrentProfile(uid: string): Promise<UserRow | null>;
  };

  // ── AI Evaluation (goes through API) ─────────────────────────────────────
  ai: {
    evaluateOffers(body: any): Promise<any>;
  };
}
