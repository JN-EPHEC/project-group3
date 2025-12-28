# ✅ PLAN D'ACTION - Rendre Fonctionnel Avec Firebase

## 🎯 Objectif
Rendre le système d'abonnement Stripe **100% fonctionnel** avec Firebase

## ⏱️ Temps Total: 2-3 heures

---

## PHASE 1: VÉRIFICATION FIREBASE (15 min)

### 1.1 Firestore Activée?
```bash
1. Aller à: Firebase Console → Votre projet
2. Cliquer: Firestore Database
3. Vérifier: Status "En production" ou "En mode test"
   ✅ SI OUI → Continue
   ❌ SI NON → Créer une base (mode test pour dev)
```

### 1.2 Collection "users" Existe?
```bash
1. Dans Firestore Database
2. Vérifier: Collection "users" existe
   ✅ SI OUI → Continue
   ❌ SI NON → Créer une (cliquer "Create collection")
```

### 1.3 Document Utilisateur Test
```bash
1. Aller à collection "users"
2. Créer un document avec ID: test-user-123
3. Ajouter champs:
   - email: "test@example.com"
   - firstName: "Test"
   - lastName: "User"
```

### 1.4 Télécharger les Clés Firebase
```bash
1. Firebase Console → Settings ⚙️
2. Service Accounts
3. Cliquer: "Generate new private key"
4. Sauvegarder le JSON: serviceAccountKey.json
   (À mettre dans backend/config/)
```

---

## PHASE 2: CONFIGURER LES VARIABLES D'ENVIRONNEMENT (10 min)

### 2.1 Backend (.env ou env vars)
```bash
# FIREBASE
FIREBASE_PROJECT_ID=votre-projet-id
FIREBASE_PRIVATE_KEY=contenu-du-json
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@votre-projet.iam.gserviceaccount.com

# STRIPE
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_MONTHLY_PRICE=price_xxxxx
STRIPE_YEARLY_PRICE=price_xxxxx

# SERVER
PORT=3000
NODE_ENV=development
```

### 2.2 Frontend (constants/stripeConfig.ts)
```typescript
export const STRIPE_CONFIG = {
  API_URL: 'http://localhost:3000',  // URL backend
  PRICES: {
    monthly: 'price_xxxxx',  // À récupérer de Stripe Dashboard
    yearly: 'price_xxxxx',
  },
  CURRENCY: '€',
};
```

### 2.3 Vérifier Que Les Clés Sont Correctes
```bash
# Vérifier les clés Stripe
1. Aller à: Stripe Dashboard → Developers → API keys
2. Copier:
   - "Secret key" (commence par sk_test_ ou sk_live_)
   - "Webhook signing secret" (commence par whsec_)
```

---

## PHASE 3: INITIALISER FIREBASE ADMIN (15 min)

### 3.1 Créer le fichier de Configuration Backend
```bash
Fichier: backend/firebase-admin.ts (ou .js)

Contenu:
```typescript
import * as admin from 'firebase-admin';

// Initialiser Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const db = admin.firestore();
export default admin;
```

### 3.2 Mettre à Jour le Webhook
```typescript
// Dans: backend/stripe-webhook.ts

// Ajouter en haut:
import { db } from './firebase-admin';

// ✅ Les webhooks utiliseront maintenant Firebase Admin
```

### 3.3 Installer les Dépendances
```bash
cd backend
npm install firebase-admin stripe express cors dotenv
```

---

## PHASE 4: CONFIGURER LES WEBHOOKS STRIPE (20 min)

### 4.1 Démarrer le Serveur Backend
```bash
cd backend
npm start
# Devrait afficher: 🚀 Server running on http://0.0.0.0:3000
```

### 4.2 Configurer le Tunnel Local (si dev local)
```bash
# Option 1: Stripe CLI (RECOMMANDÉ)
npm install -g stripe

# Puis:
stripe listen --forward-to http://localhost:3000/webhook/stripe

# Copier le webhook signing secret affiché
```

### 4.3 Ajouter le Webhook à Stripe Dashboard
```bash
1. Stripe Dashboard → Developers → Webhooks
2. Cliquer: "Add endpoint"
3. Endpoint URL: 
   - DEV: http://localhost:3000/webhook/stripe (avec Stripe CLI)
   - PROD: https://votre-api.com/webhook/stripe
4. Sélectionner les événements:
   ✅ checkout.session.completed
   ✅ customer.subscription.created
   ✅ customer.subscription.updated
   ✅ customer.subscription.deleted
   ✅ invoice.payment_failed
   ✅ invoice.paid
5. Cliquer: "Add endpoint"
6. Copier le "Signing secret" → STRIPE_WEBHOOK_SECRET
```

---

## PHASE 5: VÉRIFIER QUE C'EST CONNECTÉ (15 min)

### 5.1 Test 1: API Répond
```bash
# Terminal 1 (backend running)

# Terminal 2:
curl http://localhost:3000/health

# Résultat attendu:
# {"ok":true}
```

### 5.2 Test 2: Firebase Connecté
```bash
# Ajouter une route test dans stripe-api.ts:

app.get('/test-firebase', async (req, res) => {
  try {
    const users = await db.collection('users').limit(1).get();
    res.json({ connected: true, userCount: users.size });
  } catch (error) {
    res.json({ connected: false, error: error.message });
  }
});

# Tester:
curl http://localhost:3000/test-firebase

# Résultat: {"connected":true,"userCount":1}
```

### 5.3 Test 3: Webhooks Reçus
```bash
# Avec Stripe CLI running:

stripe trigger customer.subscription.created

# Devrait afficher dans les logs du backend:
# ✅ Event received: customer.subscription.created
```

---

## PHASE 6: TESTER AVEC PAIEMENT RÉEL (30 min)

### 6.1 Lancer l'App Mobile/Web
```bash
# Terminal (app running)
npm start
# ou
expo start
```

### 6.2 Naviguer vers l'Écran d'Abonnement
```
1. Ouvrir l'app
2. Aller à: Profil ou Abonnement
3. Voir: <SubscriptionDisplay />
4. Cliquer: "Souscrire"
```

### 6.3 Passer par Stripe Checkout
```
1. S'ouvre dans le navigateur/webview
2. Email: test@example.com
3. Carte: 4242 4242 4242 4242
4. Expiration: 12/26
5. CVC: 242
6. Cliquer: "Subscribe"
```

### 6.4 Vérifier Firestore Mis à Jour
```bash
# Console Firebase:
1. Aller à: Firestore Database
2. Collection: users
3. Document: test-user-123
4. Vérifier les nouveaux champs:
   ✅ stripeCustomerId
   ✅ subscriptionId
   ✅ subscriptionStatus (doit être "trialing" ou "active")
   ✅ currentPeriodEnd (doit avoir une date)
```

### 6.5 Vérifier que le Composant Affiche
```
App affiche:
✅ "Abonnement actif" ou "Période d'essai"
✅ Date d'expiration
✅ Nombre de jours
✅ Bouton "Gérer"
```

---

## PHASE 7: SÉCURISER LES RÈGLES FIRESTORE (10 min)

### 7.1 Remplacer les Règles
```
1. Firebase Console → Firestore → Rules
2. Remplacer le contenu par:
```

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Chaque utilisateur peut lire/écrire ses propres données
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId;
    }
    
    // Firebase Admin SDK (webhooks) peut écrire
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId || 
                           request.auth == null;
    }
  }
}
```

```
3. Cliquer: "Publish"
```

---

## PHASE 8: VÉRIFIER QUE C'EST VRAIMENT FONCTIONNEL (15 min)

### Checklist Final
- [ ] Firebase Firestore connecté
- [ ] Webhooks Stripe configurés
- [ ] Backend démarre sans erreurs
- [ ] API répond (GET /health)
- [ ] Firebase Admin connecté (GET /test-firebase)
- [ ] Paiement Stripe fonctionne
- [ ] Firestore mis à jour après paiement
- [ ] Composant affiche le statut
- [ ] Boutons fonctionnent

### Si Tout Marche ✅
```
Vous avez un système d'abonnement COMPLET et FONCTIONNEL!
Prochaine étape: Intégrer dans les autres écrans
```

### Si Quelque Chose Ne Marche ❌
```
Consulter: DEPLOYMENT_GUIDE.md → Troubleshooting
```

---

## PHASE 9: DÉPLOYER EN PRODUCTION (1h)

### 9.1 Préparer le Backend
```bash
# 1. Créer compte Railway.app ou Heroku
# 2. Pousser le code

# Railway:
railway init
railway link
railway up

# Heroku:
heroku create
git push heroku main
```

### 9.2 Configurer Variables Prod
```bash
# Sur la plateforme (Railway/Heroku):

STRIPE_SECRET_KEY=sk_live_xxxxx (clé LIVE!)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx (webhook LIVE)
FIREBASE_PROJECT_ID=votre-id
FIREBASE_PRIVATE_KEY=clé-privée
FIREBASE_CLIENT_EMAIL=email
```

### 9.3 Ajouter Webhook Prod à Stripe
```
1. Stripe Dashboard → Webhooks
2. Ajouter nouvel endpoint:
   https://votre-app-prod.herokuapp.com/webhook/stripe
3. Copier le signing secret
4. Ajouter à variables d'env: STRIPE_WEBHOOK_SECRET
```

### 9.4 Mettre à Jour Frontend
```typescript
// Dans constants/stripeConfig.ts:

export const STRIPE_CONFIG = {
  API_URL: 'https://votre-app-prod.herokuapp.com',  // URL PROD
  PRICES: {
    monthly: 'price_xxxxx',
    yearly: 'price_xxxxx',
  },
};
```

---

## 🚀 VOUS ÊTES PRÊT!

Suivez ces 9 phases dans l'ordre et le système sera **100% fonctionnel**.

### Temps par phase:
1. Vérification Firebase: 15 min ✅
2. Variables d'env: 10 min ✅
3. Firebase Admin: 15 min ✅
4. Webhooks Stripe: 20 min ✅
5. Vérifier connexion: 15 min ✅
6. Test avec paiement: 30 min ✅
7. Sécuriser Firestore: 10 min ✅
8. Checklist final: 15 min ✅
9. Déployer (optionnel): 1h ⏳

**Total: 2-3 heures pour un système complet et fonctionnel**

---

## 📞 BESOIN D'AIDE?

Si vous êtes bloqué à une phase:
1. Lire le DEPLOYMENT_GUIDE.md
2. Vérifier les logs (console, backend, Stripe)
3. Consulter le troubleshooting guide

---

**Commencez par la PHASE 1 maintenant! 🚀**
