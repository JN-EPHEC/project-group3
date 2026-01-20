# 📝 Résumé des Corrections - Mise à Jour du Statut de Paiement Stripe

## 🎯 Problème Résolu

**Avant :** Quand un utilisateur payait sur Stripe, le champ `subscriptionStatus` n'était **PAS** mis à jour dans Firestore.

**Maintenant :** Le statut se met à jour automatiquement immédiatement après le paiement ✅

---

## 🔧 3 Corrections Apportées

### 1️⃣ **stripe-api.ts** - Mise à jour des métadonnées du customer existant

**Fichier :** [backend/stripe-api.ts](backend/stripe-api.ts#L100)

```diff
  if (existingCustomers.data.length > 0) {
    customer = existingCustomers.data[0];
    
+   // 🆕 Ajouter le userId aux métadonnées si manquant
+   if (!customer.metadata?.userId) {
+     console.log('🔄 Updating existing customer with userId metadata...');
+     customer = await stripe.customers.update(customer.id, {
+       metadata: { userId: userId },
+     });
+   }
  } else {
    customer = await stripe.customers.create({
      email: userEmail,
      metadata: { userId: userId },
    });
  }
```

**Changement:** Quand un client Stripe existe déjà, on met à jour ses métadonnées avec le userId pour que les webhooks puissent le retrouver.

---

### 2️⃣ **stripe-webhook.ts** - handleCheckoutSessionCompleted

**Fichier :** [backend/stripe-webhook.ts](backend/stripe-webhook.ts#L85)

```diff
  async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    console.log('💳 Checkout completed:', session.id);
  
-   const userId = session.metadata?.userId;
-   if (!userId) {
-     console.error('❌ No userId in session metadata');
+   let userId = session.metadata?.userId;
+
+   // 🆕 Si pas de userId dans session, chercher dans customer metadata
+   if (!userId && session.customer) {
+     console.log('🔍 No userId in session metadata, fetching from customer...');
+     try {
+       const customer = await stripe.customers.retrieve(session.customer as string) as Stripe.Customer;
+       userId = customer.metadata?.userId;
+       console.log('✅ userId retrieved from customer metadata:', userId);
+     } catch (error) {
+       console.error('❌ Error fetching customer:', error);
+     }
+   }
+
+   if (!userId) {
+     console.error('❌ No userId found in session or customer metadata');
      return;
    }
```

**Changement:** Fallback automatique pour chercher le userId dans les métadonnées du customer si absent de la session.

---

### 3️⃣ **stripe-webhook.ts** - Les autres webhooks

**Fichiers affectés :**
- `handleSubscriptionCreated()` [Ligne ~163]
- `handleSubscriptionUpdated()` [Ligne ~191]  
- `handleSubscriptionDeleted()` [Ligne ~222]

**Pattern appliqué à tous :**

```typescript
// Essayer métadonnées de subscription d'abord
let userId = subscription.metadata?.userId;

// 🆕 Fallback : chercher dans customer metadata
if (!userId && subscription.customer) {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
    userId = customer.metadata?.userId;
  } catch (error) {
    console.error('Error fetching customer for subscription:', error);
  }
}

// Erreur seulement si vraiment pas trouvé
if (!userId) {
  console.error('❌ No userId found in subscription or customer metadata');
  return;
}
```

---

## 📊 Flux Avant/Après

### ❌ AVANT (Problématique)

```
Utilisateur paye
    ↓
Webhook reçu (checkout.session.completed)
    ↓
userId = session.metadata?.userId  ← Souvent vide!
    ↓
if (!userId) return ← STOP! Utilisateur pas mis à jour
    ↓
Firestore NOT UPDATED ❌
```

### ✅ APRÈS (Corrigé)

```
Utilisateur paye
    ↓
Webhook reçu (checkout.session.completed)
    ↓
userId = session.metadata?.userId
    ↓
if (!userId) {
  Chercher dans customer.metadata.userId ← Fallback!
}
    ↓
userId trouvé! ✅
    ↓
Update Firestore avec subscriptionStatus, etc. ✅
```

---

## 🧪 Vérification

Pour vérifier que tout fonctionne :

### 1. Exécutez le test
```bash
bash test-stripe-payment.sh
```

### 2. Complétez un paiement test

Utilisez une carte de test Stripe :
```
Numéro: 4242 4242 4242 4242
Exp: 12/25
CVC: 123
```

### 3. Vérifiez Firestore

```javascript
db.collection('users').doc('your-user-id').get().then(doc => {
  console.log(doc.data());
  // Doit voir: subscriptionStatus: "trialing"
});
```

### 4. Vérifiez les logs du backend

Vous devriez voir :
```
✅ Event received: checkout.session.completed
💳 Checkout completed: cs_test_...
✅ userId retrieved from customer metadata: [user-id]
✅ User [user-id] subscription started
```

---

## 📁 Fichiers Modifiés

| Fichier | Lignes | Changement |
|---------|--------|-----------|
| [backend/stripe-api.ts](backend/stripe-api.ts) | ~110-120 | Ajouter userId aux métadonnées du customer existant |
| [backend/stripe-webhook.ts](backend/stripe-webhook.ts) | ~95-110 | Fallback userId dans handleCheckoutSessionCompleted |
| [backend/stripe-webhook.ts](backend/stripe-webhook.ts) | ~163-180 | Fallback userId dans handleSubscriptionCreated |
| [backend/stripe-webhook.ts](backend/stripe-webhook.ts) | ~191-210 | Fallback userId dans handleSubscriptionUpdated |
| [backend/stripe-webhook.ts](backend/stripe-webhook.ts) | ~222-240 | Fallback userId dans handleSubscriptionDeleted |

---

## 🔍 Logs de Debugging

Tous les logs ajoutés commencent par emoji pour facile repérage :

- 🔵 = Informations générales
- 🟢 = Succès
- 🔴 = Erreurs
- 🔄 = Changements/mises à jour
- 🔍 = Recherche/fallback

Cherchez `No userId found` pour identifier si le problème persiste.

---

## 📚 Documentation

Voir aussi :
- [PAYMENT_SUCCESS_FIX.md](PAYMENT_SUCCESS_FIX.md) - Guide complet de debugging
- [FIRESTORE_SUBSCRIPTION_SCHEMA.md](FIRESTORE_SUBSCRIPTION_SCHEMA.md) - Structure des données
- [SUBSCRIPTION_SYSTEM.md](SUBSCRIPTION_SYSTEM.md) - Vue d'ensemble du système

