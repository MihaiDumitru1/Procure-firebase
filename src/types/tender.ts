export type TenderStatus = 'draft' | 'active' | 'awarded' | 'closed';

export type PropertyType = 
  | 'office'
  | 'retail'
  | 'industrial'
  | 'residential'
  | 'mixed-use'
  | 'logistics'
  | 'other';

export interface SPV {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  country: string;
  propertyType: PropertyType;
  totalArea: number; // m²
  yearBuilt?: number;
  manager: string;
  description?: string;
}

export type ServiceCategory = 
  | 'technical-maintenance' 
  | 'cleaning' 
  | 'landscaping' 
  | 'security' 
  | 'waste-management'
  | 'pest-control'
  | 'other';

/** Extended roles: app-admin > tender-organizer > supplier */
export type UserRole = 'app-admin' | 'tender-organizer' | 'procurement-officer' | 'supplier' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company?: string;
  avatar?: string;
}

export interface Document {
  id: string;
  name: string;
  type: 'internal' | 'public';
  size: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface Question {
  id: string;
  question: string;
  askedBy: string;
  askedAt: string;
  answer?: string;
  answeredAt?: string;
  answeredBy?: string;
}

export interface TenderArticle {
  id: string;
  position: number;
  description: string;
  unit: string; // e.g. m², h, pcs, month
  quantity: number;
  unitPrice?: number; // filled in by supplier when submitting offer
  notes?: string;
}

export interface Offer {
  id: string;
  supplierName: string;
  supplierId: string;
  submittedAt: string;
  amount: number;
  currency: string;
  status: 'submitted' | 'under-review' | 'shortlisted' | 'rejected' | 'winner';
  documents: Document[];
  round: number;
}

export interface TenderRound {
  id: string;
  roundNumber: number;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'completed';
  offers: Offer[];
}

export interface TenderRoundConfig {
  id: string;
  roundNumber: number;
  submissionStartDate: string;
  submissionStartTime: string;
  submissionEndDate: string;
  submissionEndTime: string;
}

/** A document item suppliers must upload as part of their offer */
export interface CompulsoryOfferItem {
  id: string;
  position: number;
  /** e.g. "Company Code of Conduct", "Insurance Policy" */
  name: string;
  description?: string;
  /** Whether this document is strictly required to submit an offer */
  required: boolean;
}

/** A weighted evaluation criterion for scoring offers */
export interface SelectionCriterion {
  id: string;
  name: string;
  /** 0-100 integer — all criteria weights must sum to 100 */
  weight: number;
  description?: string;
}

export interface Tender {
  id: string;
  /** Human-readable unique identifier e.g. TND-2024-CLN-001 */
  referenceCode?: string;
  title: string;
  description: string;
  category: ServiceCategory;
  status: TenderStatus;
  createdAt: string;
  // NDA / participation deadline
  participationDeadline: string;
  participationDeadlineTime?: string;
  // Offer submittal window (round 1)
  submissionStartDate: string;
  submissionStartTime?: string;
  submissionEndDate: string;
  submissionEndTime?: string;
  // Participation rules
  minParticipants: number;
  /** Visible only to organizers & admins */
  budget?: string;
  location: string;
  spvId: string;
  ndaDocumentId?: string;
  documents: Document[];
  questions: Question[];
  rounds: TenderRound[];
  /** Bill of Quantities / price schedule that suppliers fill in */
  articles: TenderArticle[];
  /** Documents that suppliers MUST upload as part of their offer */
  compulsoryOfferItems: CompulsoryOfferItem[];
  /** Weighted criteria used to evaluate and score offers */
  selectionCriteria: SelectionCriterion[];
  currentRound: number;
  totalRounds: number;
  createdBy: string;
  /** User role view context — set to 'admin'|'procurement-officer' to see budget */
  viewerRole?: UserRole;
}

// ─── Evaluation types ─────────────────────────────────────────────────────────

/** Score given to one offer on one criterion (0–100) */
export interface CriterionScore {
  criterionId: string;
  criterionName: string;
  weight: number;
  /** Raw score 0–100 given by evaluator */
  score: number | null;
  /** AI-suggested score 0–100 */
  aiSuggested?: number | null;
  /** Justification text (manual or AI-generated) */
  justification?: string;
}

/** Complete scorecard for a single offer */
export interface OfferScorecard {
  offerId: string;
  supplierName: string;
  amount: number;
  scores: CriterionScore[];
  /** Weighted total (0–100), computed from scores * weights */
  totalScore: number | null;
  /** Rank position (1 = best) */
  rank?: number;
}

/** AI evaluation suggestion for one offer */
export interface AiEvaluationSuggestion {
  offerId: string;
  supplierName: string;
  scores: { criterionId: string; score: number; justification: string }[];
  overallComment: string;
  recommendWinner: boolean;
}

/** Audit log entry for evaluation actions */
export interface EvaluationAuditEntry {
  id: string;
  timestamp: string;
  action: 'score_set' | 'ai_suggested' | 'ai_applied' | 'winner_selected' | 'evaluation_reset';
  actor: string;
  detail: string;
}

// ─── Supplier types ──────────────────────────────────────────────────────────

export interface SupplierContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  /** Who added this contact */
  addedBy: string;
  addedByRole: UserRole;
  /** Supabase Auth user_id if a platform account has been created for this contact */
  linkedUserId?: string;
}

export interface ServiceCategoryItem {
  id: string;
  label: string;
  value: string;
}

export interface Supplier {
  id: string;
  name: string;
  fiscalCode: string;
  /** References ServiceCategoryItem.value */
  categories: string[];
  contacts: SupplierContact[];
  activeOffers: number;
  totalContracts: number;
  /** user id of who created this supplier entry */
  createdBy: string;
  createdAt: string;
}
