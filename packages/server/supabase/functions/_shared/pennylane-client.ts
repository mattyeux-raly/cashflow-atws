// REQUIREMENT: Pennylane API v2 client with OAuth2, retry, and rate limiting
// SECURITY: Never log tokens, never store tokens in plain text

import { z } from 'zod';

const PENNYLANE_BASE_URL = 'https://app.pennylane.com/api/external/v2';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 9000];
const MAX_REQUESTS_PER_MINUTE = 100;

// Rate limiter state (per-instance)
let requestTimestamps: number[] = [];

function checkRateLimit(): void {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter((ts) => now - ts < 60_000);
  if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    const oldestInWindow = requestTimestamps[0]!;
    const waitMs = 60_000 - (now - oldestInWindow);
    throw new PennylaneRateLimitError(
      `Limite de requêtes atteinte. Réessayez dans ${Math.ceil(waitMs / 1000)}s`,
      waitMs,
    );
  }
  requestTimestamps.push(now);
}

export class PennylaneApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'PennylaneApiError';
  }
}

export class PennylaneRateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfterMs: number,
  ) {
    super(message);
    this.name = 'PennylaneRateLimitError';
  }
}

// REQUIREMENT: Zod schemas for Pennylane API responses
const PennylaneBankTransactionSchema = z.object({
  id: z.string(),
  date: z.string(),
  label: z.string().default('Sans libellé'),
  amount: z.number(),
  currency: z.string().default('EUR'),
  bank_account_name: z.string().nullable().default(null),
  is_reconciled: z.boolean().default(false),
}).passthrough();

const PennylaneListResponseSchema = z.object({
  data: z.array(z.unknown()),
  pagination: z.object({
    page: z.number(),
    pages: z.number(),
    per_page: z.number(),
    total: z.number(),
  }),
});

export interface PennylaneClientConfig {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  clientId: string;
  clientSecret: string;
  onTokenRefreshed?: (newAccessToken: string, newRefreshToken: string, expiresAt: Date) => Promise<void>;
}

export class PennylaneClient {
  private config: PennylaneClientConfig;

  constructor(config: PennylaneClientConfig) {
    this.config = config;
  }

  // REQUIREMENT: Check token expiry before every API call
  private async ensureValidToken(): Promise<string> {
    if (new Date() >= this.config.tokenExpiresAt) {
      await this.refreshAccessToken();
    }
    return this.config.accessToken;
  }

  // REQUIREMENT: Refresh OAuth token
  private async refreshAccessToken(): Promise<void> {
    const response = await fetch('https://app.pennylane.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: this.config.refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new PennylaneApiError(
        'Échec du rafraîchissement du token. Reconnexion Pennylane nécessaire.',
        response.status,
        'TOKEN_REFRESH_FAILED',
      );
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    this.config.accessToken = data.access_token;
    this.config.refreshToken = data.refresh_token;
    this.config.tokenExpiresAt = expiresAt;

    if (this.config.onTokenRefreshed) {
      await this.config.onTokenRefreshed(data.access_token, data.refresh_token, expiresAt);
    }
  }

  // REQUIREMENT: Retry with exponential backoff
  private async request<T>(
    path: string,
    options: RequestInit = {},
    retryCount: number = 0,
  ): Promise<T> {
    checkRateLimit();
    const token = await this.ensureValidToken();

    const response = await fetch(`${PENNYLANE_BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('Retry-After') ?? '60');
      if (retryCount < MAX_RETRIES) {
        await sleep(retryAfter * 1000);
        return this.request<T>(path, options, retryCount + 1);
      }
      throw new PennylaneRateLimitError(
        'Limite de requêtes Pennylane dépassée',
        retryAfter * 1000,
      );
    }

    // Handle unauthorized — try refresh once
    if (response.status === 401 && retryCount === 0) {
      await this.refreshAccessToken();
      return this.request<T>(path, options, retryCount + 1);
    }

    // Handle server errors with retry
    if (response.status >= 500 && retryCount < MAX_RETRIES) {
      await sleep(RETRY_DELAYS[retryCount] ?? 9000);
      return this.request<T>(path, options, retryCount + 1);
    }

    if (!response.ok) {
      throw new PennylaneApiError(
        `Erreur API Pennylane: ${response.status}`,
        response.status,
        `HTTP_${response.status}`,
      );
    }

    return response.json() as Promise<T>;
  }

  // REQUIREMENT: Paginate all results from a Pennylane endpoint
  async fetchAllPaginated<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
    const allItems: T[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const queryParams = new URLSearchParams({ ...params, page: String(page), per_page: '100' });
      const response = await this.request<unknown>(`${path}?${queryParams.toString()}`);
      const parsed = PennylaneListResponseSchema.parse(response);

      allItems.push(...(parsed.data as T[]));
      hasMore = page < parsed.pagination.pages;
      page++;
    }

    return allItems;
  }

  async getCompanies() {
    return this.fetchAllPaginated<{ id: string; name: string; siren: string | null; currency: string }>('/companies');
  }

  // REQUIREMENT: Utiliser les transactions bancaires, pas les écritures comptables
  async getBankTransactions(companyId: string, since?: string) {
    const params: Record<string, string> = {};
    if (since) params['filter[date_from]'] = since;
    const rawData = await this.fetchAllPaginated<unknown>(`/companies/${companyId}/bank_transactions`, params);
    return rawData.map((item) => PennylaneBankTransactionSchema.parse(item));
  }

  async getCustomerInvoices(companyId: string) {
    return this.fetchAllPaginated<unknown>(`/companies/${companyId}/customer_invoices`);
  }

  async getSupplierInvoices(companyId: string) {
    return this.fetchAllPaginated<unknown>(`/companies/${companyId}/supplier_invoices`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
