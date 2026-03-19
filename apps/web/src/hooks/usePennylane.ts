import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth.store';

interface PennylaneStatus {
  isConnected: boolean;
  lastSyncAt: string | null;
  syncStatus: string;
  syncErrorMessage: string | null;
}

// REQUIREMENT: Hook for managing Pennylane connection state
export function usePennylane() {
  const [status, setStatus] = useState<PennylaneStatus>({
    isConnected: false,
    lastSyncAt: null,
    syncStatus: 'idle',
    syncErrorMessage: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuthStore();

  const fetchStatus = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('pennylane_connections')
        .select('last_sync_at, sync_status, sync_error_message')
        .eq('firm_id', user.firmId)
        .single();

      setStatus({
        isConnected: !!data,
        lastSyncAt: data?.last_sync_at ?? null,
        syncStatus: data?.sync_status ?? 'idle',
        syncErrorMessage: data?.sync_error_message ?? null,
      });
    } catch {
      setStatus((prev) => ({ ...prev, isConnected: false }));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const disconnect = useCallback(async () => {
    if (!user) return;
    // REQUIREMENT: Revoke tokens and delete connection
    await supabase
      .from('pennylane_connections')
      .delete()
      .eq('firm_id', user.firmId);
    setStatus({
      isConnected: false,
      lastSyncAt: null,
      syncStatus: 'idle',
      syncErrorMessage: null,
    });
  }, [user]);

  return { status, isLoading, fetchStatus, disconnect };
}
