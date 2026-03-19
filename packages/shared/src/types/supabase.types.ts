// REQUIREMENT: Supabase database types — auto-generated in production via `supabase gen types`
// This is a placeholder that matches our schema for development

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type TableDef<R extends Record<string, unknown>> = {
  Row: R;
  Insert: Partial<R>;
  Update: Partial<R>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      firms: TableDef<{
        id: string;
        name: string;
        siret: string | null;
        email: string;
        plan: string;
        gdpr_dpo_email: string | null;
        data_retention_months: number;
        created_at: string;
        updated_at: string;
      }>;
      users: TableDef<{
        id: string;
        firm_id: string;
        role: string;
        full_name: string | null;
        gdpr_consent_at: string | null;
        gdpr_consent_version: string | null;
        last_login_at: string | null;
        created_at: string;
      }>;
      companies: TableDef<{
        id: string;
        firm_id: string;
        pennylane_company_id: string | null;
        name: string;
        siren: string | null;
        siret: string | null;
        naf_code: string | null;
        legal_form: string | null;
        fiscal_year_start_month: number;
        currency: string;
        created_at: string;
        updated_at: string;
      }>;
      transactions: TableDef<{
        id: string;
        company_id: string;
        pennylane_id: string | null;
        date: string;
        label: string;
        amount: number;
        currency: string;
        category: string | null;
        subcategory: string | null;
        cashflow_type: string;
        bank_account: string | null;
        is_reconciled: boolean;
        pennylane_metadata: Json;
        source: string;
        created_at: string;
        updated_at: string;
      }>;
      cashflow_snapshots: TableDef<{
        id: string;
        company_id: string;
        period_start: string;
        period_end: string;
        period_type: string;
        opening_balance: number;
        closing_balance: number;
        total_inflows: number;
        total_outflows: number;
        net_cashflow: number;
        operating_inflows: number;
        operating_outflows: number;
        investing_inflows: number;
        investing_outflows: number;
        financing_inflows: number;
        financing_outflows: number;
        tax_outflows: number;
        projected_balance_30d: number | null;
        projected_balance_90d: number | null;
        projected_balance_180d: number | null;
        burn_rate_monthly: number | null;
        runway_months: number | null;
        computed_at: string;
      }>;
      audit_log: TableDef<{
        id: string;
        firm_id: string;
        user_id: string | null;
        action: string;
        resource_type: string | null;
        resource_id: string | null;
        ip_address: string | null;
        user_agent: string | null;
        details: Json;
        created_at: string;
      }>;
      gdpr_consents: TableDef<{
        id: string;
        user_id: string;
        consent_type: string;
        granted: boolean;
        version: string;
        ip_address: string | null;
        granted_at: string;
        revoked_at: string | null;
      }>;
      firm_members: TableDef<{
        id: string;
        firm_id: string;
        user_id: string;
        role: string;
        created_at: string;
      }>;
      pcg_mapping_overrides: TableDef<{
        id: string;
        company_id: string;
        account_prefix: string;
        original_type: string;
        override_type: string;
        override_label: string | null;
        created_at: string;
        updated_at: string;
      }>;
      pennylane_connections: TableDef<{
        id: string;
        firm_id: string;
        access_token_encrypted: string;
        refresh_token_encrypted: string;
        token_expires_at: string;
        scopes: string[];
        pennylane_organization_id: string | null;
        last_sync_at: string | null;
        sync_status: string;
        sync_error_message: string | null;
        created_at: string;
        updated_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
