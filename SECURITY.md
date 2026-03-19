# Politique de Sécurité & Conformité RGPD

## 1. Registre des traitements (Article 30 RGPD)

| Traitement | Finalité | Base légale | Durée conservation | Destinataires |
|---|---|---|---|---|
| Authentification | Gestion des accès | Contrat (Art. 6.1.b) | Durée du contrat + 1 an | Supabase (sous-traitant) |
| Sync Pennylane | Synchronisation données comptables | Consentement (Art. 6.1.a) | 3 ans glissants (configurable) | Pennylane (responsable conjoint) |
| Calcul cashflow | Analyse de trésorerie | Intérêt légitime (Art. 6.1.f) | Durée du contrat | Aucun tiers |
| Analytics | Amélioration du service | Consentement (Art. 6.1.a) | 13 mois max | Aucun (self-hosted) |
| Journal d'audit | Traçabilité & conformité | Obligation légale (Art. 6.1.c) | 5 ans | Aucun tiers |

## 2. Mesures de sécurité techniques

### 2.1 Chiffrement
- **En transit** : TLS 1.3 (Supabase + Vercel)
- **Au repos** : Tokens Pennylane chiffrés avec pgcrypto (AES-256 via pgp_sym_encrypt)
- **Clé de chiffrement** : Variable d'environnement `ENCRYPTION_KEY`, jamais dans le code

### 2.2 Contrôle d'accès
- **Authentification** : Supabase Auth (email/password, magic link, OAuth)
- **Autorisation** : Row Level Security (RLS) PostgreSQL sur toutes les tables
- **Rôles** : owner > admin > member > viewer
- **Multi-tenant** : Isolation stricte par `firm_id` via RLS

### 2.3 Protection des API
- **Rate limiting** : 60 req/min (lecture), 10 req/min (écriture), 1 req/5min (sync)
- **Validation** : Zod sur tous les inputs (API, formulaires, webhooks)
- **CORS** : Restreint au domaine de production uniquement
- **Headers de sécurité** : X-Frame-Options DENY, HSTS, CSP stricte, etc.

### 2.4 Sécurité applicative
- TypeScript strict (pas de `any`)
- Pas de SQL dynamique / interpolation de string
- Pas de secrets dans le code source
- Pas de `console.log` avec des données utilisateur
- Pas de données personnelles dans les messages d'erreur HTTP
- Pas de `localStorage` pour les tokens (Supabase Auth gère les sessions)

## 3. Droits des personnes (Chapitre III RGPD)

### 3.1 Droit d'accès (Article 15)
- **Implémentation** : Edge Function `gdpr-export` — export JSON complet
- **Délai** : Réponse immédiate (téléchargement automatique)
- **Contenu** : Profil, entreprises, transactions, consentements

### 3.2 Droit de rectification (Article 16)
- **Implémentation** : Interface Settings pour modifier les informations personnelles
- **Délai** : Immédiat

### 3.3 Droit à l'effacement (Article 17)
- **Implémentation** : Edge Function `gdpr-delete` (à créer)
- **Procédure** :
  1. Demande via l'interface GdprCenter
  2. Confirmation par email
  3. Suppression : transactions, snapshots, companies, user, consents
  4. Anonymisation : audit_log (remplacement user_id par hash, suppression IP)
  5. Révocation tokens Pennylane
- **Délai** : 30 jours maximum

### 3.4 Droit à la portabilité (Article 20)
- **Implémentation** : Export JSON + CSV structuré via `gdpr-export`
- **Format** : JSON (machine-readable), CSV (humain-readable)

### 3.5 Droit d'opposition (Article 21)
- **Implémentation** : Désactivation du sync Pennylane, suppression des données
- **Canal** : Interface GdprCenter ou email au DPO

## 4. Sous-traitants (Article 28 RGPD)

| Sous-traitant | Rôle | Localisation données | Garanties |
|---|---|---|---|
| Supabase | Hébergement BDD, Auth | EU (eu-west-1 / eu-central-1) | SOC2, conformité RGPD |
| Vercel | Hébergement frontend | EU (cdg1, Paris) | SOC2, DPA signé |
| Pennylane | Source de données comptables | France | Responsable conjoint (Art. 26) |

## 5. Conservation des données

- **Transactions** : `data_retention_months` configurable par cabinet (défaut : 36 mois)
- **Audit log** : 5 ans (obligation légale)
- **Consentements** : Durée du contrat + 5 ans (preuve)
- **Tokens Pennylane** : Jusqu'à déconnexion ou suppression du compte

### Purge automatique (à implémenter via pg_cron)
- Suppression des transactions > `data_retention_months`
- Anonymisation des audit_log > 5 ans
- Notification DPO 30 jours avant suppression automatique

## 6. Gestion des incidents

En cas de violation de données (Article 33 & 34 RGPD) :
1. **Notification CNIL** : Sous 72h
2. **Notification utilisateurs** : Si risque élevé pour leurs droits
3. **Documentation** : Nature de la violation, conséquences, mesures prises
4. **Contact DPO** : dpo@cashflow-app.fr

## 7. Vérifications de sécurité (checklist)

- [ ] Pas de secrets dans le code (grep pour API_KEY, SECRET, TOKEN, PASSWORD)
- [ ] Pas de `console.log` de données sensibles
- [ ] Pas de `.env` commité (vérifier .gitignore)
- [ ] Pas de `any` TypeScript
- [ ] Pas de requête SQL avec interpolation de string
- [ ] Pas de données personnelles dans les erreurs HTTP
- [ ] Pas de CORS wildcard `*`
- [ ] Pas de token dans les URL (query params)
- [ ] Pas de `localStorage` pour les tokens
- [ ] Toutes les Edge Functions vérifient le JWT
- [ ] Les réponses d'erreur sont génériques côté client
- [ ] Headers de sécurité présents dans vercel.json
- [ ] Refresh token Pennylane jamais envoyé au frontend
- [ ] RLS activé et testé sur toutes les tables
