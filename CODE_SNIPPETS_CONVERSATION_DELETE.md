# 📝 Code Snippets - Suppression de Conversations

## 1. Firebase Functions

### `hideConversationForUser()` - Masquer une conversation

**Fichier:** `constants/firebase.js`

```javascript
/**
 * Masquer une conversation pour un utilisateur spécifique
 * La conversation reste dans la BD mais n'est plus visible pour cet utilisateur
 * Fonctionne pour les parents et les professionnels
 * 
 * @param {string} conversationId - ID de la conversation
 * @param {string} userId - ID de l'utilisateur qui souhaite masquer la conversation
 * @returns {Promise<void>}
 */
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

    // Ajouter userId au tableau hiddenFor (créer le tableau s'il n'existe pas)
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

---

### `unhideConversationForUser()` - Restaurer une conversation

**Fichier:** `constants/firebase.js`

```javascript
/**
 * Afficher à nouveau une conversation précédemment masquée
 * 
 * @param {string} conversationId - ID de la conversation
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<void>}
 */
export async function unhideConversationForUser(conversationId, userId) {
  try {
    const convRef = doc(db, 'conversations', conversationId);
    
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) {
      throw new Error('Conversation non trouvée');
    }

    const convData = convSnap.data();
    let hiddenFor = convData.hiddenFor || [];
    
    // Retirer userId du tableau hiddenFor
    hiddenFor = hiddenFor.filter(id => id !== userId);

    await updateDoc(convRef, {
      hiddenFor: hiddenFor
    });

    console.log(`[UnhideConversation] Conversation ${conversationId} restaurée pour l'utilisateur ${userId}`);
  } catch (error) {
    console.error('[UnhideConversation] Erreur:', error);
    throw error;
  }
}
```

---

## 2. React Component Functions

### `handleDeleteConversation()` - Fonction de suppression avec alerte

**Fichier:** `app/(tabs)/Message.tsx` ou `app/(pro-tabs)/Message.tsx`

```typescript
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

## 3. Snapshot Listener avec Filtre

### Filtre des conversations masquées

**Fichier:** `app/(tabs)/Message.tsx`

```typescript
// CONVERSATIONS FAMILIALES
const unsubFamily = onSnapshot(familyConversationsQuery, (snapshot) => {
  familyConvs = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    // FILTRE 1: exclure les conversations avec un professionalId
    .filter(conv => !conv.professionalId)
    // FILTRE 2: exclure les conversations masquées par cet utilisateur
    .filter(conv => !conv.hiddenFor || !conv.hiddenFor.includes(uid));
  
  // Combiner avec les conversations professionnelles
  const allConvs = [...familyConvs, ...professionalConvs];
  setConversations(allConvs);
  setLoading(false);
});

// CONVERSATIONS PROFESSIONNELLES
const unsubProfessional = onSnapshot(professionalConversationsQuery, async (snapshot) => {
  professionalConvs = snapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    // FILTRE: exclure les conversations masquées par cet utilisateur
    .filter(conv => !conv.hiddenFor || !conv.hiddenFor.includes(uid));
  
  // Combiner avec les conversations familiales
  const allConvs = [...familyConvs, ...professionalConvs];
  setConversations(allConvs);
  setLoading(false);
});
```

**Fichier:** `app/(pro-tabs)/Message.tsx`

```typescript
// CONVERSATIONS POUR PROFESSIONNEL
const unsubConversations = onSnapshot(conversationsQuery, async (snapshot) => {
  const convs: ConversationData[] = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    // FILTRE: exclure les conversations masquées par cet utilisateur
    .filter(conv => !conv.hiddenFor || !conv.hiddenFor.includes(uid));
  
  setConversations(convs);
  setLoading(false);
});
```

---

## 4. JSX/UI Components

### Bouton de suppression avec icône

**Fichier:** `app/(tabs)/Message.tsx` ou `app/(pro-tabs)/Message.tsx`

```tsx
<View style={styles.conversationHeader}>
  <Text style={[styles.conversationName, { color: colors.text }]}>
    {displayName}
  </Text>
  <View style={styles.rightSection}>
    <Text style={[styles.messageTime, { color: colors.textTertiary }]}>
      {formatTime(conv.lastMessageTime)}
    </Text>
    <TouchableOpacity 
      style={styles.deleteButton}
      onPress={() => handleDeleteConversation(conv.id, displayName)}
    >
      <IconSymbol name="trash" size={18} color="#FF6B6B" />
    </TouchableOpacity>
  </View>
</View>
```

---

## 5. Styles CSS

### Styles pour bouton et section droite

**Fichier:** `app/(tabs)/Message.tsx` ou `app/(pro-tabs)/Message.tsx`

```typescript
const styles = StyleSheet.create({
  // ... autres styles ...
  
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: V_SPACING.tiny,
  },
  conversationName: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    flex: 1,  // Important: permet au rightSection de s'adapter
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,  // Espace entre l'heure et le bouton
  },
  messageTime: {
    fontSize: FONT_SIZES.small,
  },
  deleteButton: {
    padding: SPACING.tiny,  // Augmente la zone cliquable
  },
  
  // ... autres styles ...
});
```

---

## 6. Imports

### Imports à ajouter

**Fichier:** `app/(tabs)/Message.tsx`

```typescript
import { Alert } from 'react-native';  // ← AJOUTER
import { hideConversationForUser } from '../../constants/firebase';  // ← AJOUTER
```

**Fichier:** `app/(pro-tabs)/Message.tsx`

```typescript
import { Alert } from 'react-native';  // ← AJOUTER
import { hideConversationForUser } from '../../constants/firebase';  // ← AJOUTER
```

---

## 7. Exemple Complet: Flux Utilisateur

### Scénario: Parent supprime une conversation

```typescript
// 1. User clicks delete button
onPress={() => handleDeleteConversation(conv.id, displayName)}

// 2. Alert appears
Alert.alert(
  'Supprimer la conversation',
  'Êtes-vous sûr de vouloir supprimer la conversation avec Jean Dupont?...'
)

// 3. User clicks "Supprimer"
// 4. hideConversationForUser() is called
await hideConversationForUser(conversationId, user.uid);

// 5. Firestore updates:
// conversations/{convId} { hiddenFor: ["user123"] }

// 6. onSnapshot listener is triggered
snapshot.docs
  .map(doc => ({ id: doc.id, ...doc.data() }))
  .filter(conv => !conv.hiddenFor || !conv.hiddenFor.includes(uid))
  // ↑ Conversation is now filtered out

// 7. setConversations([...]) triggers React re-render

// 8. Conversation card disappears from UI

// 9. Success alert
Alert.alert('Succès', 'La conversation a été supprimée de votre vue');
```

---

## 8. Gestion d'Erreurs

### Error Handling Examples

```typescript
// Cas 1: Conversation n'existe pas
try {
  await hideConversationForUser(conversationId, userId);
} catch (error) {
  if (error.message === 'Conversation non trouvée') {
    Alert.alert('Erreur', 'Cette conversation n\'existe plus');
  }
}

// Cas 2: Utilisateur n'est pas participant
catch (error) {
  if (error.message.includes('participant')) {
    Alert.alert('Erreur', 'Vous n\'avez pas accès à cette conversation');
  }
}

// Cas 3: Erreur réseau
catch (error) {
  if (error.code === 'PERMISSION_DENIED') {
    Alert.alert('Erreur', 'Impossible de supprimer: vérifiez les permissions');
  } else {
    Alert.alert('Erreur', 'Impossible de supprimer la conversation');
  }
}
```

---

## 9. Firestore Rules (Optionnel)

### Règles de sécurité

```javascript
// firestore.rules
match /conversations/{document=**} {
  // Lecture: seuls les participants
  allow read: if request.auth.uid in resource.data.participants;
  
  // Écriture: seuls les participants
  allow write: if request.auth.uid in resource.data.participants;
  
  // Mise à jour spécifique du champ hiddenFor
  allow update: if request.auth.uid in resource.data.participants
                && request.resource.data.hiddenFor is list;
}
```

---

## 10. Requête Firestore Complète

### Query pour récupérer les conversations

```typescript
// Parent
const familyConversationsQuery = query(
  collection(db, 'conversations'),
  where('familyId', 'in', familyIds),
  where('participants', 'array-contains', uid),
  orderBy('lastMessageTime', 'desc')
);

// Avec filtre appliqué après récupération:
onSnapshot(familyConversationsQuery, (snapshot) => {
  const conversations = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(conv => !conv.hiddenFor || !conv.hiddenFor.includes(uid));
});

// Professional
const professionalConversationsQuery = query(
  collection(db, 'conversations'),
  where('participants', 'array-contains', uid),
  orderBy('lastMessageTime', 'desc')
);

// Avec filtre:
onSnapshot(professionalConversationsQuery, (snapshot) => {
  const conversations = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(conv => !conv.hiddenFor || !conv.hiddenFor.includes(uid));
});
```

---

## 11. Tests Unitaires (Optionnel)

### Jest Test Example

```typescript
import { hideConversationForUser } from './firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

jest.mock('firebase/firestore');

describe('hideConversationForUser', () => {
  it('should hide conversation for user', async () => {
    // Mock Firestore response
    const mockConvData = {
      participants: ['user1', 'user2'],
      hiddenFor: []
    };
    
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => mockConvData
    });

    // Call function
    await hideConversationForUser('conv123', 'user1');

    // Verify update called
    expect(updateDoc).toHaveBeenCalledWith(
      doc(db, 'conversations', 'conv123'),
      { hiddenFor: ['user1'] }
    );
  });

  it('should throw error if user is not participant', async () => {
    const mockConvData = {
      participants: ['user1', 'user2'],
      hiddenFor: []
    };
    
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => mockConvData
    });

    // Should throw
    await expect(
      hideConversationForUser('conv123', 'user3')
    ).rejects.toThrow('L\'utilisateur n\'est pas participant');
  });
});
```

---

## Résumé des Snippets

| Catégorie | Fonction | Fichier |
|-----------|----------|---------|
| Firebase | `hideConversationForUser()` | firebase.js |
| Firebase | `unhideConversationForUser()` | firebase.js |
| React | `handleDeleteConversation()` | Message.tsx |
| Filter | `.filter(conv => !conv.hiddenFor...)` | Message.tsx |
| UI | Bouton 🗑️ + rightSection | Message.tsx |
| Styles | `rightSection`, `deleteButton` | Message.tsx |
| Imports | `Alert`, `hideConversationForUser` | Message.tsx |

Tous les snippets sont **copiables directement** dans votre code.

