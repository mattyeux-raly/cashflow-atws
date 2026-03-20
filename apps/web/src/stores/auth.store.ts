import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DEMO_USER, DEMO_FIRM } from '../lib/demo-data';
import type { User, Firm, UserRole } from '@cashflow/shared';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemoMode: boolean;
  user: User | null;
  firm: Firm | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithMagicLink: (email: string) => Promise<void>;
  loginDemo: () => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  isDemoMode: false,
  user: null,
  firm: null,

  initialize: async () => {
    if (!isSupabaseConfigured) {
      set({ isLoading: false });
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          const { data: firm } = await supabase
            .from('firms')
            .select('*')
            .eq('id', profile.firm_id)
            .single();

          set({
            isAuthenticated: true,
            user: {
              id: profile.id,
              firmId: profile.firm_id,
              role: profile.role as UserRole,
              fullName: profile.full_name,
              gdprConsentAt: profile.gdpr_consent_at,
              gdprConsentVersion: profile.gdpr_consent_version,
              lastLoginAt: profile.last_login_at,
              createdAt: profile.created_at,
            },
            firm: firm ? {
              id: firm.id,
              name: firm.name,
              siret: firm.siret,
              email: firm.email,
              plan: firm.plan as Firm['plan'],
              gdprDpoEmail: firm.gdpr_dpo_email,
              dataRetentionMonths: firm.data_retention_months,
              createdAt: firm.created_at,
              updatedAt: firm.updated_at,
            } : null,
          });
        } else {
          // Auth réussie mais pas encore de profil — connecter quand même
          set({
            isAuthenticated: true,
            user: {
              id: session.user.id,
              firmId: '',
              role: 'owner' as UserRole,
              fullName: session.user.email ?? 'Utilisateur',
              gdprConsentAt: new Date().toISOString(),
              gdprConsentVersion: '1.0',
              lastLoginAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            },
            firm: null,
          });
        }
      }
    } finally {
      set({ isLoading: false });
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        set({ isAuthenticated: false, user: null, firm: null });
      }
    });
  },

  // REQUIREMENT: Demo mode — bypass Supabase auth with mock data
  loginDemo: () => {
    set({
      isAuthenticated: true,
      isDemoMode: true,
      isLoading: false,
      user: DEMO_USER,
      firm: DEMO_FIRM,
    });
  },

  login: async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      // In demo mode, any credentials work
      useAuthStore.getState().loginDemo();
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    await useAuthStore.getState().initialize();
  },

  loginWithMagicLink: async (email: string) => {
    if (!isSupabaseConfigured) {
      useAuthStore.getState().loginDemo();
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw new Error(error.message);
  },

  logout: async () => {
    if (!useAuthStore.getState().isDemoMode) {
      await supabase.auth.signOut();
    }
    set({ isAuthenticated: false, isDemoMode: false, user: null, firm: null });
  },
}));
