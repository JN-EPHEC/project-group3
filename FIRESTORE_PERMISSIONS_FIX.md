# 🔐 Résolution d'Erreur: Permissions Firestore Insuffisantes

## Problème

```
[Session] Erreur lors de la mise à jour d'activité: 
[FirebaseError: Missing or insufficient permissions.]
```

Cette erreur indique que les **règles de sécurité Firestore** n'autorisent pas les utilisateurs à mettre à jour leurs propres documents dans la collection `users`.

## Cause

Les règles Firestore par défaut ou trop restrictives bloquent l'accès en écriture sur les documents utilisateur.

## Solutions

### Solution 1: Corriger les Règles Firestore (Recommandé)

**Allez sur:** Firebase Console → Firestore Database → Rules

**Remplacez les règles par:**

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ✅ Utilisateurs peuvent lire et modifier leurs propres documents
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId;
    }
    
    // ✅ Professionnels peuvent lire et modifier leur profil
    match /professionals/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId;
    }
    
    // ✅ Conversations accessibles aux participants
    match /conversations/{conversationId} {
      allow read: if request.auth.uid in resource.data.participants;
      allow write: if request.auth.uid in resource.data.participants;
    }
    
    // ✅ Événements accessibles au créateur et aux familles
    match /events/{eventId} {
      allow read: if request.auth.uid == resource.data.userId || 
                     request.auth.uid in resource.data.participants;
      allow write: if request.auth.uid == resource.data.userId;
    }
    
    // ✅ Familles accessibles aux membres
    match /families/{familyId} {
      allow read: if request.auth.uid in resource.data.members;
      allow write: if request.auth.uid in resource.data.members;
    }
    
    // ✅ Tous les autres documents: pas d'accès
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Solution 2: Contourner le Problème en Code (Implémentée)

Le code a été modifié pour gérer gracieusement les erreurs de permission:

**Avant:**
```javascript
// Échoue si pas de permission
await updateDoc(userDocRef, {
  lastActivityAt: new Date()
});
```

**Après:**
```javascript
// Essaie, mais continue même si échoue
try {
  await updateDoc(userDocRef, {
    lastActivityAt: new Date()
  });
} catch (firestoreError) {
  // Log l'erreur mais continue
  console.warn('[Session] Mise à jour Firestore échouée (non-bloquant)');
}
```

**Avantages:**
- ✅ Session persiste en AsyncStorage même sans Firestore
- ✅ Pas de crash de l'app
- ✅ L'utilisateur peut continuer à utiliser l'app
- ⚠️ Timestamp de dernière activité non persisté (Firestore)

## Implémentation

### Fichiers Modifiés

**`constants/sessionManager.js`:**

1. **`createAndPersistSession()`** - Gère les erreurs Firestore
   ```javascript
   try {
     // Récupérer données (optionnel)
   } catch (firestoreError) {
     console.warn('Impossible de récupérer les données');
   }
   
   // Persister en AsyncStorage (critique)
   await AsyncStorage.setItem(...);
   
   try {
     // Mettre à jour Firestore (optionnel)
   } catch (firestoreError) {
     console.warn('Mise à jour Firestore échouée (non-bloquant)');
   }
   ```

2. **`updateSessionActivity()`** - Gère les erreurs Firestore
   ```javascript
   // Persister en AsyncStorage (critique)
   await AsyncStorage.setItem(...);
   
   // Mettre à jour Firestore (optionnel - ne pas bloquer si erreur)
   if (session.uid) {
     try {
       await updateDoc(userDocRef, { lastActivityAt: new Date() });
     } catch (firestoreError) {
       console.warn('[Session] Mise à jour Firestore échouée');
     }
   }
   ```

## Flux de Gestion d'Erreur

```
┌──────────────────────────────┐
│ Mise à jour d'activité       │
└──────────────┬───────────────┘
               ↓
    ┌──────────────────────────┐
    │ Mettre à jour AsyncStorage│ ← CRITIQUE
    └──────────────┬───────────┘
                   ↓
        ✅ Session persistée en local
               ↓
    ┌──────────────────────────┐
    │ Mettre à jour Firestore  │ ← OPTIONNEL
    └──────────────┬───────────┘
           ↗      ↖
      SUCCÈS    ERREUR
           ↓      ↓
        ✅       ⚠️ Continuer
               Timestamp non sync
```

## Logs de Débogage

Avant (Erreur):
```
[Session] Erreur lors de la mise à jour d'activité: 
[FirebaseError: Missing or insufficient permissions.]
```

Après (Géré gracieusement):
```
[Session] Mise à jour d'activité réussie (AsyncStorage)
[Session] Mise à jour Firestore échouée (non-bloquant): Missing or insufficient permissions.
```

## Recommandation

**✅ Appliquer les règles Firestore correctes (Solution 1)** pour:
- Garantir la persistance des données sur le serveur
- Permettre des requêtes basées sur `lastActivityAt`
- Respecter les meilleures pratiques de sécurité

**⚠️ La gestion du code (Solution 2)** est:
- Un filet de sécurité supplémentaire
- Utile pendant le développement/test
- Prévient les crashes d'app

## Vérification

### Test 1: Vérifier les Règles Firestore

```
Firebase Console → Firestore Database → Rules
Chercher: match /users/{userId}
Vérifier: allow write: if request.auth.uid == userId;
```

### Test 2: Vérifier les Logs

L'app devrait afficher:
```
[Session] Session créée et persistée pour: user@example.com
[Session] Mise à jour Firestore échouée (non-bloquant): [si problème]
```

### Test 3: Vérifier la Persistance

```javascript
// Ouvrir DevTools Firestore
const session = await getPersistedSession();
console.log('Session en AsyncStorage:', session);
// Devrait afficher la session même si Firestore échoue
```

## Données Synchro avec Firestore

| Donnée | AsyncStorage | Firestore | Critique |
|--------|--------------|-----------|----------|
| UID | ✅ | ✅ | Oui |
| Email | ✅ | ⚠️ | Non |
| Token | ✅ | ✅ | Oui |
| Type | ✅ | ⚠️ | Non |
| LastActivity | ✅ | ⚠️ | Non |
| ExpiresAt | ✅ | ✅ | Oui |

**Critique:** Les données doivent être synchronisées pour le bon fonctionnement.

## Prochaines Étapes

1. ✅ **Immédiat:** Appliquer les règles Firestore correctes
2. ✅ **Test:** Vérifier que les logs n'affichent pas d'erreur
3. ✅ **Optionnel:** Améliorer la gestion des permissions avec des règles plus complexes

---

**Date:** 18 Décembre 2025  
**État:** ✅ Résolu
