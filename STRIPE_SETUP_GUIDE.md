# 🚀 Guide d'Installation et Configuration Stripe

## 📋 Prérequis

✅ **Price IDs récupérés** :
- Mensuel : `price_1SiXfe2OiYebg9QDRWHm63We0` (7,99€)
- Annuel : `price_1SiXfe2OiYebg9QDfh8rWIcX1` (89,99€)
- Produit : `prod_TftSX4g41Ot7Vn`

---

## 🔧 Étape 1 : Configuration des Variables d'Environnement

### 1.1 Récupérer les Clés Stripe

1. Va sur [Stripe Dashboard](https://dashboard.stripe.com)
2. **Developers** → **API keys**
3. Copie :
   - **Publishable key** (pk_test_...)
   - **Secret key** (sk_test_...)

### 1.2 Créer le fichier .env

```bash
# À la racine du projet
cp .env.example .env
```

Édite `.env` et remplace les valeurs :

```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_VOTRE_CLE_PUBLIQUE
STRIPE_SECRET_KEY=sk_test_VOTRE_CLE_SECRETE
EXPO_PUBLIC_API_URL=http://localhost:3000
```

### 1.3 Ajouter .env au .gitignore

```bash
echo ".env" >> .gitignore
```

---

## 🖥️ Étape 2 : Installation Backend

### 2.1 Installer les dépendances

```bash
cd backend
npm install
```

### 2.2 Lancer le serveur de développement

```bash
npm run dev
```

Le serveur devrait démarrer sur `http://localhost:3000`

### 2.3 Tester l'API

```bash
curl -X POST http://localhost:3000/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "priceId": "price_1SiXfe2OiYebg9QDRWHm63We0",
    "userId": "test-user-123",
    "userEmail": "test@example.com"
  }'
```

---

## 📱 Étape 3 : Installation Frontend (Mobile)

### 3.1 Installer les dépendances

```bash
# À la racine du projet
npm install
```

### 3.2 Lancer l'app

```bash
npx expo start
```

### 3.3 Tester le Deep Linking

Pendant le développement, tu peux simuler un deep link :

```bash
# iOS Simulator
xcrun simctl openurl booted "myapp://payment-success?session_id=test_123"

# Android Emulator
adb shell am start -W -a android.intent.action.VIEW -d "myapp://payment-success?session_id=test_123"
```

---

## 🌐 Étape 4 : Configuration du Webhook Stripe

### 4.1 Développement Local (avec Stripe CLI)

1. **Installer Stripe CLI** :
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Windows
   scoop install stripe
   ```

2. **Login** :
   ```bash
   stripe login
   ```

3. **Forwarder les webhooks** :
   ```bash
   stripe listen --forward-to localhost:3000/webhook/stripe
   ```

4. **Copier le webhook secret** affiché et l'ajouter à `.env` :
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### 4.2 Production

1. Va sur [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Clique **Add endpoint**
3. URL : `https://votre-backend.com/webhook/stripe`
4. **Événements à écouter** :
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.paid`
5. Copie le **Signing secret** dans `.env`

---

## 🧪 Étape 5 : Tester le Flow Complet

### 5.1 Test en Développement

1. **Lance le backend** :
   ```bash
   cd backend
   npm run dev
   ```

2. **Lance le webhook listener** (terminal séparé) :
   ```bash
   stripe listen --forward-to localhost:3000/webhook/stripe
   ```

3. **Lance l'app mobile** :
   ```bash
   npx expo start
   ```

4. Dans l'app :
   - Va sur l'écran d'abonnement
   - Sélectionne un plan
   - Clique sur "Commencer l'essai gratuit"
   - Tu seras redirigé vers Stripe Checkout

5. **Carte de test Stripe** :
   - Numéro : `4242 4242 4242 4242`
   - Date : N'importe quelle date future
   - CVC : N'importe quel 3 chiffres

6. Valide le paiement → Tu seras redirigé vers l'app

### 5.2 Vérifier dans Stripe Dashboard

1. Va sur [Stripe Customers](https://dashboard.stripe.com/test/customers)
2. Vérifie que le client a été créé
3. Clique sur le client → onglet **Subscriptions**
4. Tu devrais voir l'abonnement en **Trialing** (30 jours)

---

## 🚀 Étape 6 : Déploiement Production

### 6.1 Déployer le Backend

**Option A : Firebase Functions** (recommandé si tu utilises déjà Firebase)

```bash
# Installer Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialiser Functions
firebase init functions

# Déployer
firebase deploy --only functions
```

**Option B : Vercel**

```bash
npm install -g vercel
vercel
```

**Option C : Railway.app**

1. Va sur [Railway.app](https://railway.app)
2. Connecte ton repo GitHub
3. Configure les variables d'environnement
4. Déploie automatiquement

### 6.2 Mettre à jour les URLs

Dans `.env` :

```env
EXPO_PUBLIC_API_URL=https://votre-backend.com
```

Dans `constants/stripeConfig.ts`, update les Deep Links si besoin.

### 6.3 Passer en Mode Live (Clés de Production)

1. Dans Stripe Dashboard, passe en **Live mode**
2. Récupère les **clés Live** (pk_live_... et sk_live_...)
3. Update `.env` avec les clés Live
4. Configure le webhook Production
5. Rebuild l'app

---

## 🎯 Checklist Finale

- [ ] Clés Stripe configurées dans `.env`
- [ ] Backend lancé et accessible
- [ ] Webhook configuré et testé
- [ ] Deep linking fonctionne (iOS et Android)
- [ ] Test de paiement réussi avec carte test
- [ ] Vérification dans Stripe Dashboard
- [ ] Backend déployé en production
- [ ] Clés Live configurées
- [ ] App publiée sur stores

---

## 🆘 Troubleshooting

### Problème : "Cannot open Stripe Checkout URL"

**Solution** : Vérifie que le backend retourne bien une URL valide

```bash
curl http://localhost:3000/api/create-checkout-session -d '{"priceId":"...","userId":"...","userEmail":"..."}'
```

### Problème : Deep Link ne fonctionne pas

**Solution** :
1. Vérifie `app.json` → `scheme: "myapp"`
2. Rebuild l'app : `npx expo start -c`
3. Test manuel : `xcrun simctl openurl booted "myapp://payment-success"`

### Problème : Webhook n'est pas reçu

**Solution** :
1. Vérifie que `stripe listen` est actif
2. Vérifie les logs : `stripe logs tail`
3. Test manuel : `stripe trigger checkout.session.completed`

### Problème : "Invalid API Key"

**Solution** : Vérifie que la clé commence par `sk_test_` ou `sk_live_`

---

## 📚 Ressources

- [Documentation Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Expo Linking](https://docs.expo.dev/guides/linking/)

---

## 🎉 Prochaines Étapes

Une fois tout configuré, tu peux :
1. Personnaliser l'UI de l'écran d'abonnement
2. Ajouter des analytics (track les conversions)
3. Implémenter le Customer Portal
4. Ajouter des notifications push pour les paiements échoués
5. Créer des codes promo

Bonne chance ! 🚀
