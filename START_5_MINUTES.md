# ⚡ DÉMARRAGE EN 5 MINUTES

## 📋 Checklist Rapide

```
[ ] 1. Télécharger serviceAccountKey.json (2 min)
[ ] 2. Configurer automatiquement (30 sec)
[ ] 3. Démarrer le backend (10 sec)
[ ] 4. Tester (30 sec)
```

---

## 🔥 ÉTAPE 1: serviceAccountKey.json (2 min)

### Ouvrir
```
https://console.firebase.google.com
```

### Cliquer
1. Projet **wekid-test**
2. ⚙️ → **Paramètres du projet**
3. Onglet **Comptes de service**
4. **Générer une nouvelle clé privée**
5. **Télécharger**

### Déplacer
```bash
# Le fichier téléchargé s'appelle: wekid-test-xxxxx-firebase-adminsdk-xxxxx.json

# Windows: Copier depuis Téléchargements vers:
E:\Github all repositories\project-group3\backend\serviceAccountKey.json

# Ou en PowerShell:
Move-Item "$env:USERPROFILE\Downloads\wekid-test-*.json" "E:\Github all repositories\project-group3\backend\serviceAccountKey.json"
```

✅ **Fichier placé!**

---

## 🔧 ÉTAPE 2: Configuration (30 sec)

```bash
cd "E:\Github all repositories\project-group3\backend"
node setup-backend.js
```

**Résultat attendu:**
```
✅ serviceAccountKey.json existe
✅ .env mis à jour
✅ Configuration complète!

🚀 Prochaines étapes:
   1. npm install
   2. npm run dev
```

✅ **Configuré!**

---

## 🚀 ÉTAPE 3: Démarrer (10 sec)

```bash
npm run dev
```

**Résultat attendu:**
```
✅ Firebase Admin initialisé avec succès
📦 Project ID: wekid-test
🚀 Firebase Admin SDK prêt à l'emploi
🚀 Server running on http://0.0.0.0:3000
```

✅ **Backend lancé!**

---

## ✅ ÉTAPE 4: Tester (30 sec)

**Ouvrir un NOUVEAU terminal:**

```bash
# Test 1: Health
curl http://localhost:3000/health

# Résultat: {"ok":true}
```

```bash
# Test 2: Firebase
curl http://localhost:3000/test-firebase

# Résultat: 
# {
#   "connected": true,
#   "collections": ["users"],
#   "projectId": "wekid-test"
# }
```

✅ **Tout fonctionne!**

---

## 🎉 C'EST PRÊT!

Votre backend Stripe + Firebase est opérationnel!

### Endpoints disponibles:
- ✅ `GET /health` - Health check
- ✅ `GET /test-firebase` - Test Firebase
- ✅ `POST /api/create-checkout-session` - Créer paiement
- ✅ `GET /api/subscription-status/:userId` - Statut abonnement
- ✅ `POST /webhook/stripe` - Webhooks Stripe

---

## ⏭️ Prochaine Étape

### Configurer Stripe CLI (pour tester les webhooks)

```bash
# 1. Télécharger Stripe CLI
https://stripe.com/docs/stripe-cli

# 2. Se connecter
stripe login

# 3. Écouter les webhooks
stripe listen --forward-to http://localhost:3000/webhook/stripe

# 4. Copier le secret affiché:
# Your webhook signing secret is: whsec_xxxxx

# 5. Mettre à jour .env:
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# 6. Redémarrer le backend
npm run dev
```

### Tester un paiement
```bash
stripe trigger customer.subscription.created
```

**Résultat dans le terminal backend:**
```
✅ Event received: customer.subscription.created
✅ Webhook processed successfully
```

---

## 🆘 Problème?

### Backend ne démarre pas
```bash
# Vérifier que serviceAccountKey.json existe
ls backend/serviceAccountKey.json

# Si non: Retourner à ÉTAPE 1
```

### "Cannot find serviceAccountKey.json"
```bash
# Le fichier doit être exactement:
backend/serviceAccountKey.json

# Pas dans un sous-dossier!
```

### Erreur Firebase
```bash
# Relancer la config
node setup-backend.js

# Vérifier le .env
cat backend/.env | grep FIREBASE_PROJECT_ID
# Doit afficher: FIREBASE_PROJECT_ID=wekid-test
```

### Autre problème
**Voir:** `SETUP_AND_TROUBLESHOOTING.md`
10 problèmes courants avec solutions

---

## 📚 Documentation Complète

- **READY_TO_START.md** - Vue d'ensemble
- **SETUP_AND_TROUBLESHOOTING.md** - Setup + 10 solutions
- **backend/BACKEND_OPTIMIZED.md** - Détails backend
- **ACTION_PLAN.md** - Plan complet 9 phases

---

**TEMPS TOTAL: 5 MINUTES ⏱️**

**GO! 🚀**
