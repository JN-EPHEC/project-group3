# ⚡ INTÉGRATION RAPIDE - 30 MINUTES

## 📋 Sommaire Rapide

**Temps Total: ~30 minutes**
- [x] Phase 1: Firebase Setup (5 min)
- [x] Phase 2: Environnement (5 min)
- [x] Phase 3: Code Backend (10 min)
- [x] Phase 4: Webhooks (10 min)

---

## 🔥 PHASE 1: Firebase Setup (5 minutes)

### Étape 1.1 - Activer Firestore
```
1. Aller à: Firebase Console (https://console.firebase.google.com)
2. Cliquer sur votre projet
3. Menu gauche: "Firestore Database"
4. Cliquer: "Create Database"
5. Location: Europe (France)
6. Mode: "Start in test mode"
7. Cliquer: "Enable"
```

### Étape 1.2 - Télécharger les Clés
```
1. Aller à: Settings ⚙️ (en haut à gauche)
2. Tab: "Service Accounts"
3. Cliquer: "Generate new private key"
4. Fichier "XXX-XXX-firebase-adminsdk.json" téléchargé
5. Renommer et placer:
   backend/serviceAccountKey.json
```

### Étape 1.3 - Copier le Project ID
```
1. Aller à: Settings ⚙️
2. Tab: "General"
3. Copier: "Project ID" (ex: "mon-app-123456")
4. Garder pour Phase 2
```

✅ **Firebase Prêt!**

---

## 🔐 PHASE 2: Environnement (5 minutes)

### Étape 2.1 - Créer backend/.env

Créer le fichier: `backend/.env`

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxx
STRIPE_MONTHLY_PRICE=price_xxxxxxxxxxx
STRIPE_YEARLY_PRICE=price_xxxxxxxxxxx

# Firebase
FIREBASE_PROJECT_ID=votre-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@votre-project-id.iam.gserviceaccount.com

# API
PORT=3000
NODE_ENV=development
```

### Étape 2.2 - Obtenir les Clés Stripe

```bash
1. Aller à: https://dashboard.stripe.com/apikeys
2. Copier: "Secret Key" (commence par sk_test_)
3. Mettre dans .env: STRIPE_SECRET_KEY=...

4. Aller à: https://dashboard.stripe.com/webhooks
5. Voir la clé "Signing secret" (whsec_)
6. Mettre dans .env: STRIPE_WEBHOOK_SECRET=...

7. Aller à: https://dashboard.stripe.com/products
8. Créer 2 produits ou copier les price IDs existants
9. Mettre: STRIPE_MONTHLY_PRICE=... et STRIPE_YEARLY_PRICE=...
```

### Étape 2.3 - Remplir Firebase dans .env

```bash
# Ouvrir: backend/serviceAccountKey.json
# Copier les valeurs:
# - private_key → FIREBASE_PRIVATE_KEY
# - project_id → FIREBASE_PROJECT_ID
# - client_email → FIREBASE_CLIENT_EMAIL

# Pour private_key, garder les sauts de ligne:
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq....\n-----END PRIVATE KEY-----\n"
```

✅ **.env Complété!**

---

## 💻 PHASE 3: Code Backend (10 minutes)

### Étape 3.1 - Créer Firebase Admin

Créer le fichier: `backend/firebase-admin.ts`

```typescript
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const serviceAccountPath = path.join(__dirname, './serviceAccountKey.json');

// Vérifier que le fichier existe
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ serviceAccountKey.json introuvable!');
  console.error('Chemin attendu:', serviceAccountPath);
  process.exit(1);
}

// Initialiser Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

export const db = admin.firestore();
export const auth = admin.auth();

console.log('✅ Firebase Admin initialisé');
```

### Étape 3.2 - Importer Firebase Admin dans stripe-webhook.ts

**Au début du fichier stripe-webhook.ts:**

```typescript
import { db } from './firebase-admin';
```

### Étape 3.3 - Vérifier le Code Webhook

**Dans stripe-webhook.ts, vérifier que handleCheckoutSessionCompleted():**

```typescript
export const handleCheckoutSessionCompleted = async (
  session: Stripe.Checkout.Session
) => {
  const userId = session.metadata?.userId;
  const stripeCustomerId = session.customer as string;

  if (!userId) {
    console.error('❌ userId manquant dans metadata');
    return;
  }

  // Créer l'utilisateur dans Firestore s'il n'existe pas
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    console.log(`📝 Créant nouvel utilisateur: ${userId}`);
    await userRef.set({
      uid: userId,
      createdAt: admin.firestore.Timestamp.now(),
    });
  }

  // Mettre à jour avec les infos Stripe
  await userRef.update({
    stripeCustomerId: stripeCustomerId,
    subscriptionUpdatedAt: admin.firestore.Timestamp.now(),
  });

  console.log(`✅ Utilisateur ${userId} lié à Stripe`);
};
```

### Étape 3.4 - Installer les Dépendances

```bash
cd backend
npm install firebase-admin
npm install
```

✅ **Backend Prêt!**

---

## 🔗 PHASE 4: Webhooks (10 minutes)

### Étape 4.1 - Démarrer le Backend

```bash
cd backend
npm start

# Doit afficher:
# ✅ Firebase Admin initialisé
# 🚀 Server running on http://0.0.0.0:3000
```

### Étape 4.2 - Configurer le Webhook (Option A: Stripe CLI)

**Pour tester localement:**

```bash
# 1. Télécharger Stripe CLI:
# https://stripe.com/docs/stripe-cli

# 2. Ouvrir un NOUVEAU terminal
stripe login
# Copier le code affichée dans le navigateur

# 3. Lancer le forwarding:
stripe listen --forward-to http://localhost:3000/webhook/stripe

# Affichera:
# Your webhook signing secret is: whsec_xxxxx
# Ready to accept events!

# 4. Copier le secret dans .env:
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### Étape 4.2 - Configurer le Webhook (Option B: Stripe Dashboard)

**Pour produire (à faire plus tard):**

```
1. Aller à: https://dashboard.stripe.com/webhooks
2. Cliquer: "+ Add endpoint"
3. URL: https://votre-domain.com/webhook/stripe
4. Événements à sélectionner:
   ✅ checkout.session.completed
   ✅ customer.subscription.created
   ✅ customer.subscription.updated
   ✅ customer.subscription.deleted
   ✅ invoice.payment_failed
   ✅ invoice.paid
5. Cliquer: "Add endpoint"
6. Copier "Signing secret"
7. Mettre dans .env: STRIPE_WEBHOOK_SECRET=...
```

### Étape 4.3 - Tester le Webhook

**Dans le terminal avec stripe listen actif:**

```bash
stripe trigger customer.subscription.created

# Doit afficher dans le terminal backend:
# ✅ Event received: customer.subscription.created
# ✅ Webhook processed successfully
```

✅ **Webhooks Fonctionnels!**

---

## ✅ VÉRIFICATION FINALE

### Test 1: API Fonctionne
```bash
curl http://localhost:3000/health
# Doit retourner: {"ok":true}
```

### Test 2: Firebase Connecté
```bash
curl http://localhost:3000/test-firebase
# Doit retourner: {"connected":true}
```

### Test 3: Firestore Accessible
```bash
1. Aller à: Firebase Console → Firestore
2. Doit voir la collection "users"
3. Si vide, c'est normal pour le moment
```

---

## 🚀 C'EST BON!

Vous avez maintenant:
- ✅ Firebase configuré
- ✅ Clés Stripe intégrées
- ✅ Backend opérationnel
- ✅ Webhooks prêts

**Prochaine étape:** DEPLOYMENT_GUIDE.md pour la mise en production

**Temps total:** ~30 minutes ⏱️

---

## 🆘 Si Ça Ne Marche Pas

Consulter: **FIREBASE_TROUBLESHOOTING.md**

Il y a 10 problèmes courants avec les solutions!
