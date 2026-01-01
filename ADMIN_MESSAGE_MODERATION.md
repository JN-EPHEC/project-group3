# Interface de Modération des Messages - Admin

## Vue d'ensemble

L'interface de modération permet aux **administrateurs** de visualiser, filtrer et modérer **tous les messages** envoyés par les utilisateurs (parents et professionnels) dans l'application, directement depuis le panneau d'administration.

## Accès à l'interface

### Prérequis
- Compte utilisateur marqué comme administrateur dans Firestore
- Property `isAdmin: true` dans la collection `users`

### Navigation
1. Accéder au panneau d'administration via `/admin-moderation`
2. Cliquer sur "**Modération des messages**"

## Fonctionnalités principales

### 1. 📋 Visualisation des messages

Chaque message affiche:
- **Auteur** - Nom de l'utilisateur (parent ou professionnel)
- **Contenu** - Aperçu du texte (limité à 2 lignes)
- **Date/Heure** - Quand le message a été envoyé
- **Médias** - Nombre d'images et de fichiers attachés
- **Statut** - Badge rouge si signalé

### 2. 🔍 Recherche

- Rechercher par **contenu du message**
- Rechercher par **nom d'utilisateur**
- Recherche en temps réel avec preview instantané

### 3. 📊 Filtres

Filtrer les messages par catégorie:

| Filtre | Description |
|--------|-------------|
| 📨 **Tous les messages** | Affiche tous les messages (1000 derniers) |
| 🚩 **Signalés** | Messages déjà marqués comme problématiques par un admin |
| 📷 **Avec images** | Messages contenant des images |
| 📎 **Avec fichiers** | Messages contenant des fichiers attachés |

### 4. 🚩 Actions de modération

#### Signaler un message

1. Cliquer sur le message pour voir les détails
2. Cliquer sur "🚩 Signaler le message"
3. Entrer une raison du signalement
4. Confirmer

**Résultat**: Le message est marqué comme signalé et peut être filtré facilement

#### Désignaler un message

Si un message est déjà signalé:
1. Ouvrir les détails du message
2. Cliquer sur "✓ Désignaler"

**Résultat**: Le message revient à l'état normal

#### Supprimer un message

1. Ouvrir les détails du message
2. Cliquer sur "🗑️ Supprimer le message"
3. Confirmer la suppression

**Résultat**: Le message est supprimé de:
- La conversation
- La collection `allMessages`
- Les recherches futures

### 5. 📱 Détails du message

Cliquer sur un message ouvre un modal montrant:

- **Auteur complet** - Nom et ID utilisateur
- **Contenu texte** - Le message intégral
- **Images** - Liste et aperçu des URLs
- **Fichiers** - Nom et type de chaque fichier
- **Date/Heure** - Timestamp complet
- **Statut de signalement** - Si marqué et raison

## Schéma Firestore

### Collection: `allMessages`

```javascript
{
  messageId: "doc_id",
  conversationId: "conv_123",
  senderId: "user_uid",
  senderName: "Jean Dupont",  // Nom du parent/pro
  text: "Contenu du message...",
  timestamp: Timestamp,
  status: "delivered",
  imageUrls: ["url1", "url2"],      // Optional
  fileUrls: [                        // Optional
    {
      url: "...",
      name: "document.pdf",
      type: "application/pdf"
    }
  ],
  type: "text" | "image" | "file",
  flagged: false,                    // Marqué par admin
  flagReason: "",                    // Raison du signalement
  flaggedAt: Timestamp,              // Quand signalé
  flaggedBy: "admin_uid"             // Qui a signalé
}
```

## Bonnes pratiques de modération

### ✅ À FAIRE

- 📖 Lire le message complet avant d'agir
- 📝 Documenter la raison du signalement
- 🔍 Vérifier le contexte de la conversation
- ⚠️ Signaler avant de supprimer (traçabilité)
- 📧 Contacter l'utilisateur concerné si nécessaire
- 🕐 Traiter les signalements dans les 24h

### ❌ À NE PAS FAIRE

- ❌ Supprimer sans examen
- ❌ Ignorer les signalements utilisateurs
- ❌ Révéler l'identité du signaleur
- ❌ Marquer comme spam les messages légitimes
- ❌ Laisser des messages violents visibles

## Cas d'utilisation

### Exemple 1: Message offensant
1. Voir un message en recherchant "insulte"
2. Ouvrir les détails
3. Cliquer "Signaler le message"
4. Raison: "Contenu offensant envers parent"
5. Supprimer le message

### Exemple 2: Spam/Doublons
1. Filtrer par "Tous les messages"
2. Identifier les messages répétitifs
3. Signaler chacun avec raison "Spam"
4. Supprimer après signalement

### Exemple 3: Audit de sécurité
1. Filtrer par "Avec fichiers"
2. Examiner les types de fichiers
3. Vérifier qu'aucun contenu malveillant n'est partagé
4. Signaler tout fichier suspect

## Intégration avec signalements utilisateurs

Cette interface **complète** le système de signalements utilisateurs:

| Source | Origine | Visibilité |
|--------|---------|-----------|
| **Signalements utilisateurs** | Parents/Pros signalent | `/admin-message-reports` |
| **Modération active** | Admin scanne les messages | `/admin-messages` ← VOUS ÊTES ICI |

Les deux systèmes sont **indépendants** mais peuvent être coordonnés:
- Admin peut signaler avant/après suppression
- Signalements utilisateurs peuvent guider la modération active
- Tous les cas sont documentés

## Performance

- ⚡ Charge limitée à 1000 messages par query
- 🔄 Recherche et filtres en temps réel
- 📊 Interface optimisée pour navigation rapide
- 💾 Données mises en cache efficacement

## Limitations et améliorations futures

### Limitations actuelles

- Pas de pagination (limité à 1000 messages récents)
- Pas d'export de données modérées
- Pas d'historique de modération complèt
- Pas de notifications aux modérateurs

### Améliorations futures possibles

- 📈 Statistiques par utilisateur
- 🔔 Notifications en temps réel de signalements
- 📊 Rapports de modération mensuels
- 🤖 Modération assistée par IA
- ⏮️ Historique complet des modifications
- 👥 Système d'équipe de modération
- 🛡️ Restrictions progressives (avertissements, suspensions)

---

**Dernière mise à jour**: Janvier 2026  
**Version**: 1.0  
**Responsable**: Équipe Modération
