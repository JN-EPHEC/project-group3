# 📋 Schéma Firestore - Champs d'Abonnement

## Collection: `users`

### Structure Complète

```javascript
{
  // Champs existants
  uid: string,
  email: string,
  firstName: string,
  lastName: string,
  userType: 'parent' | 'professionnel',
  createdAt: Timestamp,
  
  // Champs de rôles et familles
  parent_id: string | null,
  professional_id: string | null,
  roles: string[],
  familyIds: string[],
  
  // 🆕 CHAMPS D'ABONNEMENT STRIPE
  
  /**
   * ID du client Stripe
   * Lien vers le compte Stripe de l'utilisateur
   * Généré lors de la création de la première session Checkout
   * 
   * Type: string
   * Exemple: "cus_ABC123XYZ"
   * Nullable: false (créé lors du premier paiement)
   */
  stripeCustomerId?: string,
  
  /**
   * ID de l'abonnement actif
   * Identifie l'abonnement Stripe unique
   * Null si pas d'abonnement actif
   * 
   * Type: string | null
   * Exemple: "sub_ABC123XYZ789"
   * Nullable: true
   */
  subscriptionId?: string | null,
  
  /**
   * Statut de l'abonnement
   * 
   * Valeurs possibles:
   * - "active": Abonnement payé et actif
   * - "trialing": Période d'essai gratuit (ex: 30 jours)
   * - "canceled": Abonnement résilié par l'utilisateur
   * - "past_due": Paiement en retard/problème
   * - null: Pas d'abonnement
   * 
   * Type: string | null
   * Exemple: "active"
   * Nullable: true
   */
  subscriptionStatus?: 'active' | 'trialing' | 'canceled' | 'past_due' | null,
  
  /**
   * Date de fin de la période de facturation actuelle
   * La date à laquelle l'abonnement renouvelle ou expire
   * 
   * Type: Timestamp
   * Exemple: Timestamp.fromDate(new Date('2025-01-15T23:59:59Z'))
   * Nullable: true
   * Utilisé pour: afficher "Expire le 15 janvier"
   */
  currentPeriodEnd?: Timestamp | null,
  
  /**
   * Date de fin de la période d'essai gratuit
   * Seulement si subscriptionStatus === 'trialing'
   * 
   * Type: Timestamp | null
   * Exemple: Timestamp.fromDate(new Date('2025-01-28T23:59:59Z'))
   * Nullable: true
   * Utilisé pour: afficher "20 jours d'essai restants"
   */
  trialEnd?: Timestamp | null,
  
  /**
   * Indique si l'abonnement est marqué pour résiliation à la fin de la période
   * Si true, l'abonnement s'arrêtera à la date currentPeriodEnd
   * L'utilisateur a demandé l'annulation mais continue d'accès jusqu'à la fin
   * 
   * Type: boolean
   * Exemple: true (signifie "l'utilisateur a cliqué Annuler")
   * Défaut: false
   * Utilisé pour: afficher "Expire le 15 janvier (résilié)"
   */
  cancelAtPeriodEnd?: boolean,
  
  /**
   * Indique s'il y a eu un échec de paiement
   * Stripe tente automatiquement de recharger la carte
   * L'utilisateur doit mettre à jour ses informations de paiement
   * 
   * Type: boolean
   * Exemple: true
   * Défaut: false
   * Utilisé pour: afficher alerte "Action requise"
   */
  lastPaymentFailed?: boolean,
  
  /**
   * Date/heure du dernier échec de paiement
   * Utilisé pour savoir depuis quand il y a un problème
   * 
   * Type: Timestamp | null
   * Exemple: Timestamp.fromDate(new Date('2025-12-26T14:30:00Z'))
   * Nullable: true
   * Utilisé pour: afficher "Erreur depuis le 26 décembre"
   */
  lastPaymentFailedAt?: Timestamp | null,
  
  /**
   * Timestamp de la dernière mise à jour des infos d'abonnement
   * Mis à jour chaque fois que les webhooks Stripe synchronisent les données
   * 
   * Type: Timestamp
   * Exemple: Timestamp.now()
   * Nullable: false
   * Utilisé pour: cache invalidation, debugging
   */
  subscriptionUpdatedAt?: Timestamp,
}
```

## Types TypeScript

```typescript
/**
 * Information complète sur l'abonnement d'un utilisateur
 */
interface UserSubscriptionData {
  stripeCustomerId?: string;
  subscriptionId?: string | null;
  subscriptionStatus?: 'active' | 'trialing' | 'canceled' | 'past_due' | null;
  currentPeriodEnd?: Timestamp | null;
  trialEnd?: Timestamp | null;
  cancelAtPeriodEnd?: boolean;
  lastPaymentFailed?: boolean;
  lastPaymentFailedAt?: Timestamp | null;
  subscriptionUpdatedAt?: Timestamp;
}

/**
 * Réponse de getUserSubscriptionInfo()
 */
interface SubscriptionInfo {
  hasActiveSubscription: boolean;
  subscription: {
    id: string | null;
    status: 'active' | 'trialing' | 'canceled' | 'past_due' | null;
    currentPeriodEnd: Timestamp | null;
    trialEnd: Timestamp | null;
    cancelAtPeriodEnd: boolean;
    lastPaymentFailed: boolean;
  };
  stripeCustomerId: string | null;
}

/**
 * Réponse de getFormattedSubscriptionStatus()
 */
interface FormattedSubscriptionStatus {
  status: string; // Texte formaté pour affichage
  isActive: boolean;
  expiresAt: Timestamp | null;
  daysRemaining: number | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: Timestamp | null;
}
```

## Migration des Données Existantes

### Pour les utilisateurs existants

**Option 1: Migration automatique via webhook**
Les nouveaux champs seront créés automatiquement la première fois qu'un utilisateur interagit avec Stripe.

**Option 2: Script de migration (optionnel)**
```javascript
// constants/migrationUtils.js
export async function initializeSubscriptionFieldsForAllUsers() {
  const batch = db.batch();
  const users = await db.collection('users').get();
  
  users.forEach(doc => {
    if (!doc.data().stripeCustomerId) {
      batch.update(doc.ref, {
        stripeCustomerId: null,
        subscriptionId: null,
        subscriptionStatus: null,
        currentPeriodEnd: null,
        trialEnd: null,
        cancelAtPeriodEnd: false,
        lastPaymentFailed: false,
        subscriptionUpdatedAt: new Date(),
      });
    }
  });
  
  await batch.commit();
}
```

## Indexation Firestore

Pour optimiser les requêtes, créer ces index :

```
Collection: users
Index 1:
  - Field: subscriptionStatus (Ascending)
  - Field: subscriptionUpdatedAt (Descending)
  
Index 2:
  - Field: stripeCustomerId (Ascending)
  
Index 3:
  - Field: lastPaymentFailed (Ascending)
  - Field: subscriptionUpdatedAt (Descending)
```

Firestore créera automatiquement les index nécessaires lors des première requêtes.

## Requêtes Couantes

### Tous les utilisateurs avec un abonnement actif
```javascript
const users = await db.collection('users')
  .where('subscriptionStatus', '==', 'active')
  .get();
```

### Utilisateurs avec erreur de paiement
```javascript
const failedPayments = await db.collection('users')
  .where('lastPaymentFailed', '==', true)
  .orderBy('subscriptionUpdatedAt', 'desc')
  .get();
```

### Abonnements expirant bientôt (dans 7 jours)
```javascript
const soon = new Date();
soon.setDate(soon.getDate() + 7);

const expiringSoon = await db.collection('users')
  .where('subscriptionStatus', '==', 'active')
  .where('currentPeriodEnd', '<=', soon)
  .get();
```

### Abonnements résilés en attente (pas encore expirés)
```javascript
const resiliating = await db.collection('users')
  .where('cancelAtPeriodEnd', '==', true)
  .where('subscriptionStatus', '==', 'active')
  .get();
```

## Statistiques et Analytics

### Compter les utilisateurs par statut
```javascript
// Admin SDK / Cloud Functions
const stats = {
  active: 0,
  trialing: 0,
  canceled: 0,
  past_due: 0,
  none: 0,
};

const snapshot = await db.collection('users').get();
snapshot.forEach(doc => {
  const status = doc.data().subscriptionStatus || 'none';
  stats[status]++;
});

console.log('Subscription stats:', stats);
```

### MRR (Monthly Recurring Revenue)
```javascript
// Calculer le MRR basé sur les abonnements actifs
const activeUsers = await db.collection('users')
  .where('subscriptionStatus', '==', 'active')
  .get();

const mrr = activeUsers.size * 9.99; // Prix mensuel
console.log(`MRR: ${mrr}€`);
```

## Sauvegarde et Archivage

Les données d'abonnement sont stockées de manière redondante :
- **Firestore** : Source de vérité pour l'app
- **Stripe** : Source de vérité pour les paiements
- **Webhooks** : Synchro automatique entre les deux

Pas de sauvegarde manuelle nécessaire puisque Stripe conserve toutes les données historiques.

---

**Version:** 1.0  
**Date:** 28 décembre 2025
