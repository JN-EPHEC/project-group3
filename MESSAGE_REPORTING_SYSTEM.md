# Système de Signalement de Messages

## Vue d'ensemble

Le système de signalement de messages permet aux **parents** et aux **professionnels** de signaler des messages problématiques à un administrateur pour audit. Cela permet de maintenir un environnement sain et sécurisé dans la plateforme.

## Fonctionnalités pour les utilisateurs

### Signaler un message

1. **Accéder à une conversation** avec un parent ou un professionnel
2. **Appuyer sur le bouton de signalement** (🚩) qui apparaît sur chaque message reçu
3. **Sélectionner une raison** parmi les options disponibles:
   - 🤬 **Contenu offensant/Insulte** - Langage irrespectueux ou insultant
   - 😠 **Harcèlement/Menaces** - Messages menaçants ou harcèlement
   - 🚫 **Contenu inapproprié** - Contenu non adapté
   - ⚠️ **Spam** - Messages non sollicités ou répétitifs
   - 📋 **Autre** - Autres raisons

4. **Ajouter des détails supplémentaires** (optionnel) pour expliquer le problème
5. **Soumettre le rapport** - Un email de confirmation est envoyé

### Disponibilité

- ✅ Accès **parents** : Onglet Messages
- ✅ Accès **professionnels** : Onglet Messages
- ✅ Signalements possibles **24/7**

## Fonctionnalités pour les administrateurs

### Accéder au panneau de modération

1. Être marqué comme administrateur dans la base de données (`isAdmin: true` dans la collection `users`)
2. Naviguer vers `/admin-moderation`
3. Cliquer sur "Signalements de messages"

### Gérer les signalements

#### Filtrer par statut

- ⏳ **En attente** - Nouveaux signalements non examinés
- 👀 **Examinés** - Signalements en cours d'examen
- ❌ **Rejetés** - Signalements dismissés
- ✅ **Actions prises** - Signalements avec interventions

#### Actions disponibles

Pour chaque signalement, vous pouvez:

1. **Consulter les détails complets**
   - Texte du message signalé
   - Auteur du message
   - Personne ayant signalé
   - Raison et description
   - Date et type de conversation

2. **Modifier le statut**
   - 👀 Marquer comme "Examiné"
   - ❌ Marquer comme "Rejeté"
   - ✅ Marquer comme "Action prise"

3. **Supprimer le rapport**
   - Supprimer le signalement de la base de données (après traitement)

## Schéma Firestore

```
Collection: messageReports
├── messageId (string) - ID du message signalé
├── conversationId (string) - ID de la conversation
├── messageText (string) - Contenu du message
├── messageTimestamp (timestamp) - Date du message
├── senderId (string) - UID de l'auteur du message
├── senderName (string) - Nom affiché de l'auteur
├── reportedBy (string) - UID de la personne signalant
├── reportedByName (string) - Email de la personne signalant
├── reason (string) - Raison: 'offensive', 'harassment', 'inappropriate', 'spam', 'other'
├── description (string) - Détails supplémentaires
├── status (string) - 'pending', 'reviewed', 'dismissed', 'action_taken'
├── isProfessionalConversation (boolean) - Type de conversation
└── createdAt (timestamp) - Date du signalement
```

## Configuration requise

### Pour les utilisateurs

- Aucune configuration spéciale
- Accès automatique au bouton de signalement sur tous les messages reçus

### Pour les administrateurs

1. **Marquer comme administrateur dans Firestore**:
   ```javascript
   // Dans la collection 'users' du document de l'admin
   isAdmin: true
   ```

2. **Accéder à la page d'administration**:
   - URL: `/admin-moderation`
   - Affichage de tous les signalements en statut "pending"

## Bonnes pratiques

### Pour les utilisateurs

✅ **À FAIRE:**
- Signaler les messages authentiquement problématiques
- Fournir des détails utiles pour aider les modérateurs
- Signaler rapidement pour que les actions soient plus efficaces

❌ **À NE PAS FAIRE:**
- Signaler des messages en désaccord simplement
- Signaler des messages supprimés (autorisés ou non)
- Abuser du système de signalement

### Pour les administrateurs

✅ **À FAIRE:**
- Examiner tous les signalements en attente
- Documenter les raisons des actions prises
- Contacter les utilisateurs concernés si nécessaire
- Archiver les signalements traités

❌ **À NE PAS FAIRE:**
- Supprimer sans examen
- Ignorer les signalements en attente
- Partager les informations des signalements

## Flux de traitement recommandé

1. **Réception** → Vérifier le message signalé
2. **Examen** → Marquer comme "Examiné"
3. **Décision** → 
   - Si infraction: Marquer comme "Action prise" + supprimer le message/avertir l'utilisateur
   - Si valide: Marquer comme "Action prise" + archiver
   - Si non-fondé: Marquer comme "Rejeté" + archiver
4. **Archivage** → Supprimer le rapport de la liste

## Support et questions

Pour plus d'informations ou pour signaler un problème avec le système de modération, contactez l'équipe support.

---

**Dernière mise à jour**: Janvier 2026
**Version**: 1.0
