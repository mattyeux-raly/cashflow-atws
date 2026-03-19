# Decisions Log — Cashflow Pennylane

## Phase 1 — Architecture & Structure

### D001: Monorepo avec Turborepo + pnpm
- **Choix** : Monorepo avec workspaces pnpm et Turborepo pour l'orchestration
- **Raison** : Partage de types entre frontend/backend, builds parallèles, DX optimale
- **Alternatives rejetées** : Polyrepo (trop de friction pour partager les types), Nx (trop lourd pour ce projet)

### D002: Séparation engine / server / web
- **Choix** : Package `engine` contient la logique métier pure (0 I/O), `server` contient les Edge Functions Supabase, `web` est le frontend React
- **Raison** : Testabilité maximale de l'engine (fonctions pures), réutilisabilité, séparation des responsabilités
- **Impact** : L'engine peut être testé avec vitest sans mock, le serveur est testable avec des mocks Supabase

### D003: Supabase comme backend
- **Choix** : Supabase (PostgreSQL + Auth + RLS + Edge Functions + Realtime)
- **Raison** : Auth intégrée, RLS pour le multi-tenant, Edge Functions pour le serverless, hébergement EU disponible
- **RGPD** : Région EU obligatoire (eu-west-1 ou eu-central-1)

### D004: Recharts pour les graphiques
- **Choix** : Recharts (pas Chart.js)
- **Raison** : Meilleure intégration React, tree-shakeable, bundle plus léger, API déclarative
- **Impact** : Composants graphiques réactifs et composables

### D005: Zustand pour le state management
- **Choix** : Zustand (pas Redux, pas Context API seul)
- **Raison** : API minimale, pas de boilerplate, performant, fonctionne hors du tree React
- **Impact** : Stores simples et testables

## Phase 2 — Base de données

### D006: Tokens Pennylane chiffrés avec pgcrypto
- **Choix** : Chiffrement AES via pgcrypto (pgp_sym_encrypt/decrypt) avec clé dans variable d'environnement
- **Raison** : Les tokens OAuth ne doivent JAMAIS être en clair en base
- **Impact** : Fonctions SQL dédiées encrypt_token/decrypt_token, accessibles uniquement au service_role

### D007: Multi-tenant via firm_id + RLS
- **Choix** : Isolation des données par cabinet (firm_id) via Row Level Security PostgreSQL
- **Raison** : Sécurité au niveau de la base, impossible de contourner même avec un bug applicatif
- **Impact** : Helper functions get_user_firm_id() et get_user_role() en SECURITY DEFINER

### D008: Catégorisation PCG pour les cashflow_type
- **Choix** : Mapping des numéros de compte PCG vers 8 types de cashflow (operating_income/expense, investing, financing, tax, other)
- **Raison** : Standard comptable français, permet la présentation en tableau de flux de trésorerie
- **Impact** : Le categorizer est dans l'engine pour être testable unitairement

## Phase 3 — Intégration Pennylane

### D009: Retry avec backoff exponentiel
- **Choix** : 3 tentatives avec délais 1s/3s/9s pour les erreurs serveur et rate limit
- **Raison** : Résilience face aux erreurs transitoires de l'API Pennylane
- **Impact** : Le sync ne crashe pas sur une erreur temporaire

### D010: Webhook Pennylane pour les mises à jour en temps réel
- **Choix** : Edge Function dédiée pour recevoir les webhooks, vérification de signature
- **Raison** : Évite les syncs polling trop fréquents, données à jour en quasi temps réel
- **Impact** : Nécessite la configuration d'un endpoint webhook côté Pennylane

## Phase 4 — Calcul Cashflow

### D011: Projections basées sur moyenne pondérée + saisonnalité
- **Choix** : Moyenne glissante pondérée (6 mois, poids croissants) × facteur saisonnier
- **Raison** : Simple mais efficace, les mois récents ont plus de poids
- **Alternative** : ML/ARIMA (trop complexe pour le MVP, considérer en v2)

### D012: 3 scénarios de projection
- **Choix** : Optimiste (+10%), Réaliste (base), Pessimiste (-15%)
- **Raison** : Donne une fourchette au dirigeant, pas de fausse précision
- **Impact** : Affichage en zone de confiance sur le graphique

## Phase 5 — Frontend

### D013: Dark mode natif via Tailwind
- **Choix** : Classes `dark:` de Tailwind avec toggle class sur `<html>`
- **Raison** : Pas de dépendance supplémentaire, performant, compatible SSR
- **Impact** : Préférence stockée dans le state local

### D014: Région Vercel CDG1 (Paris)
- **Choix** : Déploiement exclusif sur la région Paris (cdg1) de Vercel
- **Raison** : RGPD — données et serveurs doivent rester dans l'UE
- **Impact** : Configuration dans vercel.json

## Phase 6 — Sécurité & RGPD

### D015: Consentement granulaire RGPD
- **Choix** : 5 types de consentement séparés (CGU, confidentialité, traitement données, marketing, analytics)
- **Raison** : RGPD impose le consentement libre, spécifique, éclairé et univoque
- **Impact** : Table gdpr_consents avec versioning et révocabilité

### D016: Audit log sur toutes les actions sensibles
- **Choix** : Table audit_log avec action, resource, IP, user_agent, détails JSON
- **Raison** : Obligation légale (traçabilité), aide au debug, preuve de conformité RGPD
- **Impact** : Chaque Edge Function insère dans audit_log
