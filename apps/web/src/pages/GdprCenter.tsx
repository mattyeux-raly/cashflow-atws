import { useState } from 'react';
import { Shield, Download, Trash2, FileText, Clock, AlertTriangle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAuthStore } from '../stores/auth.store';
import { supabase } from '../lib/supabase';

export function GdprCenter() {
  const { user, firm } = useAuthStore();
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke('gdpr-export', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.data) {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mes-donnees-personnelles.json';
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const consents = [
    { type: 'Conditions d\'utilisation', granted: true, version: '1.0', date: user?.gdprConsentAt },
    { type: 'Politique de confidentialité', granted: true, version: '1.0', date: user?.gdprConsentAt },
    { type: 'Traitement des données Pennylane', granted: true, version: '1.0', date: user?.gdprConsentAt },
    { type: 'Communications marketing', granted: false, version: '1.0', date: null },
    { type: 'Analyses d\'utilisation', granted: false, version: '1.0', date: null },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Centre de données personnelles
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Gérez vos données conformément au RGPD (Règlement UE 2016/679)
        </p>
      </div>

      {/* Data Overview */}
      <Card>
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 text-accent-500 mt-0.5" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Vos données</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Nous collectons et traitons les données suivantes dans le cadre de notre service :
            </p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-500" />
                <span><strong>Identité</strong> : nom, email, rôle dans le cabinet</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-500" />
                <span><strong>Données comptables</strong> : transactions synchronisées depuis Pennylane</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-500" />
                <span><strong>Connexion</strong> : tokens d'accès chiffrés pour Pennylane</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-500" />
                <span><strong>Journaux</strong> : historique d'audit des actions (RGPD)</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Consents */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Vos consentements
        </h2>
        <div className="space-y-3">
          {consents.map((c, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{c.type}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Version {c.version} {c.date && `— accepté le ${new Date(c.date).toLocaleDateString('fr-FR')}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={c.granted ? 'success' : 'default'}>
                  {c.granted ? 'Accepté' : 'Non accepté'}
                </Badge>
                {c.granted && (
                  <Button variant="ghost" size="sm">Révoquer</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Data Actions */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Vos droits
        </h2>
        <div className="space-y-4">
          {/* Export */}
          <div className="flex items-start justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-accent-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Exporter mes données (Art. 15 & 20)
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Téléchargez l'intégralité de vos données au format JSON
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportData}
              isLoading={isExporting}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Exporter
            </Button>
          </div>

          {/* Delete */}
          <div className="flex items-start justify-between p-4 border border-red-200 dark:border-red-800/30 rounded-lg bg-red-50/50 dark:bg-red-900/10">
            <div className="flex items-start gap-3">
              <Trash2 className="w-5 h-5 text-danger mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Supprimer mon compte et mes données (Art. 17)
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Toutes vos données seront supprimées sous 30 jours. Cette action est irréversible.
                </p>
              </div>
            </div>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                  Annuler
                </Button>
                <Button variant="danger" size="sm">
                  Confirmer
                </Button>
              </div>
            ) : (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Supprimer
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* DPO Contact */}
      <Card>
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Contact DPO</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Pour toute question relative à vos données personnelles, contactez notre Délégué à la Protection des Données :
            </p>
            <p className="text-sm text-accent-500 mt-2 font-medium">
              {firm?.gdprDpoEmail ?? 'dpo@cashflow-app.fr'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Durée de conservation des données : {firm?.dataRetentionMonths ?? 36} mois
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
