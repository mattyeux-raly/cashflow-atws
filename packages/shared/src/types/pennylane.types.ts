// REQUIREMENT: Types for Pennylane API v2 integration

export interface PennylaneConnection {
  id: string;
  firmId: string;
  tokenExpiresAt: string;
  scopes: string[];
  pennylaneOrganizationId: string | null;
  lastSyncAt: string | null;
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  syncErrorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

/** SECURITY: Token fields are NEVER sent to the frontend */
export interface PennylaneTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scopes: string[];
}

export interface PennylaneCompany {
  id: string;
  name: string;
  siren: string | null;
  siret: string | null;
  currency: string;
}

export interface PennylaneTransaction {
  id: string;
  date: string;
  label: string;
  amount: number;
  currency: string;
  accountNumber: string;
  accountName: string;
  bankAccountId: string | null;
  isReconciled: boolean;
  metadata: Record<string, unknown>;
}

export interface PennylaneInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  customerOrSupplier: string;
}

export interface PennylaneWebhookPayload {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
  signature: string;
}

export interface PennylaneApiListResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pages: number;
    per_page: number;
    total: number;
  };
}
