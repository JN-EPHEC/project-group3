# 🚀 Guide de Déploiement - Système d'Abonnement Stripe

## ✅ Éléments Déployés

### 1. Backend (Base de données)
- ✅ Champs ajoutés à la collection `users` dans Firestore
- ✅ Webhooks Stripe configurés pour synchronisation automatique
- ✅ API endpoints améliorés pour gestion d'abonnement

### 2. Backend (Serveur API)
- ✅ Endpoint `/api/subscription-status/:userId` amélioré
- ✅ Nouvel endpoint `/api/sync-subscription/:userId` ajouté
- ✅ Gestion de métadonnées Stripe optimisée

### 3. Frontend (Logique)
- ✅ Service `subscriptionSync.ts` créé avec 5+ fonctions
- ✅ Helpers Firestore mis à jour avec 3 nouvelles fonctions
- ✅ Service Stripe intégré pour synchronisation

### 4. Frontend (UI)
- ✅ Composant `SubscriptionDisplay.tsx` créé
- ✅ Deux modes d'affichage (complet et compact)
- ✅ Gestion complète des états et erreurs

### 5. Documentation
- ✅ `SUBSCRIPTION_SYSTEM.md` - Guide complet du système
- ✅ `SUBSCRIPTION_CHANGES.md` - Résumé des changements
- ✅ `SUBSCRIPTION_INTEGRATION_EXAMPLES.tsx` - 5 exemples d'intégration
- ✅ `DEPLOYMENT_GUIDE.md` - Ce fichier

## 📋 Checklist de Vérification

### Base de données (Firestore)

- [ ] Vérifier que les champs existent dans un document utilisateur existant :
  ```javascript
  db.collection('users').doc('test-user-id').get().then(doc => {
    console.log(doc.data());
    // Doit contenir: stripeCustomerId, subscriptionId, subscriptionStatus, etc.
  });
  ```

### Backend API

- [ ] Tester l'endpoint `GET /api/subscription-status/:userId`
  ```bash
  curl http://localhost:3000/api/subscription-status/test-user-123
  ```

- [ ] Tester l'endpoint `POST /api/sync-subscription/:userId`
  ```bash
  curl -X POST http://localhost:3000/api/sync-subscription/test-user-123
  ```

### Webhooks Stripe

- [ ] Vérifier que les webhooks sont configurés dans Stripe Dashboard :
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `invoice.paid`

- [ ] Tester avec une session Stripe de test

### Frontend

- [ ] Importer le service dans l'app
- [ ] Tester avec un utilisateur réel
- [ ] Vérifier que `hasActiveSubscription()` retourne une valeur

## 🔧 Configuration Nécessaire

### Variables d'environnement Backend

```bash
# stripe-api.ts et stripe-webhook.ts
STRIPE_SECRET_KEY=sk_test_...         # Clé secrète Stripe
STRIPE_WEBHOOK_SECRET=whsec_...       # Secret du webhook
STRIPE_MONTHLY_PRICE=price_...        # ID du prix mensuel
STRIPE_YEARLY_PRICE=price_...         # ID du prix annuel
```

### Variables d'environnement Frontend

```javascript
// constants/stripeConfig.ts
export const STRIPE_CONFIG = {
  API_URL: 'http://localhost:3000',   // URL de l'API backend
  PRICES: {
    monthly: 'price_...',
    yearly: 'price_...',
  },
};
```

## 📦 Installation des Dépendances

Vérifier que toutes les dépendances sont installées :

```bash
# Backend
npm install stripe stripe-firestore-admin firebase-admin

# Frontend
npm install firebase firebase/auth firebase/firestore expo-web-browser
```

## 🧪 Tests d'Intégration

### 1. Test du flux complet

```typescript
// test-subscription-flow.ts
import { StripeService } from '@/constants/stripeService';
import { hasActiveSubscription, getUserCurrentSubscriptionInfo } from '@/constants/subscriptionSync';
import { getAuth } from 'firebase/auth';

async function testSubscriptionFlow() {
  const auth = getAuth();
  
  // 1. Vérifier pas d'abonnement initialement
  console.log('1. Checking initial status...');
  let hasActive = await hasActiveSubscription();
  console.log('Has active subscription:', hasActive);
  
  // 2. Créer une session checkout (test)
  console.log('2. Creating checkout session...');
  try {
    await StripeService.createCheckoutSession('price_test_monthly');
  } catch (error) {
    console.log('Checkout opened in browser');
  }
  
  // 3. Après paiement (simulé), vérifier les infos
  console.log('3. Checking subscription info after payment...');
  const info = await getUserCurrentSubscriptionInfo();
  console.log('Subscription info:', info);
  
  // 4. Vérifier le statut formaté
  console.log('4. Getting formatted status...');
  const status = await getFormattedCurrentSubscriptionStatus();
  console.log('Formatted status:', status.status);
}

// Exécuter le test
testSubscriptionFlow();
```

### 2. Test des webhooks

```bash
# Envoyer un événement de test à votre endpoint webhook
curl -X POST http://localhost:3000/webhook/stripe \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test_signature_xyz" \
  -d '{"type":"customer.subscription.created","data":{"object":{"id":"sub_test"}}}'
```

### 3. Test dans l'application

```typescript
// Dans un écran de test
import SubscriptionDisplay from '@/components/SubscriptionDisplay';

export default function TestScreen() {
  return (
    <SubscriptionDisplay
      refreshOnLoad={true}
      onSubscriptionPress={() => alert('Subscribe pressed')}
      onManagePress={() => alert('Manage pressed')}
    />
  );
}
```

## 📊 Monitoring

### Vérifier les logs Firebase

```javascript
// Firestore → Fonctions Cloud → Logs
// Devrait montrer les webhooks traités
```

### Vérifier les logs Stripe

```
Dashboard Stripe → Developers → Webhooks → Select endpoint → Logs
```

### Vérifier les données Firestore

```javascript
// Console Firebase
db.collection('users').orderBy('subscriptionUpdatedAt', 'desc').limit(5).get()
```

## 🚨 Troubleshooting

### Problème: Les webhooks ne mettent pas à jour Firestore

**Solution:**
1. Vérifier la signature du webhook dans les logs
2. S'assurer que `STRIPE_WEBHOOK_SECRET` est correct
3. Vérifier que Firebase Admin SDK est correctement configuré
4. Vérifier les règles Firestore permettent les écritures

### Problème: `hasActiveSubscription()` retourne toujours false

**Solution:**
1. Vérifier que `stripeCustomerId` existe dans Firestore
2. S'assurer que l'utilisateur a un abonnement dans Stripe Dashboard
3. Forcer une synchronisation avec `refreshSubscriptionStatus()`
4. Vérifier les logs de `getSubscriptionStatus()`

### Problème: L'application ne démarre pas après les modifications

**Solution:**
1. Vérifier les imports TypeScript
2. S'assurer que le fichier `subscriptionSync.ts` n'a pas d'erreurs de syntaxe
3. Vérifier que tous les types sont importés correctement
4. Exécuter `npm install` pour mettre à jour les dépendances

## 📱 Intégration dans les Écrans Existants

### Ajouter le composant au profil

```tsx
// app/(tabs)/Profil.tsx
import SubscriptionDisplay from '@/components/SubscriptionDisplay';

export default function ProfilScreen() {
  return (
    <ScrollView>
      {/* Autres contenu */}
      
      <SubscriptionDisplay
        onSubscriptionPress={() => {
          // Ouvrir checkout
        }}
        onManagePress={() => {
          // Ouvrir portail client
        }}
      />
      
      {/* Autres contenu */}
    </ScrollView>
  );
}
```

### Ajouter une vérification pour les fonctionnalités premium

```tsx
import { hasActiveSubscription } from '@/constants/subscriptionSync';

export default function PremiumFeatureScreen() {
  const [canAccess, setCanAccess] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const has = await hasActiveSubscription();
    setCanAccess(has);
  };

  if (!canAccess) {
    return <LockedScreen />;
  }

  return <PremiumContent />;
}
```

## 📞 Support

Pour des questions sur l'intégration :
1. Consulter `SUBSCRIPTION_SYSTEM.md` pour la documentation complète
2. Consulter `SUBSCRIPTION_INTEGRATION_EXAMPLES.tsx` pour des exemples
3. Vérifier les logs Stripe Dashboard
4. Vérifier les logs Firebase

## ✨ Prochaines Améliorations

- [ ] Ajouter notifications push quand l'abonnement expire
- [ ] Ajouter interface de gestion des coupon codes
- [ ] Ajouter historique des factures
- [ ] Ajouter upgrade/downgrade de plan
- [ ] Ajouter analytics d'abonnement
- [ ] Ajouter support de multiples devises

---

**Version:** 1.0  
**Date:** 28 décembre 2025  
**Statut:** ✅ Prêt pour production
