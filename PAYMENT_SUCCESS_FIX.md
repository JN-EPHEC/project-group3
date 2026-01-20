# 🔧 Résolution - Mise à Jour du Statut de Paiement Stripe

## Problème Identifié

Quand un utilisateur payait via Stripe, le champ `subscriptionStatus` (et autres informations d'abonnement) ne se mettait pas à jour automatiquement dans Firestore, empêchant la synchronisation des données d'abonnement.

## Racine du Problème

Le problème avait trois causes :

### 1. **Manque de userId dans les métadonnées du customer (stripe-api.ts)**

Quand un client Stripe existant était trouvé (par email), on ne mettait pas à jour ses métadonnées avec le `userId`. Cela signifiait que les webhooks ne pouvaient pas retrouver le `userId` pour synchroniser avec Firestore.

**Code avant :**
```typescript
if (existingCustomers.data.length > 0) {
  customer = existingCustomers.data[0];
  // ❌ userId métadonnées jamais mises à jour
} else {
  customer = await stripe.customers.create({
    email: userEmail,
    metadata: { userId: userId }, // ✅ userId ajouté pour nouveau client
  });
}
```

**Code après :**
```typescript
if (existingCustomers.data.length > 0) {
  customer = existingCustomers.data[0];
  
  // ✅ Mettre à jour les métadonnées si userId manquant
  if (!customer.metadata?.userId) {
    console.log('🔄 Updating existing customer with userId metadata...');
    customer = await stripe.customers.update(customer.id, {
      metadata: { userId: userId },
    });
  }
}
```

### 2. **Webhooks ne cherchant pas userId dans les métadonnées du customer**

Les webhooks essayaient seulement de récupérer le `userId` depuis les métadonnées de la subscription ou de la session, mais ne cherchaient pas dans les métadonnées du customer quand c'était nécessaire.

**Webhooks affectés :**
- `handleCheckoutSessionCompleted()` - ✅ Corrigé
- `handleSubscriptionCreated()` - ✅ Corrigé
- `handleSubscriptionUpdated()` - ✅ Corrigé
- `handleSubscriptionDeleted()` - ✅ Corrigé
- `handlePaymentFailed()` - Avait déjà le fallback correct
- `handleInvoicePaid()` - ✅ Amélioré

## Solutions Implémentées

### 1. **backend/stripe-api.ts** - Mettre à jour les métadonnées du customer existant

```typescript
// Ligne ~100-115
if (existingCustomers.data.length > 0) {
  customer = existingCustomers.data[0];
  
  if (!customer.metadata?.userId) {
    console.log('🔄 Updating existing customer with userId metadata...');
    customer = await stripe.customers.update(customer.id, {
      metadata: { userId: userId },
    });
  }
}
```

### 2. **backend/stripe-webhook.ts** - Améliorer tous les webhooks avec fallback userId

Pattern de fallback utilisé dans tous les webhooks :

```typescript
// Essayer métadonnées directes d'abord
let userId = subscription.metadata?.userId;

// Fallback : récupérer depuis customer metadata
if (!userId && subscription.customer) {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    userId = customer.metadata?.userId;
  } catch (error) {
    console.error('Error fetching customer:', error);
  }
}

// Erreur seulement si vraiment pas trouvé
if (!userId) {
  console.error('❌ No userId found in subscription or customer metadata');
  return;
}
```

## Comment Tester

### 1. Tester manuellement via Stripe Dashboard

```bash
# 1. Ouvrir la session de paiement
# 2. Utiliser la carte test : 4242 4242 4242 4242
# 3. Remplir les champs (exp: 12/25, CVC: 123)
# 4. Cliquer "Payer"
# 5. Vérifier que la redirection se fait avec success=true
```

### 2. Vérifier les logs du backend

```bash
# Le backend doit afficher (par ordre) :

✅ Event received: checkout.session.completed
💳 Checkout completed: cs_test_...
🔍 No userId in session metadata, fetching from customer...
✅ userId retrieved from customer metadata: user123
✅ User user123 subscription started

✅ Event received: customer.subscription.created
📝 Subscription created: sub_...
✅ User user123 subscription created: sub_...

✅ Event received: invoice.paid
✅ Invoice paid: in_...
✅ User user123 payment successful - subscription renewed
```

### 3. Vérifier Firestore

```javascript
// Vérifier que l'utilisateur a les champs corrects
db.collection('users').doc('user123').get().then(doc => {
  const data = doc.data();
  console.log({
    stripeCustomerId: data.stripeCustomerId,      // Doit exister
    subscriptionId: data.subscriptionId,          // Doit exister
    subscriptionStatus: data.subscriptionStatus,  // "active" ou "trialing"
    currentPeriodEnd: data.currentPeriodEnd,      // Date future
    trialEnd: data.trialEnd,                      // Date + 30 jours
    lastPaymentFailed: data.lastPaymentFailed,    // false
    subscriptionUpdatedAt: data.subscriptionUpdatedAt, // Récent
  });
});
```

### 4. Vérifier dans l'app

```typescript
// L'app affichera automatiquement :
// - "Actif" au lieu de "Inactif"
// - "Expires le [date]"
// - Les jours restants
```

## Debugger les Problèmes de Paiement

### Webhook non reçu ?

```bash
# 1. Vérifier les webhooks Stripe Dashboard
#    → Settings → Webhooks → Vérifier le statut (200 OK)

# 2. Vérifier si l'URL du webhook est correcte
#    → Doit être accessible depuis internet (pas localhost)

# 3. Vérifier la clé webhook
#    → echo $STRIPE_WEBHOOK_SECRET dans le terminal
```

### userId non trouvé ?

```bash
# 1. Vérifier que userId est passé à la session Checkout
#    → Console Stripe, session metadata

# 2. Vérifier que le customer a les métadonnées
#    → Stripe Dashboard → Customers → Sélectionner → Vérifier metadata

# 3. Sinon, le fallback le cherchera automatiquement
```

### Firestore non mis à jour ?

```bash
# 1. Vérifier les logs du backend
#    → Chercher "❌" pour les erreurs

# 2. Vérifier les permissions Firestore
#    → Règles de sécurité doivent permettre write sur 'users/{userId}'

# 3. Vérifier que userId existe dans Firestore
#    → Collection 'users' → Document 'userId'
```

## Champs Mis à Jour lors du Paiement

Après un paiement réussi, ces champs sont synchronisés :

```typescript
{
  stripeCustomerId: "cus_...",
  subscriptionId: "sub_...",
  subscriptionStatus: "trialing" | "active" | "past_due" | "canceled",
  currentPeriodEnd: Timestamp,      // Date de fin de la période
  trialEnd: Timestamp | null,       // Date de fin d'essai (30 jours)
  cancelAtPeriodEnd: boolean,       // false = abonnement actif
  lastPaymentFailed: boolean,       // false = paiement réussi
  subscriptionUpdatedAt: Timestamp, // Dernière mise à jour
}
```

## Notes Importantes

1. **Métadonnées Stripe limités à 50 clés** : On stocke seulement `userId`
2. **Webhooks asynchrones** : Les mises à jour peuvent prendre 1-2 secondes
3. **Deep links** : Les URLs de redirection doivent être valides sur le device
4. **Essai gratuit** : Défini à 30 jours dans la config Stripe

## Fichiers Modifiés

- [backend/stripe-api.ts](backend/stripe-api.ts) - Ligne ~110
- [backend/stripe-webhook.ts](backend/stripe-webhook.ts) - Multiples webhooks

## Liens Utiles

- [Stripe Webhooks Docs](https://stripe.com/docs/webhooks)
- [Stripe Metadata](https://stripe.com/docs/api/metadata)
- [Stripe Customer Portal](https://stripe.com/docs/billing/portal)

