/**
 * Data Access Layer — Entry Point
 *
 * All data operations in the app go through `dataProvider`.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  TO MIGRATE TO SQL SERVER:                                     │
 * │                                                                │
 * │  1. Create  src/data-access/providers/sqlserver.ts             │
 * │     implementing the DataProvider interface                    │
 * │                                                                │
 * │  2. Change the import below:                                   │
 * │     - import { firestoreProvider } from './providers/firestore' │
 * │     + import { sqlServerProvider } from './providers/sqlserver' │
 * │                                                                │
 * │  3. Update the export:                                         │
 * │     - export const dataProvider = firestoreProvider;            │
 * │     + export const dataProvider = sqlServerProvider;            │
 * │                                                                │
 * │  That's it. Zero frontend changes.                             │
 * └─────────────────────────────────────────────────────────────────┘
 */

import { firestoreProvider } from './providers/firestore';

export const dataProvider = firestoreProvider;

// Re-export types for convenience
export type { DataProvider, TenderRow, SupplierRow, PropertyRow, InvitationRow, UserRow, ListOptions } from './types';
