# 🔑 TÉLÉCHARGER serviceAccountKey.json - 2 MINUTES

## Étapes Rapides

### 1. Ouvrir Firebase Console
```
https://console.firebase.google.com
```

### 2. Sélectionner votre projet
- Cliquer sur: **wekid-test**

### 3. Aller dans les paramètres
- Cliquer sur l'⚙️ à côté de "Vue d'ensemble du projet"
- Cliquer sur: **Paramètres du projet** (Project Settings)

### 4. Aller dans Service Accounts
- En haut, cliquer sur l'onglet: **Comptes de service** (Service Accounts)

### 5. Générer la clé
- Défiler vers le bas
- Section: **SDK Admin Firebase**
- Cliquer sur: **Générer une nouvelle clé privée** (Generate new private key)
- Confirmer: **Générer la clé**

### 6. Sauvegarder le fichier
- Un fichier JSON est téléchargé automatiquement
- **NOM ORIGINAL**: `wekid-test-xxxxxx-firebase-adminsdk-xxxxx.json`

### 7. Renommer et déplacer
```bash
# Windows (PowerShell)
Move-Item "$env:USERPROFILE\Downloads\wekid-test-*.json" "E:\Github all repositories\project-group3\backend\serviceAccountKey.json"

# OU manuellement:
# 1. Copier le fichier depuis Téléchargements
# 2. Coller dans: E:\Github all repositories\project-group3\backend\
# 3. Renommer en: serviceAccountKey.json
```

### 8. Vérifier
```bash
cd backend
node setup-backend.js
```

**Doit afficher:**
```
✅ serviceAccountKey.json existe
✅ .env mis à jour avec les valeurs de serviceAccountKey.json
✅ Configuration complète!
```

---

## ⚠️ IMPORTANT

**NE JAMAIS COMMIT CE FICHIER!**

Le fichier `.gitignore` doit contenir:
```
backend/serviceAccountKey.json
backend/.env
```

---

## 🆘 Problème?

**Fichier introuvable après téléchargement?**
- Vérifier le dossier Téléchargements
- Chercher: `wekid-test-firebase-adminsdk`

**Erreur "Permission denied"?**
- Le fichier est bien placé dans `backend/`
- Pas dans `backend/node_modules/` ou autre sous-dossier

**Script dit toujours "introuvable"?**
```bash
# Vérifier manuellement:
ls backend/serviceAccountKey.json

# Doit afficher:
# -rw-r--r-- 1 user group 2397 Dec 28 15:30 serviceAccountKey.json
```

---

## ✅ C'EST FAIT!

Une fois `serviceAccountKey.json` en place et `setup-backend.js` qui dit "Configuration complète":

```bash
npm install
npm run dev
```

Le serveur démarrera avec:
```
✅ Firebase Admin initialisé avec succès
📦 Project ID: wekid-test
🚀 Server running on http://0.0.0.0:3000
```

**PRÊT!** 🎉
