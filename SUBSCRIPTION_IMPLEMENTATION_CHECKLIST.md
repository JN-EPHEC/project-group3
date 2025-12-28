# ✅ CHECKLIST - Implémentation Système d'Abonnement

## 📋 Phase 1: Vérification (30 min)

### Backend Stripe Configuré
- [ ] Clé secrète Stripe (`STRIPE_SECRET_KEY`) disponible
- [ ] ID des prix créés dans Stripe (`STRIPE_MONTHLY_PRICE`, `STRIPE_YEARLY_PRICE`)
- [ ] Webhooks Stripe endpoint configuré
- [ ] Webhook secret (`STRIPE_WEBHOOK_SECRET`) copié

### Firebase Configuré
- [ ] Firebase project créé
- [ ] Firestore Database initilialisée
- [ ] Collection `users` existe
- [ ] Authentification Firebase en place

### Environnement Local
- [ ] Node.js/npm installé
- [ ] Dépendances installées (`npm install`)
- [ ] Variables d'env configurées (`.env`)

---

## 📂 Phase 2: Fichiers (15 min)

### Vérifier que les fichiers existent

#### Créés
- [ ] `constants/subscriptionSync.ts`
- [ ] `components/SubscriptionDisplay.tsx`
- [ ] `SUBSCRIPTION_SYSTEM.md`
- [ ] `SUBSCRIPTION_CHANGES.md`
- [ ] `DEPLOYMENT_GUIDE.md`
- [ ] `FIRESTORE_SUBSCRIPTION_SCHEMA.md`
- [ ] `SUBSCRIPTION_INTEGRATION_EXAMPLES.tsx`
- [ ] `SUBSCRIPTION_COMPLETE_SUMMARY.md`
- [ ] `SUBSCRIPTION_INDEX.md`

#### Modifiés
- [ ] `constants/firebase.js` (3 nouvelles fonctions)
- [ ] `backend/stripe-api.ts` (nouveau endpoint)
- [ ] `backend/stripe-webhook.ts` (webhooks améliorés)

### Vérifier les imports
- [ ] Import de `StripeService` ok
- [ ] Import de `subscriptionSync` ok
- [ ] Import de `SubscriptionDisplay` ok

---

## 🔧 Phase 3: Configuration (20 min)

### Variables d'environnement Backend

#### Dans `.env` ou système d'env:
```bash
STRIPE_SECRET_KEY=sk_test_... ✅
STRIPE_WEBHOOK_SECRET=whsec_... ✅
STRIPE_MONTHLY_PRICE=price_... ✅
STRIPE_YEARLY_PRICE=price_... ✅
PORT=3000 ✅
```

- [ ] Vérifier que `STRIPE_SECRET_KEY` est la clé TEST (commence par `sk_test_`)
- [ ] Vérifier que `STRIPE_WEBHOOK_SECRET` est correct
- [ ] Vérifier les prix sont créés dans Stripe Dashboard

### Variables d'environnement Frontend

#### Dans `constants/stripeConfig.ts`:
```typescript
export const STRIPE_CONFIG = {
  API_URL: 'http://localhost:3000', // ✅ À adapter
  PRICES: {
    monthly: 'price_...', // ✅ Même que backend
    yearly: 'price_...',  // ✅ Même que backend
  },
};
```

- [ ] URL API correcte (localhost ou serveur)
- [ ] Prices correspondent aux IDs Stripe

### Webhooks Stripe

- [ ] Aller dans Stripe Dashboard → Developers → Webhooks
- [ ] Ajouter endpoint: `https://your-api.com/webhook/stripe`
- [ ] Sélectionner les événements:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.payment_failed`
  - [ ] `invoice.paid`
- [ ] Copier le webhook signing secret → `STRIPE_WEBHOOK_SECRET`
- [ ] Tester avec "Send test webhook"

---

## 🧪 Phase 4: Tests (45 min)

### Test 1: Backend API

#### Vérifier l'endpoint subscription-status
```bash
# Terminal
curl http://localhost:3000/api/subscription-status/test-user-123

# Doit retourner:
{
  "hasActiveSubscription": false,
  "subscription": null,
  "stripeCustomerId": null
}
```

- [ ] Endpoint répond
- [ ] Retourne JSON valide
- [ ] Statut est 200

#### Vérifier l'endpoint sync-subscription
```bash
curl -X POST http://localhost:3000/api/sync-subscription/test-user-123

# Doit retourner:
{
  "success": true,
  "synced": true,
  "message": "Synchronisation déclenchée"
}
```

- [ ] Endpoint répond
- [ ] Retourne success: true

### Test 2: Webhooks

#### Dans Stripe Dashboard Webhooks
- [ ] Cliquer sur l'endpoint
- [ ] Cliquer "Send test webhook"
- [ ] Sélectionner `customer.subscription.created`
- [ ] Vérifier le log montre "Delivered"

#### Dans les logs backend
- [ ] Voir `✅ Event received: customer.subscription.created`
- [ ] Voir les logs d'update Firestore

- [ ] Webhooks reçus avec succès
- [ ] Logs montrent les traitements

### Test 3: Frontend - Imports

```typescript
// Dans un fichier TypeScript/TSX
import { hasActiveSubscription } from '@/constants/subscriptionSync';
import SubscriptionDisplay from '@/components/SubscriptionDisplay';

// Doit compiler sans erreur
```

- [ ] Pas d'erreur d'import
- [ ] autocomplete fonctionne
- [ ] Types TypeScript valides

### Test 4: Frontend - Composant

```tsx
// Dans un écran
import SubscriptionDisplay from '@/components/SubscriptionDisplay';

export default function TestScreen() {
  return <SubscriptionDisplay />;
}
```

- [ ] Le composant s'affiche
- [ ] Affiche "Chargement..." initialement
- [ ] Affiche "Pas d'abonnement actif" après

### Test 5: Flux Complet avec Paiement

#### Créer un utilisateur de test
- [ ] Email: `test@example.com`
- [ ] Password: quelconque
- [ ] Créer depuis l'app

#### Lancer le paiement
- [ ] Cliquer "Souscrire" / "Passer à Premium"
- [ ] Utiliser carte TEST: `4242 4242 4242 4242`
- [ ] Date: future (ex: 12/26)
- [ ] CVC: n'importe quel nombre

#### Vérifier la synchronisation
```javascript
// Console Firebase
db.collection('users').doc(USER_ID).get().then(doc => {
  console.log('Subscription Data:', doc.data());
  // Doit contenir:
  // stripeCustomerId: "cus_..."
  // subscriptionStatus: "trialing" ou "active"
  // currentPeriodEnd: Timestamp
});
```

- [ ] Données mises à jour dans Firestore
- [ ] `subscriptionStatus` = "trialing" ou "active"
- [ ] `currentPeriodEnd` a une date
- [ ] `stripeCustomerId` n'est pas null

#### Vérifier le composant
- [ ] Affiche maintenant "Abonnement actif"
- [ ] Affiche la date d'expiration
- [ ] Affiche le nombre de jours

---

## 🚀 Phase 5: Intégration dans l'App (30 min)

### Intégration dans Profil

```tsx
// app/(tabs)/Profil.tsx ou app/(pro-tabs)/profil.tsx

import SubscriptionDisplay from '@/components/SubscriptionDisplay';
import { StripeService } from '@/constants/stripeService';
import { STRIPE_CONFIG } from '@/constants/stripeConfig';

// Dans le composant:
<SubscriptionDisplay
  onSubscriptionPress={async () => {
    try {
      await StripeService.createCheckoutSession(
        STRIPE_CONFIG.PRICES.monthly
      );
    } catch (error) {
      alert('Erreur: ' + error.message);
    }
  }}
  onManagePress={async () => {
    try {
      const info = await getUserCurrentSubscriptionInfo();
      if (info.stripeCustomerId) {
        await StripeService.openCustomerPortal(info.stripeCustomerId);
      }
    } catch (error) {
      alert('Erreur: ' + error.message);
    }
  }}
/>
```

- [ ] Composant intégré
- [ ] Boutons fonctionnent
- [ ] Texte personnalisé (si nécessaire)

### Intégration de Vérification d'Accès

```tsx
// Dans un composant de feature premium

import { hasActiveSubscription } from '@/constants/subscriptionSync';

const [hasAccess, setHasAccess] = useState(false);

useEffect(() => {
  checkAccess();
}, []);

const checkAccess = async () => {
  const has = await hasActiveSubscription();
  setHasAccess(has);
};

if (!hasAccess) {
  return <SubscriptionDisplay onSubscriptionPress={handleUpgrade} />;
}

return <YourPremiumContent />;
```

- [ ] Logique d'accès implémentée
- [ ] Test avec et sans abonnement
- [ ] UI change correctement

### Intégration dans un Onglet Dédié (Optionnel)

- [ ] Créer écran d'abonnement
- [ ] Afficher les plans disponibles
- [ ] Ajouter FAQ
- [ ] Tester le paiement

---

## 🔍 Phase 6: Vérification Finale (30 min)

### Firestore

```javascript
// Vérifier la structure des documents
db.collection('users').get().then(snapshot => {
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log('User:', data.email);
    console.log('Subscription Status:', data.subscriptionStatus);
    console.log('Stripe Customer ID:', data.stripeCustomerId);
  });
});
```

- [ ] Les nouveaux champs existent
- [ ] Les types sont corrects
- [ ] Les données se synchronisent

### Stripe Dashboard

- [ ] Aller dans Customers
- [ ] Vérifier que les clients sont créés
- [ ] Vérifier les subscriptions
- [ ] Vérifier les invoices/paiements

### Logs

- [ ] Vérifier logs Firebase Cloud Functions (s'il y en a)
- [ ] Vérifier logs backend webhooks
- [ ] Pas d'erreurs visibles

### Erreurs Connues

- [ ] Pas d'erreurs TypeScript
- [ ] Pas d'erreurs Runtime
- [ ] Pas d'avertissements console
- [ ] CORS fonctionnent (si API distante)

---

## 📦 Phase 7: Déploiement (1-2h)

### Avant le déploiement

- [ ] Tous les tests Phase 4 passent
- [ ] Intégration Phase 5 complète
- [ ] Code reviewé
- [ ] Pas de TODO ou FIXME

### Déploiement Backend

#### Option 1: Firebase Functions
- [ ] Deploy webhook: `firebase deploy --only functions`
- [ ] Vérifier dans Firebase Console
- [ ] Mettre à jour l'URL webhook Stripe

#### Option 2: Serveur externe (Railway, Heroku, etc)
- [ ] Configurer les variables d'env
- [ ] Déployer le code
- [ ] Tester l'endpoint
- [ ] Mettre à jour l'URL webhook Stripe

#### Option 3: Local en dev
- [ ] Configurer Stripe CLI pour webhook local
- [ ] Garder le serveur running
- [ ] Pour dev/test seulement

### Déploiement Frontend

- [ ] Build l'app: `npm run build` (ou Expo)
- [ ] Tester sur device réel
- [ ] Vérifier les URLs API
- [ ] Déployer sur App Store/Play Store

### Après le déploiement

- [ ] Tester avec un vrai paiement
- [ ] Monitorer les logs (24h)
- [ ] Vérifier les conversions
- [ ] Documenter les problèmes

---

## 🎯 Phase 8: Maintenance (Continu)

### Monitoring Quotidien

- [ ] Vérifier les webhooks Stripe reçus
- [ ] Vérifier que Firestore se met à jour
- [ ] Vérifier pas d'erreurs de paiement excessives
- [ ] Vérifier la performance

### Maintenance Hebdomadaire

- [ ] Relire les logs d'erreur
- [ ] Vérifier les refunds/annulations
- [ ] Mettre à jour la documentation

### Maintenance Mensuelle

- [ ] Revoir les métriques d'abonnement
- [ ] Améliorer l'UX si besoin
- [ ] Vérifier les mises à jour Stripe

---

## ✅ Signature

Quand tout est complété, vous pouvez cocher:

- [ ] Phase 1: Vérification ✅
- [ ] Phase 2: Fichiers ✅
- [ ] Phase 3: Configuration ✅
- [ ] Phase 4: Tests ✅
- [ ] Phase 5: Intégration ✅
- [ ] Phase 6: Vérification Finale ✅
- [ ] Phase 7: Déploiement ✅
- [ ] Phase 8: Maintenance ✅

**Date de complétion:** _______________  
**Approuvé par:** _______________

---

## 📞 Support Rapide

| Problème | Solution |
|----------|----------|
| Import échoue | Vérifier que le fichier existe |
| Composant ne s'affiche pas | Vérifier les console logs |
| Webhook ne reçu | Vérifier l'URL et le secret |
| Firestore ne se met à pas | Vérifier les règles de sécurité |
| Paiement échoue | Vérifier la carte de test |

---

**Système d'Abonnement Stripe**  
**Checklist d'Implémentation Complète**  
**V1.0 - 28 décembre 2025**
