# 🗑️ Suppression de Profil Utilisateur

## Vue d'ensemble

Les utilisateurs (parents comme professionnels) peuvent **supprimer complètement leur profil** de la plateforme à tout moment. Cette suppression est **définitive et irréversible**, supprimant toutes les données associées.

## Fonctionnalité

### 🎯 Accès

**Pour Parents:** `Profil` → Bas de page → Bouton "Supprimer mon profil"  
**Pour Professionnels:** `Profil` → Bas de page → Bouton "Supprimer mon profil"

### 📋 Flux de Suppression

```
┌─────────────────────────────────────┐
│ Utilisateur clique "Supprimer"      │
└──────────────┬──────────────────────┘
               ↓
    ┌──────────────────────┐
    │ Modal Étape 1        │
    │ CONFIRMATION         │
    │                      │
    │ • Affiche email      │
    │ • Affiche type       │
    │ • Résumé données     │
    │ • Familles impactées │
    │ • Conversations      │
    │ • Événements         │
    └──────────┬───────────┘
               ↓
       [Continuer] [Annuler]
           ↓
    ┌──────────────────────┐
    │ Modal Étape 2        │
    │ DERNIÈRE CHANCE      │
    │                      │
    │ Taper exactement:    │
    │ "SUPPRIMER MON PROFIL"
    │                      │
    └──────────┬───────────┘
               ↓
    [Supprimer définitivement]
               ↓
    ┌──────────────────────┐
    │ Suppression en cours │
    └──────────┬───────────┘
               ↓
        ✅ Profil supprimé
        🔄 Redirection Login
```

### ✨ Fonctionnalités Clés

✅ **Avertissement Clair** - Affiche un résumé de ce qui sera supprimé  
✅ **Résumé Détaillé** - Montre les données concernées (familles, conversations, etc.)  
✅ **Confirmation Double** - Deux étapes pour éviter les suppressions accidentelles  
✅ **Validation Textuelle** - Doit taper "SUPPRIMER MON PROFIL" pour confirmer  
✅ **Nettoyage Complet** - Supprime toutes les données liées  
✅ **Déconnexion Automatique** - Redirection vers login après suppression  

## Architecture

### 1. Fonction Backend: `deleteUserProfile(uid)`

**Fichier:** `constants/firebase.js`

```javascript
export async function deleteUserProfile(uid) {
  // 1. Récupérer les données utilisateur
  // 2. Supprimer les conversations
  // 3. Supprimer les événements
  // 4. Gérer les familles
  // 5. Supprimer le document utilisateur Firestore
  // 6. Supprimer le compte Firebase Auth
  // 7. Effacer la session persistée
}
```

**Retour:**
```javascript
{
  success: true/false,
  message: string,
  deletedData: {
    userDocDeleted: boolean,
    conversationsDeleted: number,
    eventsDeleted: number,
    familiesLeft: string[],
    authDeleted: boolean
  }
}
```

### 2. Résumé Avant Suppression: `getDeleteProfileSummary(uid)`

**Fichier:** `constants/firebase.js`

```javascript
export async function getDeleteProfileSummary(uid) {
  // Récupère un résumé des données sans les supprimer
  return {
    userFound: boolean,
    userType: 'parent' | 'professionnel',
    email: string,
    familiesCount: number,
    conversationsCount: number,
    eventsCount: number,
    willDeleteFamilies: Family[],  // Seul membre
    willKeepFamilies: Family[]     // Autres membres restent
  }
}
```

### 3. Composant Modal: `DeleteProfileModal`

**Fichier:** `components/DeleteProfileModal.tsx`

```tsx
<DeleteProfileModal
  visible={showDeleteModal}
  onClose={() => setShowDeleteModal(false)}
  userId={auth.currentUser?.uid}
/>
```

**Props:**
```typescript
interface DeleteProfileModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
}
```

### 4. Intégration dans les Profils

**Parent Profile:** `app/(tabs)/Profil.tsx`  
**Pro Profile:** `app/(pro-tabs)/profil.tsx`

```tsx
import DeleteProfileModal from '@/components/DeleteProfileModal';

export default function ProfilScreen() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  return (
    <>
      {/* ... */}
      <TouchableOpacity 
        style={styles.deleteProfileButton}
        onPress={() => setShowDeleteModal(true)}
      >
        <IconSymbol name="trash.fill" size={20} color="#fff" />
        <Text>Supprimer mon profil</Text>
      </TouchableOpacity>

      <DeleteProfileModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        userId={user?.uid}
      />
    </>
  );
}
```

## Données Supprimées

### 1️⃣ Profil Utilisateur
- ❌ Document `users/{uid}` Firestore
- ❌ Compte Firebase Authentication
- ❌ Session AsyncStorage

### 2️⃣ Conversations
- ❌ Toutes les conversations où l'utilisateur participe
- ❌ Historique de messages

### 3️⃣ Événements
- ❌ Tous les événements créés par l'utilisateur

### 4️⃣ Familles
- ✅ **Si dernier membre:** Famille supprimée complètement
- ✅ **Si autres membres:** Utilisateur retiré de la famille

### 5️⃣ Données Non Supprimées
- 📧 Messages reçus des autres (copie serveur)
- 📋 Familles avec d'autres membres
- 📅 Événements partagés (restent avec autres participants)

## Flux Détaillé

### Étape 1: Chargement du Résumé

```javascript
const summary = await getDeleteProfileSummary(userId);

// Affiche:
// ✉️ Email: user@example.com
// 👤 Type: Parent
// 👨‍👩‍👧‍👦 Familles: 2
//    ❌ Sera supprimée: Famille 1
//    ✓ Utilisateur retiré: Famille 2
// 💬 Conversations: 5
// 📅 Événements: 3
```

### Étape 2: Confirmation Première

Modal affiche:
- ⚠️ Avertissement en rouge
- 📋 Résumé des données
- 🔴 Bouton "Continuer" (rouge)

### Étape 3: Confirmation Finale

Modal demande:
- Taper exactement: **"SUPPRIMER MON PROFIL"**
- Case de saisie sensible à la casse
- Bouton activé seulement si texte exact

### Étape 4: Suppression

```javascript
const result = await deleteUserProfile(userId);

if (result.success) {
  // Affiche confirmation
  // Redirection automatique vers LoginScreen
  router.replace('/(auth)/LoginScreen');
}
```

## Codes de Couleur

| Couleur | Utilisation |
|---------|------------|
| 🔴 `#E74C3C` | Boutons de suppression, avertissements |
| 🟡 `#FFF3CD` | Boîte d'avertissement modérée |
| 🟠 `#FADBD8` | Avertissements graves |
| 🟢 `#D5F4E6` | Actions sans suppression (retrait de famille) |

## Validation et Sécurité

### ✅ Protections

1. **Confirmation Double** - Impossible de supprimer par accident
2. **Validation Textuelle** - Doit taper exactement le texte
3. **Affichage du Résumé** - L'utilisateur voit ce qu'il perd
4. **Session Supprimée** - Déconnexion automatique
5. **Données Nettoyées** - Suppression complète Firestore + Auth

### 🔒 Impossible d'Annuler

- ❌ Pas de corbeille/récupération
- ❌ Pas de délai de grâce
- ❌ Suppression immédiate et définitive

## Gestion des Erreurs

### Cas d'Erreur Possibles

```javascript
// Utilisateur non trouvé
{
  success: false,
  message: "Utilisateur non trouvé"
}

// Erreur de suppression Firestore
{
  success: false,
  message: "Erreur lors de la suppression du profil",
  error: FirebaseError
}

// Erreur de suppression Auth
// (L'utilisateur doit être connecté pour supprimer son compte)
```

### Récupération d'Erreur

```typescript
try {
  const result = await deleteUserProfile(userId);
  if (!result.success) {
    Alert.alert('Erreur', result.message);
  }
} catch (error) {
  Alert.alert('Erreur Critique', error.message);
}
```

## Traces de Suppression

Les logs suivants sont générés:

```
[DeleteProfile] Début suppression pour: user123
[DeleteProfile] Suppression des conversations...
[DeleteProfile] Suppression des événements...
[DeleteProfile] Gestion des familles...
[DeleteProfile] Suppression du document utilisateur...
[DeleteProfile] Suppression du compte Firebase Auth...
[DeleteProfile] Suppression complète terminée pour: user123 {...}
```

## Considérations RGPD

✅ **Droit à l'Oubli** - Complètement supprimé du système  
✅ **Portabilité** - Données exportables avant suppression (future feature)  
✅ **Consentement** - Validation explicite requise  
✅ **Transparence** - Affichage clair de ce qui sera supprimé  
✅ **Contrôle** - Utilisateur contrôle sa suppression  

## Fichiers Modifiés

| Fichier | Type | Description |
|---------|------|-------------|
| [constants/firebase.js](constants/firebase.js) | 📝 Modifié | Ajout `deleteUserProfile()` et `getDeleteProfileSummary()` |
| [components/DeleteProfileModal.tsx](components/DeleteProfileModal.tsx) | ✅ Créé | Modal de confirmation avec 2 étapes |
| [app/(tabs)/Profil.tsx](app/(tabs)/Profil.tsx) | 📝 Modifié | Bouton + intégration modal (parent) |
| [app/(pro-tabs)/profil.tsx](app/(pro-tabs)/profil.tsx) | 📝 Modifié | Bouton + intégration modal (pro) |

## Exemple d'Utilisation

### Parent qui Supprime son Profil

```
1. Parent ouvre Profil
2. Clique "Supprimer mon profil"
3. Modal Étape 1:
   - Email: parent@example.com
   - Type: Parent
   - Familles: 1 (sera supprimée - dernier membre)
   - Conversations: 3
   - Événements: 2
   → [Continuer] [Annuler]
4. Modal Étape 2:
   - Taper "SUPPRIMER MON PROFIL"
   - ✓ Confirmation reçue
   → [Supprimer définitivement]
5. ⏳ Suppression en cours...
6. ✅ "Profil supprimé avec succès"
7. → Redirection LoginScreen
```

### Pro qui Quitte une Famille

```
Scénario: Pro a 2 familles (1 en solo, 1 avec 3 autres)

1. Pro clique "Supprimer mon profil"
2. Modal Étape 1:
   - Familles: 2
     ❌ Sera supprimée: Famille 1 (solo)
     ✓ Pro retiré: Famille 2 (3 autres membres)
   - Conversations: 5
   - Événements: 0
   → [Continuer]
3. Modal Étape 2:
   - Confirmation textuelle
4. ✅ Pro supprimé
   - Famille 1: Complètement supprimée
   - Famille 2: Pro retiré, autres membres restent
```

## Prochaines Améliorations

🔄 **Export de Données** - Télécharger les données avant suppression  
⏰ **Délai de Grâce** - Délai de 7/30 jours avant suppression effective  
🔐 **Vérification Email** - Confirmation par email avant suppression  
📊 **Raison de Suppression** - Sonder l'utilisateur sur la raison  
🔔 **Notification** - Email de confirmation de suppression  

---

**Date d'implémentation:** 18 Décembre 2025  
**Version:** 1.0  
**État:** ✅ Complet et Fonctionnel
