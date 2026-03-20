// REQUIREMENT: Pennylane API v2 client with API key, retry, and rate limiting
// SECURITY: Never log API key

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

export class PennylaneClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // REQUIREMENT: Retry with exponential backoff
  private async request<T>(
    path: string,
    options: RequestInit = {},
    retryCount: number = 0,
  ): Promise<T> {
    checkRateLimit();

    const response = await fetch(`${PENNYLANE_BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
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

    // Handle unauthorized
    if (response.status === 401) {
      throw new PennylaneApiError(
        'Clé API Pennylane invalide ou expirée. Vérifiez votre token.',
        401,
        'UNAUTHORIZED',
      );
    }

    // Handle forbidden (wrong scope)
    if (response.status === 403) {
      throw new PennylaneApiError(
        'Scope insuffisant. Vérifiez que le token a le scope transactions:readonly.',
        403,
        'FORBIDDEN',
      );
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

  // REQUIREMENT: Utiliser les transactions bancaires, pas les écritures comptables
  async getBankTransactions(since?: string) {
    const params: Record<string, string> = {};
    if (since) params['filter[date_from]'] = since;
    const rawData = await this.fetchAllPaginated<unknown>('/transactions', params);
    return rawData.map((item) => PennylaneBankTransactionSchema.parse(item));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
