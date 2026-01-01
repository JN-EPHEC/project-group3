# Configuration de Perspective API

## Obtenir une clé API gratuite

1. **Créer un projet Google Cloud** :
   - Allez sur https://console.cloud.google.com/
   - Créez un nouveau projet (ou utilisez un existant)

2. **Activer Perspective API** :
   - Visitez https://developers.perspectiveapi.com/s/docs-get-started
   - Cliquez sur "Enable the API"
   - Sélectionnez votre projet

3. **Créer une clé API** :
   - Dans Google Cloud Console, allez dans "APIs & Services" > "Credentials"
   - Cliquez sur "Create Credentials" > "API Key"
   - Copiez la clé générée

4. **Configurer la clé dans l'application** :
   - Ouvrez `/constants/moderationService.ts`
   - Remplacez `'YOUR_API_KEY_HERE'` par votre clé API
   - **Important** : Ne commitez jamais votre clé API dans Git

## Limites gratuites

- **1 000 000 requêtes par jour** (largement suffisant)
- Pas de carte bancaire requise
- Aucun coût

## Fonctionnement

Le système utilise une approche hybride :

1. **Perspective API (prioritaire)** :
   - Analyse intelligente avec IA
   - Détecte : toxicité, insultes, menaces, profanité
   - Scores de confiance précis
   - Support multi-langues (français, anglais)

2. **Dictionnaire local (fallback)** :
   - 300+ expressions toxiques pré-enregistrées
   - Utilisé si l'API échoue (pas de connexion, quota dépassé)
   - Détection instantanée sans latence

## Scores de toxicité

- **0.0 - 0.5** : Message acceptable
- **0.5 - 0.7** : Message limite (autorisé)
- **0.7 - 1.0** : Message toxique (bloqué)

Les seuils sont ajustables dans `/constants/moderationService.ts`

## Confidentialité

- Option `doNotStore: true` activée
- Les messages ne sont jamais stockés par Google
- Conformité RGPD

## Test

Pour tester la modération :
1. Envoyez des messages avec des insultes
2. Le système proposera une reformulation polie
3. Vérifiez la console pour voir si l'API est utilisée

## Désactivation temporaire

Pour désactiver l'API et utiliser uniquement le dictionnaire local :
- Commentez l'import dans `app/conversation.tsx`
- Ou laissez `YOUR_API_KEY_HERE` sans clé
