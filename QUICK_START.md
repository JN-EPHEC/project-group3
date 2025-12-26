# 🎯 Guide de Démarrage Rapide Stripe

## ✅ Configuration Terminée !

Vos clés Stripe ont été configurées :
- ✅ Clé publique : `pk_test_51SUoM02OiYebg9QD...`
- ✅ Clé secrète : `sk_test_51SUoM02OiYebg9QD...`
- ✅ Price Mensuel : `price_1SiXfe2OiYebg9QDRWHm63We0` (7,99€)
- ✅ Price Annuel : `price_1SiXfe2OiYebg9QDfh8rWIcX1` (89,99€)

---

## 🚀 Lancement en 3 minutes

### 1️⃣ Installer et Lancer le Backend

```bash
# Aller dans le dossier backend
cd backend

# Installer les dépendances
npm install

# Lancer le serveur
npm run dev
```

Ou utilise le script :
```bash
# Windows
.\start.bat

# Mac/Linux
chmod +x start.sh
./start.sh
```

Le serveur démarre sur **http://localhost:3000** 🎉

---

### 2️⃣ Configurer le Webhook (Terminal séparé)

```bash
# Installer Stripe CLI (si pas déjà fait)
# Windows (avec Scoop)
scoop install stripe

# Mac
brew install stripe/stripe-cli/stripe

# Puis login
stripe login

# Forwarder les webhooks vers ton serveur local
stripe listen --forward-to localhost:3000/webhook/stripe
```

**Important** : Copie le `webhook secret` (whsec_...) qui s'affiche et mets-le dans :
- `.env` → `STRIPE_WEBHOOK_SECRET=whsec_...`
- `backend/.env` → `STRIPE_WEBHOOK_SECRET=whsec_...`

---

### 3️⃣ Lancer l'Application Mobile

```bash
# À la racine du projet
npx expo start
```

Scanne le QR code avec Expo Go (iOS) ou appuie sur `a` pour Android.

---

## 🧪 Tester le Paiement

1. **Lance l'app** et va sur l'écran d'abonnement
2. **Sélectionne un plan** (mensuel ou annuel)
3. **Clique sur "Commencer l'essai gratuit"**
4. Tu es redirigé vers **Stripe Checkout**

### Carte de Test Stripe

Utilise ces informations pour tester :

```
Numéro de carte : 4242 4242 4242 4242
Date d'expiration : 12/34 (n'importe quelle date future)
CVC : 123
Code postal : 12345
```

5. **Valide le paiement** → Tu es redirigé vers l'app avec le message de succès !

---

## 📊 Vérifier dans Stripe Dashboard

1. Va sur [Stripe Dashboard (Test Mode)](https://dashboard.stripe.com/test/customers)
2. Tu devrais voir :
   - ✅ Un nouveau **Client** avec ton email
   - ✅ Un **Abonnement** en statut **Trialing** (30 jours)
   - ✅ Pas de paiement immédiat (0€)
   - ✅ Premier débit prévu dans 30 jours

---

## 🎯 Architecture du Flow

```
┌─────────────┐
│   Mobile    │
│     App     │
└──────┬──────┘
       │ 1. createCheckoutSession()
       ▼
┌─────────────┐
│   Backend   │
│  (Node.js)  │
└──────┬──────┘
       │ 2. POST /api/create-checkout-session
       ▼
┌─────────────┐
│   Stripe    │
│     API     │
└──────┬──────┘
       │ 3. Return checkout URL
       ▼
┌─────────────┐
│   Stripe    │
│  Checkout   │  ← L'utilisateur paie ici
└──────┬──────┘
       │ 4. success_url: myapp://payment-success
       ▼
┌─────────────┐
│  Deep Link  │
│   Handler   │  ← Retour dans l'app
└──────┬──────┘
       │ 5. Webhook: checkout.session.completed
       ▼
┌─────────────┐
│  Firestore  │  ← Mise à jour du statut
└─────────────┘
```

---

## 🔍 Debugging

### Le serveur ne démarre pas ?

```bash
# Vérifier si le port 3000 est disponible
netstat -ano | findstr :3000

# Tuer le processus si nécessaire
taskkill /PID <PID> /F

# Ou changer le port dans backend/.env
PORT=3001
```

### Le webhook ne fonctionne pas ?

```bash
# Vérifier que Stripe CLI écoute
stripe listen --forward-to localhost:3000/webhook/stripe

# Tester manuellement un webhook
stripe trigger checkout.session.completed
```

### Deep link ne fonctionne pas ?

```bash
# Rebuild l'app
npx expo start -c

# Test manuel (iOS Simulator)
xcrun simctl openurl booted "myapp://payment-success?session_id=test"

# Test manuel (Android Emulator)
adb shell am start -W -a android.intent.action.VIEW -d "myapp://payment-success?session_id=test"
```

---

## 📝 Checklist de Test

- [ ] Backend démarre sur http://localhost:3000
- [ ] Stripe webhook écoute (stripe listen actif)
- [ ] App mobile lance sans erreur
- [ ] Écran d'abonnement s'affiche
- [ ] Clic sur "Commencer l'essai" ouvre Stripe Checkout
- [ ] Paiement avec carte test réussit
- [ ] Redirection vers l'app fonctionne
- [ ] Message de succès s'affiche
- [ ] Abonnement visible dans Stripe Dashboard
- [ ] Webhook reçu et traité

---

## 🎉 C'est Prêt !

Ton système d'abonnement Stripe est **100% fonctionnel** !

### Prochaines Étapes

1. **Personnalise l'UI** de l'écran d'abonnement
2. **Teste le Customer Portal** (gestion d'abonnement)
3. **Configure les emails** de Stripe (confirmation, reçus)
4. **Ajoute des analytics** (track les conversions)
5. **Prépare le déploiement** en production

### Passer en Production

Quand tu seras prêt :
1. Active le **Live Mode** dans Stripe
2. Récupère les **clés Live** (pk_live_... et sk_live_...)
3. Update les fichiers `.env`
4. Configure le **webhook Production**
5. Déploie le backend (Vercel, Railway, Firebase Functions)
6. Build et publie l'app

---

Besoin d'aide ? Tout est dans [STRIPE_SETUP_GUIDE.md](STRIPE_SETUP_GUIDE.md) 🚀
