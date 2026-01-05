# 🔍 Guide de Debug - Deep Linking Stripe avec Expo Go

## Le Problème Résolu

Dans **Expo Go**, les deep links personnalisés comme `myapp://` ne fonctionnent pas. L'application utilise maintenant le schéma `exp://` qui est compatible avec Expo Go.

## 📱 Comment Tester sur iPhone avec Expo Go

### 1. Démarrer le Backend Stripe
```bash
cd backend
npm run dev
```

### 2. Lancer l'App Expo
```bash
npx expo start
```

### 3. Scanner le QR Code avec Expo Go sur iPhone

### 4. Tester l'Abonnement

1. **Aller dans l'app** → Page Subscription
2. **Cliquer sur "S'abonner"**
3. **Vous serez redirigé vers Stripe** (navigateur Safari)
4. **Compléter le paiement** avec carte de test: `4242 4242 4242 4242`
5. **Après paiement**, regardez les logs dans votre terminal

### 5. Vérifier les Logs

Dans le terminal où tourne Expo, vous devriez voir:

```
🔵 Expo Go détecté - Configuration deep link:
   - Host URI: 192.168.x.x:8081
   - Host: 192.168.x.x
   
🔵 useStripeDeepLinks: Hook initialisé

🔵 Deep link received: exp://192.168.x.x:8081/--/subscription?success=true&session_id=cs_xxx

🔵 URL Analysis: {
  isPaymentSuccess: true,
  isPaymentCancelled: false,
  isSettings: false,
  url: "exp://..."
}

✅ Payment success détecté! Session ID: cs_xxx
```

## 🔄 Que se passe-t-il après le paiement ?

### Scénario Normal (Expo Go)

1. ✅ **Stripe redirige** vers `exp://votre-ip:8081/--/subscription?success=true&session_id=xxx`
2. ✅ **Le navigateur demande** "Ouvrir dans Expo Go?"
3. ✅ **Vous confirmez** → L'app Expo Go s'ouvre
4. ✅ **L'app détecte** le deep link avec `success=true`
5. ✅ **Affiche** l'alerte "🎉 Bienvenue Premium !"
6. ✅ **Redirige** vers la page d'accueil appropriée

### Pour une App Standalone (Build)

Si vous buildez l'app avec EAS Build ou Xcode:
- Utilisera le schéma `myapp://payment-success`
- Redirection directe sans passer par le navigateur

## 🐛 Problèmes Courants

### Problème 1: Le navigateur ne propose pas d'ouvrir Expo Go

**Solution**: 
- Vérifiez que l'URL de redirection dans Stripe contient bien votre IP locale
- Regardez les logs du backend pour voir l'URL générée
- Fermez Safari et réessayez

### Problème 2: L'app s'ouvre mais rien ne se passe

**Vérifiez dans les logs**:
```
🔵 Deep link received: ...
```

Si vous voyez ce log → le deep link est détecté ✅

Si ce log n'apparaît pas → le hook n'est pas appelé ❌

**Solution**:
- Vérifiez que `useStripeDeepLinks()` est bien appelé dans `_layout.tsx`
- Rechargez l'app (secouer l'iPhone → Reload)

### Problème 3: "Cannot connect to backend"

L'iPhone ne peut pas accéder au backend sur votre PC.

**Solution**:
1. Vérifiez que le backend tourne: `http://localhost:3000/health`
2. Sur votre iPhone, ouvrez Safari: `http://VOTRE-IP:3000/health`
3. Si ça ne marche pas:
   - Désactivez le pare-feu Windows temporairement
   - Ou utilisez ngrok: `ngrok http 3000`
   - Puis mettez à jour `STRIPE_CONFIG.API_URL` avec l'URL ngrok

## 📊 Logs Utiles

### Backend (Node.js)
```bash
# Dans le terminal backend, vous verrez:
POST /api/create-checkout-session
Success URL: exp://192.168.x.x:8081/--/subscription?success=true&session_id={CHECKOUT_SESSION_ID}
Cancel URL: exp://192.168.x.x:8081/--/subscription?cancelled=true
```

### App (Expo)
```bash
# Dans le terminal Expo:
🔵 Expo Go détecté - Configuration deep link:
🔵 Deep link received: exp://...
✅ Payment success détecté!
```

## ✅ Checklist de Vérification

- [ ] Backend tourne sur port 3000
- [ ] App Expo ouverte via QR Code sur iPhone
- [ ] Les logs montrent "Expo Go détecté"
- [ ] Après paiement, Safari propose d'ouvrir dans Expo Go
- [ ] Les logs montrent "Deep link received"
- [ ] L'alerte de succès s'affiche
- [ ] Redirection vers la page d'accueil

## 🚀 Pour la Production

Pour une app publiée sur l'App Store:

1. **Build avec EAS**:
```bash
eas build --platform ios
```

2. L'app utilisera automatiquement `myapp://payment-success` au lieu de `exp://`

3. La redirection sera instantanée sans passer par le navigateur

## 🆘 Besoin d'Aide?

Si rien ne fonctionne:

1. **Copiez tous les logs** du terminal Expo
2. **Copiez les logs** du terminal Backend
3. **Prenez une capture d'écran** de ce qui se passe sur l'iPhone
4. Partagez ces informations pour un diagnostic précis
