// REQUIREMENT: Common types used across the entire application

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';
export type PlanType = 'free' | 'pro' | 'enterprise';
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';

export interface Firm {
  id: string;
  name: string;
  siret: string | null;
  email: string;
  plan: PlanType;
  gdprDpoEmail: string | null;
  dataRetentionMonths: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  firmId: string;
  role: UserRole;
  fullName: string | null;
  gdprConsentAt: string | null;
  gdprConsentVersion: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Company {
  id: string;
  firmId: string;
  pennylaneCompanyId: string | null;
  name: string;
  siren: string | null;
  siret: string | null;
  nafCode: string | null;
  legalForm: string | null;
  fiscalYearStartMonth: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** SECURITY: Generic error for HTTP responses — never include sensitive details */
export interface SafeErrorResponse {
  error: string;
  code: string;
}
