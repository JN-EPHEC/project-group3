# 🚀 LANCER LE BACKEND - Guide Visuel

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📂 Étape 1: Télécharger serviceAccountKey.json           │
│                                                             │
│  1. https://console.firebase.google.com                    │
│  2. wekid-test → ⚙️ → Service Accounts                    │
│  3. Generate new private key                               │
│  4. Télécharger le fichier .json                          │
│                                                             │
│  ⬇️                                                         │
│  backend/serviceAccountKey.json                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🔧 Étape 2: Configuration Automatique                     │
│                                                             │
│  Terminal:                                                  │
│  $ cd backend                                               │
│  $ node setup-backend.js                                    │
│                                                             │
│  Résultat:                                                  │
│  ✅ serviceAccountKey.json existe                          │
│  ✅ .env mis à jour                                        │
│  ✅ Configuration complète!                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🚀 Étape 3: Démarrer le Backend                           │
│                                                             │
│  Terminal:                                                  │
│  $ npm run dev                                              │
│                                                             │
│  Résultat:                                                  │
│  ✅ Firebase Admin initialisé                              │
│  📦 Project ID: wekid-test                                 │
│  🚀 Server running on http://0.0.0.0:3000                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ✅ Étape 4: Tester                                        │
│                                                             │
│  Nouveau Terminal:                                          │
│  $ curl http://localhost:3000/health                        │
│  → {"ok":true}                                             │
│                                                             │
│  $ curl http://localhost:3000/test-firebase                 │
│  → {"connected":true,"collections":["users"],...}          │
│                                                             │
│  ✅ TOUT FONCTIONNE!                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture du Système

```
┌──────────────────────────────────────────────────────────────┐
│                     VOTRE APPLICATION                        │
│                     (React Native)                           │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ HTTPS
                         ↓
┌──────────────────────────────────────────────────────────────┐
│                    BACKEND (Express.js)                      │
│                    http://localhost:3000                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  📍 Endpoints:                                               │
│  • GET  /health                      → Health check         │
│  • GET  /test-firebase               → Test Firebase        │
│  • POST /api/create-checkout-session → Paiement             │
│  • GET  /api/subscription-status/:id → Statut               │
│  • POST /webhook/stripe              → Webhooks Stripe      │
│                                                              │
│  🔧 Services:                                                │
│  • firebase-admin.ts  → Firebase Admin SDK                  │
│  • stripe-api.ts      → API Stripe                          │
│  • stripe-webhook.ts  → Webhooks Stripe                     │
│                                                              │
└────────┬───────────────────────────────┬─────────────────────┘
         │                               │
         │ Firebase Admin SDK            │ Stripe API
         ↓                               ↓
┌────────────────────┐         ┌────────────────────┐
│     FIRESTORE      │         │      STRIPE        │
│   (Database)       │         │   (Paiements)      │
├────────────────────┤         ├────────────────────┤
│                    │         │                    │
│ Collection: users  │         │ • Customers        │
│                    │         │ • Subscriptions    │
│ Champs:            │         │ • Invoices         │
│ • stripeCustomerId │◄────────┤ • Events           │
│ • subscriptionId   │         │                    │
│ • subscriptionStatus│        └────────────────────┘
│ • currentPeriodEnd │                 │
│ • trialEnd         │                 │
│ • cancelAtPeriod   │                 │
│ • lastPaymentFailed│         Webhooks│
│ • subscriptionUpd..│◄────────────────┘
└────────────────────┘
```

---

## Flux de Données - Nouvel Abonnement

```
1️⃣ USER                  2️⃣ BACKEND              3️⃣ STRIPE
   │                        │                        │
   │ Clique "S'abonner"     │                        │
   ├────────────────────────>                        │
   │                        │ Create Checkout        │
   │                        ├───────────────────────>│
   │                        │                        │
   │                        │ Return URL            │
   │                        │<───────────────────────┤
   │ Ouvre URL Stripe       │                        │
   │<───────────────────────┤                        │
   │                        │                        │
   │ Entre CB + Paie        │                        │
   ├────────────────────────────────────────────────>│
   │                        │                        │
   │                        │ ✅ WEBHOOK: checkout.. │
   │                        │<───────────────────────┤
   │                        │                        │
   │                        │ ✅ WEBHOOK: subscription.created
   │                        │<───────────────────────┤
   │                        │                        │
   │                        ↓                        │
   │                   FIRESTORE                     │
   │                   Update user:                  │
   │                   • subscriptionId              │
   │                   • subscriptionStatus: active  │
   │                   • currentPeriodEnd            │
   │                   • trialEnd                    │
   │                        │                        │
   │ ✅ Abonnement actif!   │                        │
   │<───────────────────────┤                        │
```

---

## Variables d'Environnement

```
backend/.env
├── STRIPE_SECRET_KEY          ✅ Configuré
├── STRIPE_WEBHOOK_SECRET      ✅ Configuré
├── PRICE_MONTHLY_ID           ✅ Configuré
├── PRICE_YEARLY_ID            ✅ Configuré
├── FIREBASE_PROJECT_ID        ✅ Auto-rempli
├── FIREBASE_PRIVATE_KEY       ⏳ Auto-rempli après serviceAccountKey.json
├── FIREBASE_CLIENT_EMAIL      ⏳ Auto-rempli après serviceAccountKey.json
├── PORT                       ✅ 3000
└── NODE_ENV                   ✅ development
```

---

## Commandes Utiles

```bash
# Configuration
cd backend
node setup-backend.js              # Vérifie et configure tout

# Démarrage
npm run dev                        # Démarre en mode développement
npm test                           # Configure + démarre
start-optimized.bat               # Script Windows complet

# Tests
curl http://localhost:3000/health                    # Health check
curl http://localhost:3000/test-firebase             # Test Firebase
curl http://localhost:3000/api/subscription-status/test-123  # Test API

# Stripe CLI (webhooks locaux)
stripe listen --forward-to http://localhost:3000/webhook/stripe
stripe trigger customer.subscription.created        # Simuler événement
```

---

## Fichiers Importants

```
backend/
├── firebase-admin.ts          ⭐ Firebase Admin SDK
├── stripe-api.ts              ⭐ API principale
├── stripe-webhook.ts          ⭐ Webhooks Stripe
├── setup-backend.js           🔧 Configuration auto
├── .env                       🔐 Variables secrètes
├── serviceAccountKey.json     🔑 À TÉLÉCHARGER
└── package.json               📦 Scripts npm
```

---

## Troubleshooting Rapide

```
❌ "Cannot find serviceAccountKey.json"
   → Télécharger depuis Firebase Console
   → Placer dans: backend/serviceAccountKey.json

❌ Backend ne démarre pas
   → Lancer: node setup-backend.js
   → Vérifier les erreurs affichées

❌ "Firebase connection failed"
   → Vérifier FIREBASE_PROJECT_ID dans .env
   → Relancer: node setup-backend.js

❌ Erreur CORS
   → Ajouter votre URL dans allowedOrigins (stripe-api.ts)
```

**Guide complet:** `SETUP_AND_TROUBLESHOOTING.md`

---

## 🎯 Prochaine Étape

**MAINTENANT:**
1. Télécharger `serviceAccountKey.json` (2 min)
2. Lancer `node setup-backend.js` (30 sec)
3. Démarrer `npm run dev` (10 sec)
4. Tester `curl http://localhost:3000/test-firebase` (30 sec)

**APRÈS:**
- Configurer Stripe CLI pour webhooks locaux
- Faire un test de paiement
- Voir `ACTION_PLAN.md` pour les phases suivantes

---

**TEMPS TOTAL: 5 MINUTES ⏱️**

**LET'S GO! 🚀**
