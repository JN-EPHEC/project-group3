# 🧪 Test Rapide - Vérification Deep Linking

## Étape 1: Vérifier la Configuration

### Dans le terminal Expo (après démarrage):

Recherchez ces lignes dans les logs:
```
🔵 useStripeDeepLinks: Hook initialisé
```

✅ Si vous voyez ça → Le hook est bien activé

❌ Si vous ne voyez pas → Vérifiez que `_layout.tsx` appelle bien `useStripeDeepLinks()`

## Étape 2: Simuler un Deep Link (Test manuel)

### Sur iOS (Expo Go):

1. Ouvrez l'app Expo Go sur votre iPhone
2. Secouez l'iPhone pour ouvrir le menu de développement
3. Appuyez sur "Open URL"
4. Entrez cette URL (remplacez `VOTRE-IP` par l'IP affichée dans Expo):
```
exp://VOTRE-IP:8081/--/subscription?success=true&session_id=test_123
```

5. Appuyez sur "Open"

### Résultat Attendu:

- ✅ L'app affiche une alerte "🎉 Bienvenue Premium !"
- ✅ Vous êtes redirigé vers la page d'accueil
- ✅ Dans les logs, vous voyez:
```
🔵 Deep link received: exp://...
✅ Payment success détecté! Session ID: test_123
```

## Étape 3: Test Complet avec Stripe

1. **Cliquez sur "S'abonner"** dans l'app
2. **Vérifiez les logs backend**:
```bash
🔵 URLs de redirection Stripe:
   ✅ Success URL: exp://192.168.x.x:8081/--/subscription?success=true&session_id={CHECKOUT_SESSION_ID}
   ❌ Cancel URL: exp://192.168.x.x:8081/--/subscription?cancelled=true
```

3. **Complétez le paiement** dans Stripe avec:
   - Carte: `4242 4242 4242 4242`
   - Date: n'importe quelle date future
   - CVC: n'importe quel 3 chiffres
   - ZIP: n'importe quel code postal

4. **Après "Payer"**, Safari devrait afficher:
   - "Ouvrir cette page dans Expo Go?"
   - Cliquez "Ouvrir"

5. **L'app Expo Go s'ouvre** et affiche le message de succès

## ❗ Dépannage Rapide

### Problème: Safari ne propose pas d'ouvrir Expo Go

**Cause**: L'URL de redirection n'utilise pas le bon schéma

**Solution**:
1. Vérifiez les logs backend (étape 2 ci-dessus)
2. L'URL doit commencer par `exp://` (pas `myapp://` dans Expo Go)
3. Si ce n'est pas le cas, vérifiez que Constants détecte bien Expo Go:

Ajoutez ce log temporaire dans `stripeService.ts`:
```typescript
console.log('🔍 Constants check:', {
  appOwnership: (Constants as any)?.appOwnership,
  isExpoGo: (Constants as any)?.appOwnership === 'expo'
});
```

### Problème: L'app s'ouvre mais ne redirige pas

**Cause**: Le hook ne détecte pas le deep link

**Solution**:
1. Vérifiez que `useStripeDeepLinks()` est appelé dans `_layout.tsx`
2. Rechargez complètement l'app (fermer et rouvrir Expo Go)
3. Testez avec l'URL manuelle (Étape 2)

### Problème: Erreur "Cannot connect to backend"

**Cause**: L'iPhone ne peut pas accéder au PC

**Solution**:
```bash
# Option 1: Utiliser ngrok
ngrok http 3000

# Puis dans constants/stripeConfig.ts:
export const STRIPE_CONFIG = {
  API_URL: 'https://votre-url.ngrok-free.app',
  // ...
}
```

## 📱 Test Final Checklist

- [ ] Backend démarre sans erreur
- [ ] Expo démarre et affiche l'IP (ex: 192.168.1.50:8081)
- [ ] QR Code scanné → App ouverte sur iPhone
- [ ] Logs montrent "🔵 useStripeDeepLinks: Hook initialisé"
- [ ] Logs montrent "🔵 Expo Go détecté"
- [ ] Test manuel avec "Open URL" fonctionne
- [ ] S'abonner → Payer → Safari propose d'ouvrir Expo Go
- [ ] App affiche "🎉 Bienvenue Premium !"
- [ ] Redirection vers page d'accueil fonctionne

## 🎯 Si Tout Fonctionne

Vous devriez voir ce flux complet:

1. App → Bouton "S'abonner"
2. Backend logs: `🔵 URLs de redirection Stripe: ✅ Success URL: exp://...`
3. Safari → Page Stripe → Formulaire de paiement
4. Paiement réussi → Safari demande d'ouvrir Expo Go
5. App logs: `🔵 Deep link received: exp://...`
6. App logs: `✅ Payment success détecté! Session ID: cs_xxx`
7. Alerte: "🎉 Bienvenue Premium !"
8. Navigation vers page d'accueil

✨ **C'est bon!** Le deep linking fonctionne correctement.
