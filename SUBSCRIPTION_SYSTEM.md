# Système de Gestion des Abonnements Stripe

## 📋 Vue d'ensemble

Ce système permet de gérer et d'afficher les informations d'abonnement Stripe pour chaque utilisateur. Chaque utilisateur a maintenant des champs dédiés dans Firestore qui synchronisent automatiquement les données de Stripe.

## 🏗️ Architecture

### 1. Structure Firestore (Collection `users`)

Chaque document utilisateur contient les champs suivants pour l'abonnement :

```javascript
{
  uid: "user123",
  email: "user@example.com",
  // ... autres champs ...
  
  // 🆕 Champs d'abonnement Stripe
  stripeCustomerId: "cus_ABC123",          // ID du client Stripe
  subscriptionId: "sub_XYZ789",             // ID de l'abonnement
  subscriptionStatus: "active",             // Status: active, trialing, canceled, past_due
  currentPeriodEnd: Timestamp,              // Date de fin de la période actuelle
  trialEnd: Timestamp | null,               // Date de fin de la période d'essai (si applicable)
  cancelAtPeriodEnd: boolean,               // L'abonnement est-il en cours de résiliation ?
  lastPaymentFailed: boolean,               // Le dernier paiement a-t-il échoué ?
  subscriptionUpdatedAt: Timestamp,         // Date de dernière mise à jour
}
```

## 🔄 Flux de Synchronisation

### 1. Lors de la création d'une session Checkout

```
App Mobile → Backend API (stripe-api.ts)
  ↓
Crée une session Stripe Checkout
  ↓
Stocke userId dans les métadonnées
  ↓
Retourne URL de paiement à l'app
```

### 2. Après un paiement réussi

```
Utilisateur complète Stripe Checkout
  ↓
Webhook Stripe → Backend (stripe-webhook.ts)
  ↓
Met à jour Firestore avec infos abonnement
  ↓
App récupère les données mis à jour
```

### 3. Synchronisation manuelle

L'app peut à tout moment forcer une synchronisation :

```typescript
import { syncUserSubscriptionFromStripe } from '@/constants/subscriptionSync';

await syncUserSubscriptionFromStripe();
```

## 📱 Utilisation dans l'App

### Récupérer les informations d'abonnement

#### Option 1: Informations brutes

```typescript
import { getUserSubscriptionInfo } from '@/constants/firebase';

const uid = 'user123';
const subInfo = await getUserSubscriptionInfo(uid);

console.log(subInfo);
// {
//   hasActiveSubscription: true,
//   subscription: {
//     id: 'sub_ABC123',
//     status: 'active',
//     currentPeriodEnd: Timestamp,
//     trialEnd: null,
//     cancelAtPeriodEnd: false,
//     lastPaymentFailed: false
//   },
//   stripeCustomerId: 'cus_ABC123'
// }
```

#### Option 2: Statut formaté pour l'affichage

```typescript
import { getFormattedSubscriptionStatus } from '@/constants/firebase';

const uid = 'user123';
const status = await getFormattedSubscriptionStatus(uid);

console.log(status.status);
// "Actif jusqu'au 15 janvier 2026"
// ou "Période d'essai (22 jours restants)"
// ou "Pas d'abonnement actif"
```

#### Option 3: Utiliser le service de synchronisation

```typescript
import {
  getUserCurrentSubscriptionInfo,
  hasActiveSubscription,
  refreshSubscriptionStatus,
} from '@/constants/subscriptionSync';

// Récupérer les infos de l'utilisateur courant
const subInfo = await getUserCurrentSubscriptionInfo();

// Vérifier s'il y a un abonnement actif
const hasActive = await hasActiveSubscription();

// Forcer une synchronisation avec Stripe
await refreshSubscriptionStatus();
```

### Afficher l'interface d'abonnement

#### Composant complet

```tsx
import SubscriptionDisplay from '@/components/SubscriptionDisplay';

export default function MyScreen() {
  return (
    <SubscriptionDisplay
      onSubscriptionPress={() => {
        // Ouvrir Stripe Checkout
      }}
      onManagePress={() => {
        // Ouvrir le portail client Stripe
      }}
    />
  );
}
```

#### Affichage compact

```tsx
<SubscriptionDisplay
  compact={true}
  onSubscriptionPress={() => {
    // Action au clic
  }}
/>
```

## 🔐 Règles Firestore

À ajouter aux règles de sécurité Firestore :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Chaque utilisateur peut lire ses propres infos d'abonnement
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId;
      
      // Les webhooks Stripe (service account) peuvent mettre à jour les infos d'abonnement
      // Cette partie est gérée par Firebase Functions ou via CORS
    }
  }
}
```

## 🔗 API Backend

### GET `/api/subscription-status/:userId`

Récupère le statut d'abonnement actuel d'un utilisateur depuis Stripe.

**Réponse :**
```json
{
  "hasActiveSubscription": true,
  "stripeCustomerId": "cus_ABC123",
  "subscription": {
    "id": "sub_XYZ789",
    "status": "active",
    "currentPeriodEnd": 1705276800,
    "cancelAtPeriodEnd": false,
    "trialEnd": null
  }
}
```

### POST `/api/sync-subscription/:userId`

Force la synchronisation des infos d'abonnement depuis Stripe.

**Réponse :**
```json
{
  "success": true,
  "synced": true,
  "message": "Synchronisation déclenchée",
  "subscription": {
    "id": "sub_XYZ789",
    "status": "active",
    "currentPeriodEnd": 1705276800
  }
}
```

## 🪝 Webhooks Stripe

Les webhooks suivants mettent automatiquement à jour Firestore :

| Événement | Action |
|-----------|--------|
| `checkout.session.completed` | Enregistre le client Stripe |
| `customer.subscription.created` | Ajoute les infos d'abonnement |
| `customer.subscription.updated` | Met à jour le statut et dates |
| `customer.subscription.deleted` | Marque l'abonnement comme annulé |
| `invoice.payment_failed` | Marque le paiement comme échoué |
| `invoice.paid` | Remet l'abonnement en bon état |

## 📊 États possibles

### `subscriptionStatus`

- **`active`** : Abonnement actif et payé
- **`trialing`** : Période d'essai gratuit
- **`canceled`** : Abonnement résilié
- **`past_due`** : Paiement en retard

## ⚠️ Gestion des erreurs de paiement

Quand `lastPaymentFailed` est `true` :

1. L'utilisateur voit un message d'alerte
2. Stripe tente automatiquement de recharger la carte (selon les paramètres)
3. Un webhook `invoice.paid` réinitialise le flag quand ça réussit
4. Vous pouvez envoyer une notification push à l'utilisateur

```typescript
if (subInfo.subscription.lastPaymentFailed) {
  // Afficher un message "Action requise"
  // Proposer d'ouvrir le portail client
}
```

## 🚀 Exemples d'intégration

### Dans un composant de profil

```tsx
import { useEffect, useState } from 'react';
import SubscriptionDisplay from '@/components/SubscriptionDisplay';
import { StripeService } from '@/constants/stripeService';
import { STRIPE_CONFIG } from '@/constants/stripeConfig';

export default function ProfileScreen() {
  const handleUpgrade = async () => {
    try {
      // Ouvrir Stripe Checkout
      const priceId = STRIPE_CONFIG.PRICES.monthly;
      await StripeService.createCheckoutSession(priceId);
    } catch (error) {
      console.error('Erreur lors du paiement:', error);
    }
  };

  const handleManageSubscription = async () => {
    try {
      // Récupérer le customer ID
      const subInfo = await getUserCurrentSubscriptionInfo();
      if (subInfo.stripeCustomerId) {
        await StripeService.openCustomerPortal(subInfo.stripeCustomerId);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  return (
    <View>
      <SubscriptionDisplay
        onSubscriptionPress={handleUpgrade}
        onManagePress={handleManageSubscription}
      />
    </View>
  );
}
```

### Dans un écran d'abonnement

```tsx
import SubscriptionDisplay from '@/components/SubscriptionDisplay';
import { StripeService } from '@/constants/stripeService';
import { STRIPE_CONFIG } from '@/constants/stripeConfig';

export default function SubscriptionScreen() {
  return (
    <View>
      <SubscriptionDisplay
        refreshOnLoad={true}
        onSubscriptionPress={async () => {
          await StripeService.createCheckoutSession(
            STRIPE_CONFIG.PRICES.monthly
          );
        }}
      />
    </View>
  );
}
```

## 📝 Checklist d'implémentation

- [x] Ajouter les champs d'abonnement à la structure Firestore
- [x] Créer les fonctions helper dans `firebase.js`
- [x] Créer le service de synchronisation
- [x] Améliorer les webhooks Stripe
- [x] Créer le composant d'affichage
- [ ] Intégrer dans l'écran de profil
- [ ] Intégrer dans l'écran de paramètres
- [ ] Tester avec des abonnements réels
- [ ] Configurer les notifications push (optionnel)

## 🔗 Fichiers concernés

- `constants/firebase.js` - Helpers pour Firestore
- `constants/subscriptionSync.ts` - Service de synchronisation
- `constants/stripeService.ts` - Service Stripe (côté app)
- `backend/stripe-api.ts` - API de création de sessions
- `backend/stripe-webhook.ts` - Webhooks pour synchronisation
- `components/SubscriptionDisplay.tsx` - Composant d'affichage

---

**Version:** 1.0  
**Dernière mise à jour:** 28 décembre 2025
