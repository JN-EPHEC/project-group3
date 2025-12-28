# 🔧 TROUBLESHOOTING - Firebase + Stripe

## 🚨 Problèmes Courants et Solutions

---

## PROBLÈME 1: Firebase Admin Ne Se Connecte Pas

### Symptôme
```
Error: Failed to initialize Firebase Admin SDK
Error: Cannot find serviceAccountKey.json
```

### Solution
```bash
1. Aller à: Firebase Console → Settings ⚙️
2. Service Accounts tab
3. Click "Generate new private key"
4. Sauvegarder en: backend/serviceAccountKey.json
5. Vérifier permissions fichier:
   chmod 600 backend/serviceAccountKey.json
6. Relancer le serveur
```

---

## PROBLÈME 2: Firestore ne Se Met Pas à Jour Après Paiement

### Symptôme
```
Utilisateur paye mais Firestore reste vide
subscriptionStatus = null
```

### Solution
```bash
1️⃣ Vérifier que le webhook est reçu:
   - Terminal backend doit afficher: ✅ Event received: customer.subscription.created
   - SI NON → Le webhook n'est pas configuré correctement

2️⃣ Vérifier le Webhook Secret:
   - Ouvrir: Stripe Dashboard → Webhooks
   - Vérifier: "Signing secret" correct dans .env
   - ❌ SI DIFFÉRENT → Copier le bon

3️⃣ Vérifier les Logs Firebase:
   - Firebase Console → Functions → Logs
   - Voir s'il y a des erreurs lors de l'écriture

4️⃣ Vérifier les Règles de Sécurité:
   - Firebase Console → Firestore → Rules
   - Vérifier que l'écriture est autorisée:
   
   allow write: if request.auth == null ||
                   request.auth.uid == userId;

5️⃣ Vérifier qu'userId est dans les métadonnées:
   - Stripe Dashboard → Customers
   - Cliquer sur un client
   - Vérifier: Metadata contient userId
```

---

## PROBLÈME 3: Le Composant Affiche "Chargement..." Indéfiniment

### Symptôme
```
SubscriptionDisplay affiche "Chargement..." sans jamais finir
```

### Solution
```bash
1️⃣ Vérifier les imports:
   - Vérifier subscriptionSync.ts existe
   - Vérifier firebase.js a les 3 nouvelles fonctions

2️⃣ Vérifier les console logs:
   - Ouvrir DevTools (F12)
   - Voir s'il y a des erreurs
   - Erreur type: "getUserSubscriptionInfo is not defined"

3️⃣ Vérifier que getUserSubscriptionInfo() fonctionne:
   - Ouvrir console navigateur
   - Taper: await getUserSubscriptionInfo('test-user-123')
   - Voir le résultat

4️⃣ Vérifier que Firestore répond:
   - Aller à Firestore Database
   - Vérifier que la collection users existe
```

---

## PROBLÈME 4: Erreur CORS (Requête API Bloquée)

### Symptôme
```
Error: CORS policy: No 'Access-Control-Allow-Origin'
Cannot call API from app
```

### Solution
```bash
1️⃣ Vérifier CORS dans stripe-api.ts:
   
   app.use(cors({
     origin: (origin, callback) => {
       if (!origin) return callback(null, true);
       
       const allowedOrigins = [
         'http://localhost:8081',
         'http://localhost:3000',
         'http://127.0.0.1:8081',
       ];
       
       if (allowedOrigins.includes(origin)) {
         return callback(null, true);
       }
       
       console.warn('Blocked CORS origin:', origin);
       return callback(null, false);
     },
     methods: ['GET', 'POST', 'OPTIONS'],
     allowedHeaders: ['Content-Type', 'Authorization'],
   }));

2️⃣ Mettre à jour les origins autorisées:
   - Ajouter votre URL locale (smartphone, 192.168.x.x)
   - Pour trouver: npm run start → voir l'URL affichée

3️⃣ Relancer le serveur backend:
   npm start
```

---

## PROBLÈME 5: Paiement Réussit Mais Composant Ne Change Pas

### Symptôme
```
Après paiement:
- Stripe dit: "Success"
- Firestore mis à jour ✅
- Mais composant affiche toujours "Pas d'abonnement"
```

### Solution
```bash
1️⃣ Forcer la synchronisation:
   - Importer: import { syncUserSubscriptionFromStripe } from '@/constants/subscriptionSync';
   - Ajouter: await syncUserSubscriptionFromStripe();
   - Après le paiement

2️⃣ Rafraîchir le composant:
   - Ajouter un bouton "Actualiser"
   - Qui appelle: await refreshSubscriptionStatus();

3️⃣ Vérifier que hasActiveSubscription() marche:
   - Ouvrir console
   - Taper: await hasActiveSubscription()
   - Doit retourner: true (si abonnement actif)

4️⃣ Vérifier le délai:
   - Les webhooks peuvent prendre 5-10 secondes
   - Attendre avant de vérifier
```

---

## PROBLÈME 6: "subscriptionStatus is undefined" dans Firestore

### Symptôme
```
Firestore affiche:
{
  stripeCustomerId: "cus_...",
  subscriptionStatus: undefined
}
```

### Solution
```bash
1️⃣ Vérifier le webhook handler:
   - Ouvrir: backend/stripe-webhook.ts
   - Vérifier que handleSubscriptionCreated() écrit subscriptionStatus
   - Code doit être:
   
   await db.collection('users').doc(userId).update({
     subscriptionStatus: subscription.status,
     // ... autres champs
   });

2️⃣ Vérifier la version du code:
   - Vérifier que vous avez la dernière version
   - Voir la date du fichier

3️⃣ Redémarrer les webhooks:
   - Arrêter: Ctrl+C
   - Relancer: npm start
   - Simuler un paiement test
```

---

## PROBLÈME 7: Erreur "Cannot read property 'metadata' of undefined"

### Symptôme
```
Error in handleSubscriptionCreated:
Cannot read property 'metadata' of undefined
```

### Solution
```bash
1️⃣ Vérifier que userId est en métadonnées:
   - Lors de la création de la session checkout:
   
   const session = await stripe.checkout.sessions.create({
     // ...
     metadata: {
       userId: userId,  // ✅ Important!
     },
   });

2️⃣ Vérifier que l'abonnement a les métadonnées:
   - Dans handleCheckoutSessionCompleted():
   
   // Passer userId à l'abonnement
   subscription_data: {
     metadata: {
       userId: userId,  // ✅ Doit être là!
     },
   },

3️⃣ Checker le code dans stripe-api.ts:
   - Vérifier metadata est passé partout
```

---

## PROBLÈME 8: Webhook ne Reçoit Pas les Événements

### Symptôme
```
Stripe Dashboard → Webhooks → 0 Events
Pas de requêtes reçues
```

### Solution
```bash
1️⃣ Vérifier que le backend tourne:
   Backend doit afficher:
   🚀 Server running on http://0.0.0.0:3000

2️⃣ Vérifier l'URL du webhook:
   - Stripe Dashboard → Webhooks
   - Vérifier URL existe
   - Test: Stripe Dashboard → Click endpoint → Send test event
   - Doit voir réponse 200 OK

3️⃣ Si utilise Stripe CLI:
   stripe listen --forward-to http://localhost:3000/webhook/stripe
   
   Doit afficher:
   Ready! Your webhook signing secret is: whsec_xxxxx

4️⃣ Vérifier le endpoint:
   - URL doit être exactement: /webhook/stripe
   - Pas /webhook ou /stripe-webhook
   
   Code dans stripe-api.ts:
   app.post('/webhook/stripe', ...)

5️⃣ Tester avec curl:
   curl -X POST http://localhost:3000/webhook/stripe \
     -H "Content-Type: application/json" \
     -d '{"type":"customer.subscription.created"}'
   
   Doit retourner: {"received":true}
```

---

## PROBLÈME 9: Clé Stripe Invalide ou Expirée

### Symptôme
```
Error: Invalid API Key provided
401 Unauthorized
```

### Solution
```bash
1️⃣ Vérifier que c'est une clé TEST:
   - Doit commencer par: sk_test_
   - ❌ PAS sk_live_ en développement

2️⃣ Vérifier dans .env:
   STRIPE_SECRET_KEY=sk_test_xxxxx
   
   Pas d'espaces avant/après

3️⃣ Copier la clé correcte:
   - Stripe Dashboard → Developers → API Keys
   - Tab: Secret Keys
   - Copier la clé "Restricted Key" ou "Secret Key"

4️⃣ Relancer le serveur:
   npm start

5️⃣ Tester:
   curl -H "Authorization: Bearer sk_test_xxxxx" \
     https://api.stripe.com/v1/customers
   
   Doit retourner des données (pas d'erreur 401)
```

---

## PROBLÈME 10: Permission Denied - Firebase

### Symptôme
```
Error: Permission denied: Missing required permissions
Firestore write failed
```

### Solution
```bash
1️⃣ Vérifier les règles Firestore:
   - Firebase Console → Firestore → Rules
   - Vérifier l'écriture est autorisée:
   
   match /users/{userId} {
     allow write: if request.auth.uid == userId ||
                     request.auth == null;
   }

2️⃣ Si utilise Service Account (webhook):
   - Ajouter règle:
   
   match /users/{userId} {
     allow read, write: if request.auth == null ||
                           request.auth.uid == userId;
   }

3️⃣ Recharger les règles:
   - Click "Publish"
   - Attendre ~30 secondes

4️⃣ Tester à nouveau:
   - Faire un paiement test
   - Vérifier que Firestore se met à jour
```

---

## 🆘 SI RIEN NE MARCHE

### Checklist de Debug Complète

```bash
# 1. Vérifier le backend démarre
npm start
# Doit afficher: 🚀 Server running

# 2. Vérifier que ça répond
curl http://localhost:3000/health
# Doit retourner: {"ok":true}

# 3. Vérifier Firebase connecté
curl http://localhost:3000/test-firebase
# Doit retourner: {"connected":true}

# 4. Vérifier les logs
# Ouvrir: Firebase Console → Functions → Logs
# Chercher les erreurs

# 5. Vérifier Stripe Dashboard
# Aller à: Developers → Webhooks
# Voir les événements reçus/envoyés

# 6. Vérifier les variables d'env
# .env doit avoir:
# - STRIPE_SECRET_KEY
# - STRIPE_WEBHOOK_SECRET
# - FIREBASE_PROJECT_ID
# - FIREBASE_PRIVATE_KEY
# - FIREBASE_CLIENT_EMAIL
```

### Réinitialisation Complète

```bash
# 1. Arrêter le serveur
Ctrl+C

# 2. Supprimer node_modules et réinstaller
rm -rf backend/node_modules
npm install

# 3. Vérifier .env existe et est complet
cat backend/.env

# 4. Vérifier serviceAccountKey.json existe
ls -la backend/serviceAccountKey.json

# 5. Relancer
npm start
```

---

## 📞 BESOIN D'AIDE?

Si le problème persiste:
1. Note le message d'erreur exact
2. Copie les logs du backend (Ctrl+A, Ctrl+C)
3. Ouvre Firebase Console → Logs
4. Consulte le DEPLOYMENT_GUIDE.md

---

**Vous allez trouver la solution! 💪**
