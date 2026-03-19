# Checklist de Mise en Production — Cashflow Pennylane

## 1. Prérequis

### Comptes & Services
- [ ] Compte Supabase créé (plan Pro recommandé)
- [ ] Projet Supabase créé en **région EU** (eu-west-1 ou eu-central-1)
- [ ] Compte Vercel créé et connecté au repo Git
- [ ] Compte développeur Pennylane avec accès API v2
- [ ] Application OAuth Pennylane créée (client_id + client_secret)
- [ ] Domaine personnalisé configuré (ex: cashflow.ralyconseils.com)

### DNS & Domaine
- [ ] Domaine acheté et configuré
- [ ] Enregistrement DNS pointant vers Vercel
- [ ] Certificat SSL automatique (Vercel)

## 2. Configuration Supabase

### Base de données
- [ ] Exécuter la migration `001_initial_schema.sql`
- [ ] Exécuter la migration `002_rls_policies.sql`
- [ ] Exécuter la migration `003_encryption_functions.sql`
- [ ] Vérifier que RLS est activé sur TOUTES les tables :
  ```sql
  SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
  ```
- [ ] Tester chaque politique RLS manuellement (voir `rls.test.sql`)
- [ ] Insérer les données de seed si nécessaire (`seed.sql`)

### Authentification
- [ ] Configurer les providers Auth (email, magic link)
- [ ] Configurer les templates d'email en français
- [ ] Configurer le domaine personnalisé pour les liens de confirmation
- [ ] Désactiver l'inscription publique si accès restreint aux cabinets invités

### Edge Functions
- [ ] Déployer `pennylane-sync`
- [ ] Déployer `pennylane-webhook`
- [ ] Déployer `cashflow-compute`
- [ ] Déployer `gdpr-export`
- [ ] Configurer les secrets Edge Functions :
  ```bash
  supabase secrets set ENCRYPTION_KEY=<clé-aes-256-générée>
  supabase secrets set PENNYLANE_CLIENT_ID=<id>
  supabase secrets set PENNYLANE_CLIENT_SECRET=<secret>
  supabase secrets set PENNYLANE_WEBHOOK_SECRET=<secret>
  ```

### CORS
- [ ] Configurer les origines autorisées dans Supabase Dashboard :
  - `https://cashflow.ralyconseils.com` (production)
  - `http://localhost:5173` (développement uniquement, retirer en prod)

## 3. Configuration Vercel

### Variables d'environnement
- [ ] `VITE_SUPABASE_URL` → URL du projet Supabase
- [ ] `VITE_SUPABASE_ANON_KEY` → Clé anon du projet Supabase
- [ ] `VITE_PENNYLANE_CLIENT_ID` → Client ID OAuth Pennylane
- [ ] `VITE_APP_URL` → URL de production (ex: https://cashflow.ralyconseils.com)

### Configuration
- [ ] Région définie sur `cdg1` (Paris) dans `vercel.json`
- [ ] Framework détecté : Vite
- [ ] Build command : `cd apps/web && pnpm build`
- [ ] Output directory : `apps/web/dist`
- [ ] Vérifier que les headers de sécurité sont appliqués (CSP, HSTS, etc.)

### Déploiement
- [ ] Premier déploiement : `vercel --prod`
- [ ] Vérifier le site en production
- [ ] Tester le login
- [ ] Tester la connexion Pennylane OAuth

## 4. Configuration Pennylane

### OAuth
- [ ] URL de redirection configurée : `https://cashflow.ralyconseils.com/settings?pennylane_callback=true`
- [ ] Scopes demandés : `accounting:read`
- [ ] Webhook endpoint configuré : `https://<supabase-project>.supabase.co/functions/v1/pennylane-webhook`

### Test de synchronisation
- [ ] Connecter un compte Pennylane de test
- [ ] Lancer une synchronisation manuelle
- [ ] Vérifier que les transactions apparaissent dans le dashboard
- [ ] Vérifier les logs dans `audit_log`

## 5. Sécurité

### Vérifications pré-production
- [ ] Exécuter `pnpm check-secrets` → aucun secret trouvé
- [ ] Exécuter `pnpm security-audit` → aucune CVE critique
- [ ] Vérifier les headers de sécurité avec securityheaders.com
- [ ] Tester le CSP avec le navigateur (onglet Console, pas d'erreurs CSP)
- [ ] Vérifier que les tokens Pennylane sont bien chiffrés en base :
  ```sql
  SELECT access_token_encrypted FROM pennylane_connections LIMIT 1;
  -- Doit retourner des données binaires, PAS du texte lisible
  ```

### RGPD
- [ ] Privacy policy accessible à `/privacy-policy.html`
- [ ] Terms of service accessibles à `/terms-of-service.html`
- [ ] Export RGPD fonctionnel (tester via GdprCenter)
- [ ] Consentements enregistrés dans `gdpr_consents`
- [ ] Audit log trace toutes les actions sensibles
- [ ] DPO email configuré dans la table `firms`

## 6. Monitoring

### Recommandations post-déploiement
- [ ] Configurer les alertes Supabase (utilisation base, Edge Functions)
- [ ] Configurer les alertes Vercel (erreurs, latence)
- [ ] Mettre en place un monitoring uptime (UptimeRobot, Better Uptime)
- [ ] Configurer les alertes email pour les erreurs de sync Pennylane
- [ ] Planifier une revue de sécurité trimestrielle

## 7. Sauvegarde & Restauration

- [ ] Vérifier que les sauvegardes automatiques Supabase sont activées
- [ ] Tester une restauration depuis une sauvegarde
- [ ] Documenter la procédure de restauration

## 8. Tests de recette

### Parcours utilisateur complet
- [ ] Créer un compte (inscription + consentement RGPD)
- [ ] Se connecter
- [ ] Connecter Pennylane
- [ ] Synchroniser les transactions
- [ ] Visualiser le dashboard (KPIs, graphiques)
- [ ] Consulter le détail des transactions
- [ ] Exporter en CSV
- [ ] Modifier les seuils d'alerte
- [ ] Exporter ses données RGPD
- [ ] Se déconnecter
- [ ] Se reconnecter avec le lien magique

### Tests multi-tenant
- [ ] Créer 2 cabinets distincts
- [ ] Vérifier l'isolation des données (cabinet A ne voit pas cabinet B)
- [ ] Vérifier les rôles (viewer ne peut pas modifier)

### Tests responsive
- [ ] Desktop (1280px+)
- [ ] Tablette (768px)
- [ ] Mobile (375px)

### Tests dark mode
- [ ] Basculer en dark mode
- [ ] Vérifier tous les composants
- [ ] Vérifier les graphiques

## 9. Go Live

1. Configurer le domaine personnalisé sur Vercel
2. Mettre à jour les URLs dans Supabase (redirect URLs)
3. Mettre à jour les URLs dans Pennylane (OAuth redirect)
4. Déployer en production : `vercel --prod`
5. Vérifier le SSL
6. Tester le parcours complet
7. Communiquer aux premiers utilisateurs

## Contacts & Accès

| Service | URL | Responsable |
|---|---|---|
| Supabase Dashboard | https://supabase.com/dashboard | Admin |
| Vercel Dashboard | https://vercel.com/dashboard | Admin |
| Pennylane Developer | https://developer.pennylane.com | Admin |
| Application | https://cashflow.ralyconseils.com | Tous |
