import { useState, useCallback } from 'react';
import { Link2, Unlink, Users, Bell, Check, Loader2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { MappingEditor } from '../components/MappingEditor';
import { useAuthStore } from '../stores/auth.store';
import { useCashflowStore } from '../stores/cashflow.store';
import { useMappingOverrides } from '../hooks/useMappingOverrides';

export function Settings() {
  const { user, firm } = useAuthStore();
  const { syncPennylane, isLoading } = useCashflowStore();
  const [pennylaneConnected, setPennylaneConnected] = useState(false);
  const { customRules, saveRules, isSaving } = useMappingOverrides();

  const handleConnectPennylane = () => {
    // REQUIREMENT: OAuth2 flow — redirect to Pennylane authorization
    const clientId = import.meta.env.VITE_PENNYLANE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/settings?pennylane_callback=true`;
    const scope = 'accounting:read';
    // NOTE: In production, replace with actual Pennylane OAuth URL
    const authUrl = `https://app.pennylane.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`;
    window.location.href = authUrl;
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres</h1>

      {/* Pennylane Connection */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Connexion Pennylane
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Connectez votre compte Pennylane pour synchroniser automatiquement vos transactions comptables.
        </p>
        {pennylaneConnected ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-success">
              <Check className="w-5 h-5" />
              <span className="text-sm font-medium">Connecté</span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => syncPennylane()} isLoading={isLoading}>
              Synchroniser maintenant
            </Button>
            <Button variant="danger" size="sm" leftIcon={<Unlink className="w-4 h-4" />}>
              Déconnecter
            </Button>
          </div>
        ) : (
          <Button onClick={handleConnectPennylane} leftIcon={<Link2 className="w-4 h-4" />}>
            Connecter Pennylane
          </Button>
        )}
      </Card>

      {/* Alert Settings */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Seuils d'alerte
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Runway critique (mois)"
            type="number"
            defaultValue={2}
            min={1}
            helperText="Alerte critique si la trésorerie couvre moins de X mois"
          />
          <Input
            label="Runway avertissement (mois)"
            type="number"
            defaultValue={4}
            min={1}
            helperText="Alerte si la trésorerie couvre moins de X mois"
          />
          <Input
            label="Créances en retard (jours)"
            type="number"
            defaultValue={60}
            min={1}
            helperText="Alerte si des créances dépassent X jours"
          />
          <Input
            label="Risque de concentration (%)"
            type="number"
            defaultValue={30}
            min={1}
            max={100}
            helperText="Alerte si un client dépasse X% du CA"
          />
        </div>
        <div className="mt-4">
          <Button variant="primary" size="sm">Enregistrer les seuils</Button>
        </div>
      </Card>

      {/* Règles de catégorisation */}
      <MappingEditor customRules={customRules} onSave={saveRules} isSaving={isSaving} />

      {/* Firm Info */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Informations du cabinet
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nom du cabinet" defaultValue={firm?.name ?? ''} readOnly />
          <Input label="SIRET" defaultValue={firm?.siret ?? ''} readOnly />
          <Input label="Email" defaultValue={firm?.email ?? ''} readOnly />
          <Input label="Plan" defaultValue={firm?.plan ?? 'free'} readOnly />
        </div>
      </Card>

      {/* Team */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Équipe
          </h2>
          <Button variant="secondary" size="sm" leftIcon={<Users className="w-4 h-4" />}>
            Inviter un membre
          </Button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.fullName ?? 'Vous'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role === 'owner' ? 'Propriétaire' : user?.role}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
