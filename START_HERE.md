# 🚀 START HERE - Démarrage Rapide

## ⏱️ 5 Minutes pour Commencer

### Étape 1: Copier le Composant (1 min)
```bash
Fichier: components/SubscriptionDisplay.tsx
Action: Vérifier qu'il existe
```

### Étape 2: Importer dans votre Écran (1 min)
```tsx
import SubscriptionDisplay from '@/components/SubscriptionDisplay';

export default function MyScreen() {
  return <SubscriptionDisplay />;
}
```

### Étape 3: Ajouter les Actions (2 min)
```tsx
<SubscriptionDisplay
  onSubscriptionPress={async () => {
    await StripeService.createCheckoutSession(
      STRIPE_CONFIG.PRICES.monthly
    );
  }}
  onManagePress={async () => {
    const info = await getUserCurrentSubscriptionInfo();
    if (info.stripeCustomerId) {
      await StripeService.openCustomerPortal(
        info.stripeCustomerId
      );
    }
  }}
/>
```

### Étape 4: Tester (1 min)
```
1. Lancer l'app
2. Cliquer sur "Souscrire"
3. Utiliser la carte: 4242 4242 4242 4242
4. Vérifier que Firestore se met à jour
5. ✅ Ça marche!
```

---

## 📱 Code Complet Minimal

```tsx
// app/(tabs)/Profil.tsx

import { useAuth } from 'firebase/auth';
import { View } from 'react-native';
import SubscriptionDisplay from '@/components/SubscriptionDisplay';
import { getUserCurrentSubscriptionInfo } from '@/constants/subscriptionSync';
import { StripeService } from '@/constants/stripeService';
import { STRIPE_CONFIG } from '@/constants/stripeConfig';

export default function ProfilScreen() {
  const handleSubscribe = async () => {
    try {
      await StripeService.createCheckoutSession(
        STRIPE_CONFIG.PRICES.monthly
      );
    } catch (error) {
      alert('Erreur: ' + error.message);
    }
  };

  const handleManage = async () => {
    try {
      const info = await getUserCurrentSubscriptionInfo();
      if (info.stripeCustomerId) {
        await StripeService.openCustomerPortal(info.stripeCustomerId);
      }
    } catch (error) {
      alert('Erreur: ' + error.message);
    }
  };

  return (
    <View>
      <SubscriptionDisplay
        onSubscriptionPress={handleSubscribe}
        onManagePress={handleManage}
      />
    </View>
  );
}
```

---

## ✅ Vérifier que Tout Fonctionne

### 1. Les fichiers existent?
```bash
✅ constants/subscriptionSync.ts
✅ components/SubscriptionDisplay.tsx
```

### 2. Paiement fonctionne?
```
✅ Lancer: <SubscriptionDisplay />
✅ Cliquer: Souscrire
✅ Payer: Avec 4242 4242 4242 4242
✅ Vérifier: Firestore mis à jour
```

### 3. Affichage fonctionne?
```
✅ Voir: "Abonnement actif"
✅ Voir: Date d'expiration
✅ Voir: Jours restants
```

---

## 🔧 Configuration Nécessaire

### Vérifier que vous avez:
```bash
✅ STRIPE_SECRET_KEY (clé Stripe)
✅ STRIPE_WEBHOOK_SECRET (secret webhook)
✅ Firebase Firestore activé
✅ API Stripe running
```

### Ajouter à votre `.env`:
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE=price_...
STRIPE_YEARLY_PRICE=price_...
```

---

## 📚 Fichiers à Lire

### Pour aller plus loin (par ordre):
1. **SUBSCRIPTION_INTEGRATION_EXAMPLES.tsx** - 5 exemples complets
2. **SUBSCRIPTION_SYSTEM.md** - Tout savoir
3. **DEPLOYMENT_GUIDE.md** - Pour déployer
4. **SUBSCRIPTION_INDEX.md** - Pour naviguer

---

## 🆘 Problèmes Courants

### Le composant ne s'affiche pas
```
✅ Vérifier l'import est correct
✅ Vérifier le fichier existe
✅ Vérifier les console logs
```

### Firestore ne se met pas à jour
```
✅ Vérifier les webhooks Stripe
✅ Vérifier le secret webhook
✅ Vérifier les logs Firebase
```

### Paiement échoue
```
✅ Vérifier la clé Stripe
✅ Utiliser une carte de test
✅ Vérifier la URL API
```

---

## 🎯 Prochaines Étapes

### Si ça marche:
1. Intégrer dans plus d'écrans
2. Personnaliser le design
3. Ajouter la logique métier

### Si vous avez besoin:
1. Lire la documentation
2. Consulter les exemples
3. Vérifier le troubleshooting

---

## 📞 Support Rapide

| Question | Réponse |
|----------|--------|
| Comment afficher l'abonnement ? | `<SubscriptionDisplay />` |
| Comment vérifier l'accès? | `await hasActiveSubscription()` |
| Comment tester? | Carte: 4242 4242 4242 4242 |
| Où c'est documenté? | SUBSCRIPTION_SYSTEM.md |
| Comment déployer? | DEPLOYMENT_GUIDE.md |

---

**🚀 Prêt? Commencez maintenant!**

Copier le code ci-dessus et vous avez un système d'abonnement complet en 5 minutes. 🎉
