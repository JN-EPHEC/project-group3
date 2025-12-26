# ✅ Configuration Terminée !

## 🎉 Ce qui est déjà fait :

- ✅ **Scoop installé** (gestionnaire de packages Windows)
- ✅ **Stripe CLI installé** (version 1.34.0)
- ✅ **Backend configuré** avec tes clés Stripe
- ✅ **Backend en cours d'exécution** sur http://localhost:3000

---

## 🚀 Prochaine Étape : Configurer le Webhook

Le backend tourne, mais il a besoin du webhook Stripe pour recevoir les événements de paiement.

### 📋 Instructions Simples :

**Option 1 : Script Automatique (Recommandé)**

1. **Ouvre un NOUVEAU terminal PowerShell** (important pour recharger le PATH)
2. Va dans le dossier backend :
   ```powershell
   cd "e:\Github all repositories\project-group3\backend"
   ```
3. Lance le script :
   ```powershell
   .\setup-webhook.bat
   ```
4. Suis les instructions à l'écran

**Option 2 : Commandes Manuelles**

Si le script ne marche pas, fais ceci dans un nouveau terminal :

```powershell
# 1. Se connecter à Stripe
stripe login

# 2. Lancer le webhook listener
stripe listen --forward-to localhost:3000/webhook/stripe
```

---

## ⚠️ IMPORTANT

Quand tu lances `stripe listen`, tu verras :

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxx
```

**→ Copie ce secret (`whsec_...`) et envoie-le moi !**

Je vais l'ajouter automatiquement dans les fichiers `.env` pour que tout fonctionne.

---

## 🎯 État Actuel

| Étape | État |
|-------|------|
| Backend installé | ✅ |
| Backend lancé (port 3000) | ✅ |
| Stripe CLI installé | ✅ |
| Webhook configuré | ⏳ En attente |
| App mobile | ⏳ Prochaine étape |

---

## 🆘 Problème ?

Si Stripe CLI ne fonctionne pas après avoir ouvert un nouveau terminal :

1. Redémarre complètement PowerShell/VS Code
2. Ou installe Stripe CLI manuellement : https://stripe.com/docs/stripe-cli#install

---

**Dis-moi quand tu as le webhook secret (whsec_...) et je configure tout automatiquement !** 🚀
