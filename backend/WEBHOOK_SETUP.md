# 🎯 Instructions Manuelles - Configuration Webhook Stripe

Stripe CLI a été installé mais nécessite un redémarrage de PowerShell pour être accessible.

## 📝 Étapes à suivre :

### 1. **Ouvre un NOUVEAU terminal PowerShell** (important !)

Ferme ce terminal et ouvre-en un nouveau pour recharger le PATH.

### 2. **Va dans le dossier backend**

```powershell
cd "e:\Github all repositories\project-group3\backend"
```

### 3. **Connecte-toi à Stripe**

```powershell
stripe login
```

Une page web va s'ouvrir. Clique sur **"Allow access"** pour autoriser Stripe CLI.

### 4. **Lance le webhook listener**

```powershell
stripe listen --forward-to localhost:3000/webhook/stripe
```

### 5. **📋 IMPORTANT : Copie le webhook secret**

Le terminal va afficher quelque chose comme :

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

**Copie ce secret** (`whsec_...`) et dis-le moi pour que je le configure dans `.env`.

---

## 🔄 Ou utilise le script automatique :

```powershell
.\setup-webhook.ps1
```

---

Une fois le webhook lancé, tu verras :

```
✓ Ready! Your webhook signing secret is whsec_xxxxx
👉 Listening for events...
```

**Ne ferme pas ce terminal** - il doit rester ouvert pour recevoir les webhooks.

---

## 🚀 Ensuite

Une fois le webhook configuré, tu pourras lancer l'app mobile :

```bash
# Dans un autre terminal, à la racine du projet
npx expo start
```
