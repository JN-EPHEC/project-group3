# 🗑️ Fonctionnalité de Suppression de Conversations

## Vue d'ensemble

Implémentation complète d'une fonctionnalité permettant aux **parents** et aux **professionnels** de supprimer les conversations de leur vue, sans les supprimer réellement de la base de données.

### Comportement attendu

- ✅ Les conversations supprimées restent dans Firestore
- ✅ Elles ne sont plus visibles pour l'utilisateur qui les a supprimées
- ✅ Les autres participants continuent à voir la conversation
- ✅ Fonctionne pour les parents ET les professionnels
- ✅ Un bouton "Corbeille" 🗑️ rouge sur chaque conversation permet la suppression

---

## Architecture Technique

### 1. **Champ Firestore: `hiddenFor`**

Chaque document de conversation contient un tableau:
```javascript
{
  conversationId: "...",
  participants: ["uid1", "uid2"],
  hiddenFor: ["uid1"],  // Tableau des UIDs qui ont masqué la conversation
  lastMessage: "...",
  lastMessageTime: Timestamp,
  ...
}
```

**Logique:**
- Si un utilisateur masque une conversation, son UID est ajouté au tableau `hiddenFor`
- Si un utilisateur restaure une conversation, son UID est retiré du tableau `hiddenFor`
- La conversation reste intacte pour tous les autres participants

---

## Fichiers Modifiés

### 1. `constants/firebase.js`

#### Nouvelle fonction: `hideConversationForUser()`
```javascript
export async function hideConversationForUser(conversationId, userId)
```

**Paramètres:**
- `conversationId` (string): ID du document de conversation
- `userId` (string): UID de l'utilisateur qui masque la conversation

**Comportement:**
- Récupère le document de conversation
- Vérifie que l'utilisateur en est participant
- Ajoute l'userId au tableau `hiddenFor`
- Met à jour le document

---

#### Nouvelle fonction: `unhideConversationForUser()`
```javascript
export async function unhideConversationForUser(conversationId, userId)
```

**Comportement:**
- Retirer un utilisateur du tableau `hiddenFor`
- Permet de restaurer une conversation supprimée

---

### 2. `app/(tabs)/Message.tsx` (Parents)

#### Imports ajoutés
```tsx
import { Alert } from 'react-native';
import { hideConversationForUser } from '../../constants/firebase';
```

#### Filtrage des conversations
Les conversations masquées sont automatiquement filtrées au chargement:
```tsx
.filter(conv => !conv.hiddenFor || !conv.hiddenFor.includes(uid))
```

**Appliqué à 2 places:**
1. Conversations familiales
2. Conversations avec professionnels

#### Nouvelle fonction: `handleDeleteConversation()`
```tsx
const handleDeleteConversation = (conversationId: string, displayName: string) => {
  Alert.alert(
    'Supprimer la conversation',
    `Êtes-vous sûr de vouloir supprimer la conversation avec ${displayName}?`,
    [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', onPress: async () => {
        await hideConversationForUser(conversationId, user.uid);
        Alert.alert('Succès', 'La conversation a été supprimée');
      }, style: 'destructive' }
    ]
  );
}
```

#### UI: Bouton de suppression
- Bouton 🗑️ en rouge sur chaque conversation
- Positionné à côté de l'heure du dernier message
- Déclenche une alerte de confirmation

#### Styles CSS ajoutés
```tsx
rightSection: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: SPACING.small,
},
deleteButton: {
  padding: SPACING.tiny,
}
```

---

### 3. `app/(pro-tabs)/Message.tsx` (Professionnels)

**Modifications identiques au fichier parent:**

#### Imports
```tsx
import { Alert } from 'react-native';
import { hideConversationForUser } from '../../constants/firebase';
```

#### Filtrage
```tsx
.filter(conv => !conv.hiddenFor || !conv.hiddenFor.includes(uid))
```

#### Fonction de suppression
```tsx
const handleDeleteConversation = (conversationId: string, displayName: string) => {
  // Même implémentation que pour les parents
}
```

#### UI et Styles
- Même bouton de suppression
- Même positionnement
- Même couleur rouge (#FF6B6B)

---

## Flux Utilisateur

### Pour un Parent

1. **Affichage des conversations**
   - Chaque conversation parent/professionnel est listée
   - Chaque conversation familiale est listée

2. **Suppression**
   - Clic sur l'icône 🗑️ rouge
   - Confirmation du suppression
   - La conversation disparaît immédiatement

3. **Restauration (future)**
   - Possibilité d'ajouter un onglet "Archives" pour restaurer les conversations

### Pour un Professionnel

- **Flux identique** aux parents
- Les mêmes conversations avec les mêmes options de suppression

---

## Détails Implémentation

### Filtrage en Temps Réel

Les conversations masquées sont filtrées par **deux snapshots listeners séparés:**

1. **Conversations familiales** (parents uniquement)
   ```tsx
   const unsubFamily = onSnapshot(familyConversationsQuery, (snapshot) => {
     familyConvs = snapshot.docs
       .map(doc => ({ id: doc.id, ...doc.data() }))
       .filter(conv => !conv.professionalId)
       .filter(conv => !conv.hiddenFor || !conv.hiddenFor.includes(uid));
   });
   ```

2. **Conversations professionnelles** (parents + professionnels)
   ```tsx
   const unsubProfessional = onSnapshot(professionalConversationsQuery, (snapshot) => {
     professionalConvs = snapshot.docs
       .map(doc => ({ id: doc.id, ...doc.data() }))
       .filter(conv => !conv.hiddenFor || !conv.hiddenFor.includes(uid));
   });
   ```

### Confirmation Avant Suppression

Une alerte natale demande la confirmation:
```
⚠️ Supprimer la conversation
Êtes-vous sûr de vouloir supprimer la conversation avec [Nom]? 
Cette action ne peut pas être annulée.

[Annuler]  [Supprimer]
```

---

## Sécurité & Validation

### Vérifications Firestore

```javascript
// Vérifier que l'utilisateur est participant
if (!convData.participants || !convData.participants.includes(userId)) {
  throw new Error('L\'utilisateur n\'est pas participant de cette conversation');
}
```

### Idempotence

- Si `hiddenFor` existe déjà, vérifier avant d'ajouter l'utilisateur
- Ne pas dupliquer les UIDs dans le tableau

---

## Tests de Validation

### Test Parent

1. ✅ Parent voit ses conversations
2. ✅ Parent clique sur 🗑️ sur une conversation
3. ✅ Alerte de confirmation apparaît
4. ✅ Parent clique "Supprimer"
5. ✅ Conversation disparaît immédiatement
6. ✅ Le professionnel voit toujours la conversation

### Test Professionnel

1. ✅ Professionnel voit ses conversations
2. ✅ Professionnel clique sur 🗑️
3. ✅ Conversation disparaît de sa vue
4. ✅ Le parent voit toujours la conversation

### Test d'Intégrité

1. ✅ Vérifier Firestore: `hiddenFor` contient les UIDs corrects
2. ✅ Vérifier: Conversation n'est pas supprimée physiquement
3. ✅ Vérifier: Les messages restent intacts

---

## Améliorations Futures (Optionnel)

### 1. Onglet "Archives"
Ajouter un onglet pour voir les conversations masquées et les restaurer:
```tsx
const handleShowArchived = () => {
  // Afficher conversations où hiddenFor.includes(userId)
}
```

### 2. "Restaurer Tout"
Bouton pour restaurer toutes les conversations d'un coup

### 3. Suppression Automatique
Après X jours, supprimer réellement les conversations où `hiddenFor` contient tous les participants

### 4. Notifications
Lorsqu'un message arrive dans une conversation masquée, notifier l'utilisateur

---

## Configuration Firestore (Optionnel)

### Index suggéré
```
Collection: conversations
Fields: participants (Array), hiddenFor (Array)
Query: where('participants', 'array-contains', userId) 
       and filter out where 'hiddenFor', 'array-contains', userId
```

Firestore gère déjà les `array-contains` sans index spécial pour les filtres.

---

## Code Complet des Fonctions

### firebase.js - `hideConversationForUser()`

```javascript
export async function hideConversationForUser(conversationId, userId) {
  try {
    const convRef = doc(db, 'conversations', conversationId);
    
    // Récupérer la conversation
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) {
      throw new Error('Conversation non trouvée');
    }

    // Vérifier que l'utilisateur est participant
    const convData = convSnap.data();
    if (!convData.participants || !convData.participants.includes(userId)) {
      throw new Error('L\'utilisateur n\'est pas participant de cette conversation');
    }

    // Ajouter userId au tableau hiddenFor
    const hiddenFor = convData.hiddenFor || [];
    if (!hiddenFor.includes(userId)) {
      hiddenFor.push(userId);
    }

    await updateDoc(convRef, {
      hiddenFor: hiddenFor
    });

    console.log(`[HideConversation] Conversation ${conversationId} masquée pour l'utilisateur ${userId}`);
  } catch (error) {
    console.error('[HideConversation] Erreur:', error);
    throw error;
  }
}
```

### Message.tsx - `handleDeleteConversation()`

```tsx
const handleDeleteConversation = (conversationId: string, displayName: string) => {
  Alert.alert(
    'Supprimer la conversation',
    `Êtes-vous sûr de vouloir supprimer la conversation avec ${displayName}? Cette action ne peut pas être annulée.`,
    [
      {
        text: 'Annuler',
        onPress: () => {},
        style: 'cancel'
      },
      {
        text: 'Supprimer',
        onPress: async () => {
          try {
            if (!user?.uid) return;
            await hideConversationForUser(conversationId, user.uid);
            Alert.alert('Succès', 'La conversation a été supprimée de votre vue');
          } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            Alert.alert('Erreur', 'Impossible de supprimer la conversation');
          }
        },
        style: 'destructive'
      }
    ]
  );
};
```

---

## Résumé des Changements

| Fichier | Type | Changement |
|---------|------|-----------|
| `constants/firebase.js` | Fonction | +2 nouvelles fonctions |
| `app/(tabs)/Message.tsx` | Import + UI | Import `hideConversationForUser`, filtrage, fonction de suppression, bouton |
| `app/(pro-tabs)/Message.tsx` | Import + UI | Identique aux parents |

---

## Statut: ✅ COMPLET

Toutes les fonctionnalités sont implémentées et testables immédiatement.
