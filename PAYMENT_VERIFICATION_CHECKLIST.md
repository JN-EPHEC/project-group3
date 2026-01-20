# ✅ Checklist - Vérification de la Correction du Paiement Stripe

## 🎯 Avant de Tester

### Code Source
- [ ] Vérififier que `backend/stripe-api.ts` a la correction de mise à jour du customer (ligne ~110)
- [ ] Vérifier que `backend/stripe-webhook.ts` a les fallbacks userId dans tous les webhooks
- [ ] Vérifier que les logs contiennent les nouveaux messages (🔍, 🔄, etc.)

### Configuration
- [ ] `STRIPE_SECRET_KEY` est définie dans `.env`
- [ ] `STRIPE_WEBHOOK_SECRET` est définie dans `.env`
- [ ] `PRICE_MONTHLY_ID` est définie dans `.env` (ou utilise la valeur par défaut)
- [ ] `PRICE_YEARLY_ID` est définie dans `.env` (ou utilise la valeur par défaut)

### Firebase
- [ ] Firebase Admin SDK est configuré dans `backend/firebase-admin.ts`
- [ ] Firestore existe et a une collection `users`
- [ ] Les règles de sécurité permettent write sur `users/{userId}`

### Stripe Dashboard
- [ ] Webhook configuré à l'URL correcte
- [ ] Webhook reçoit les événements: `checkout.session.completed`, `customer.subscription.created`, etc.
- [ ] Clé secrète du webhook correspond à `STRIPE_WEBHOOK_SECRET`

---

## 🧪 Tests Préliminaires

### 1. Backend Accessible
```bash
curl http://localhost:3000/health
# Doit retourner: {"ok":true}
```
- [ ] Réponse HTTP 200
- [ ] JSON valide

### 2. Firebase Accessible
```bash
curl http://localhost:3000/test-firebase
# Doit retourner: {"connected":true,"collections":["users","..."]}
```
- [ ] Réponse HTTP 200
- [ ] `"connected":true`
- [ ] `"users"` dans collections

### 3. Créer une Session Checkout
```bash
curl -X POST http://localhost:3000/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "priceId": "price_1SiXfe2OiYebg9QDRWHm63We",
    "userId": "test-user-123",
    "userEmail": "test@example.com"
  }'
# Doit retourner: {"sessionId":"cs_...","url":"https://checkout.stripe.com/..."}
```
- [ ] Réponse HTTP 200
- [ ] `sessionId` présent
- [ ] `url` présent et valide

---

## 💳 Test du Flux de Paiement Complet

### Étape 1: Créer un utilisateur test
- [ ] Créer un compte utilisateur dans l'app (Firebase Auth)
- [ ] Noter l'email utilisé
- [ ] Noter l'UID utilisé

### Étape 2: Lancer une session de paiement
- [ ] Cliquer sur "S'abonner" dans l'app
- [ ] La page Stripe Checkout doit s'ouvrir
- [ ] L'URL doit contenir l'email correct

### Étape 3: Compléter le paiement
- [ ] Utiliser une carte de test Stripe: `4242 4242 4242 4242`
- [ ] Entrer date d'expiration: `12/25` (ou future)
- [ ] Entrer CVC: `123` (ou n'importe quel 3 chiffres)
- [ ] Cliquer "Payer"

### Étape 4: Vérifier la redirection
- [ ] Être redirigé vers l'URL de succès
- [ ] L'URL doit contenir `session_id=cs_...`
- [ ] Alerte de succès doit s'afficher dans l'app

---

## 📊 Vérification des Données

### Logs du Backend
```
✅ Event received: checkout.session.completed
💳 Checkout completed: cs_test_...
[Une ou l'autre:]
  ✅ userId retrieved from customer metadata: user-123
  OU
  🔍 No userId in session metadata, fetching from customer...
✅ User user-123 subscription started

✅ Event received: customer.subscription.created
📝 Subscription created: sub_test_...
✅ User user-123 subscription created: sub_test_...

✅ Event received: invoice.paid
✅ Invoice paid: in_test_...
✅ User user-123 payment successful - subscription renewed
```

- [ ] Tous les événements Stripe reçus
- [ ] Tous les logs contiennent le user-id correct
- [ ] Aucune erreur "❌ No userId"
- [ ] Aucune erreur "No userId in subscription metadata"

### Firestore - Document utilisateur

Accéder à: Firestore → Collection `users` → Document avec UID utilisateur

Vérifier que les champs existent et sont non-vides:
- [ ] `stripeCustomerId`: `"cus_..."`
- [ ] `subscriptionId`: `"sub_..."`
- [ ] `subscriptionStatus`: `"trialing"` ou `"active"`
- [ ] `currentPeriodEnd`: Date future (ex: Jan 20, 2026)
- [ ] `trialEnd`: Date + 30 jours (ex: Feb 19, 2026)
- [ ] `cancelAtPeriodEnd`: `false`
- [ ] `lastPaymentFailed`: `false`
- [ ] `subscriptionUpdatedAt`: Timestamp récent

### Stripe Dashboard

Aller à: Customers → Sélectionner le client test

Vérifier:
- [ ] Email correct
- [ ] Métadonnées contient `userId`
- [ ] Métadonnées contient les clés correctes
- [ ] Une subscription existe avec statut "active" ou "trialing"
- [ ] Trial end date est environ 30 jours à l'avenir

Aller à: Events

- [ ] `checkout.session.completed` - HTTP 200
- [ ] `customer.subscription.created` - HTTP 200
- [ ] `invoice.paid` - HTTP 200
- [ ] Aucun événement avec status d'erreur

---

## 🐛 Dépannage

### Les logs affichent "❌ No userId"?

```
❌ No userId in session metadata
❌ No userId found in subscription or customer metadata
```

**Actions:**
1. [ ] Vérifier que le userId est bien passé à `createCheckoutSession()`
2. [ ] Vérifier que le customer Stripe a la métadonnée `userId`
3. [ ] Vérifier que `stripe.customers.update()` retourne une erreur
4. [ ] Vérifier les permissions Stripe (clé test vs live)
5. [ ] Vérifier que le webhook peut appeler `stripe.customers.retrieve()`

### Firestore n'est pas mis à jour?

**Actions:**
1. [ ] Vérifier que le webhook reçoit les événements (Stripe Dashboard → Events)
2. [ ] Vérifier que les webhooks retournent HTTP 200
3. [ ] Vérifier les permissions Firestore: 
   ```
   allow write: if request.auth.uid == resource.id;
   ```
4. [ ] Vérifier que l'utilisateur existe dans Firestore
5. [ ] Vérifier les logs d'erreur Firebase dans le backend

### L'app n'affiche pas le statut "Actif"?

**Actions:**
1. [ ] Attendre 2-3 secondes (webhooks asynchrones)
2. [ ] Recharger l'app (pull-to-refresh ou Force reload)
3. [ ] Vérifier que `getSubscriptionStatus()` appelle le bon endpoint
4. [ ] Vérifier que le userId est correct dans l'app
5. [ ] Vérifier que Firestore est correctement chargé dans l'app

---

## ✨ Test de Succès - Tous les ✅ ?

Si vous avez coché tous les points ci-dessus:

### ✅ La correction est activée

L'issue est maintenant résolue:
- **Avant:** Le statut de paiement ne se mettait pas à jour
- **Maintenant:** Le statut se met à jour automatiquement après le paiement ✅

### 🚀 Prêt pour la production

Le flux de paiement est maintenant fiable et productif:
1. Utilisateur complète le paiement
2. Webhook Stripe déclenché
3. userId retrouvé (même dans les cas difficiles)
4. Firestore mis à jour
5. App affiche le nouveau statut

### 📝 Documenter le test

Ajouter à votre rapport de test:
```markdown
## Test du Paiement Stripe ✅

Date: [date du test]
Utilisateur test: [uid]
Montant: [montant]
Carte: 4242 4242 4242 4242
Résultat: ✅ RÉUSSI

Logs backend: [copier les logs pertinents]
Firestore: [copier le document utilisateur]
Stripe: [copier le client et subscription]
```

---

## 📚 Fichiers de Référence

- [PAYMENT_FIX_SUMMARY.md](PAYMENT_FIX_SUMMARY.md) - Résumé des corrections
- [PAYMENT_SUCCESS_FIX.md](PAYMENT_SUCCESS_FIX.md) - Guide détaillé
- [firestore-debug.js](firestore-debug.js) - Scripts de debug
- [test-stripe-payment.sh](test-stripe-payment.sh) - Script de test auto

