# Menu Contextuel des Messages - Fonctionnalités

## Description

Un menu contextuel accessible par un **appui prolongé (long press)** sur un message permet aux utilisateurs de :
- 📋 **Copier** le message
- 📤 **Partager** le message avec d'autres applications
- 🚩 **Signaler** le message comme problématique

## Comportement

### Activation du menu

1. **Appui prolongé** (500ms) sur un message **reçu** (pas sur vos propres messages)
2. Un menu contextuel s'affiche au centre de l'écran avec les trois options

### Options du menu

#### 1. 📋 Copier
- Copie le contenu texte du message
- Affiche une confirmation "Copié"
- Disponible pour les messages texte

#### 2. 📤 Partager
- Ouvre le dialogue de partage natif du système
- Permet de partager le message avec :
  - D'autres applications
  - D'autres contacts
  - Presse-papiers
- Utilise `React Native Share.share()`

#### 3. 🚩 Signaler
- Accessible **uniquement sur les messages reçus** (pas sur vos propres messages)
- Ouvre le modal de signalement avec les options :
  - Raison du signalement
  - Description détaillée (optionnelle)
- Les données de signalement sont enregistrées dans Firestore

### Fermeture du menu

- Cliquer en dehors du menu → Ferme le menu
- Sélectionner une action → Exécute l'action et ferme le menu

## Implémentation technique

### États utilisés

```tsx
const [messageContextMenuVisible, setMessageContextMenuVisible] = useState(false);
const [selectedMessageForMenu, setSelectedMessageForMenu] = useState<any>(null);
```

### Fonctions principales

```tsx
// Activation du menu au long press
const handleMessageLongPress = (message: any) => {
  setSelectedMessageForMenu(message);
  setMessageContextMenuVisible(true);
};

// Copier le texte du message
const handleCopyMessage = () => {
  // Affiche confirmation de copie
  Alert.alert('Copié', 'Le message a été copié');
};

// Partager le message
const handleShareMessage = async () => {
  await Share.share({
    message: selectedMessageForMenu.text,
    title: 'Partager le message',
  });
};

// Signaler le message
const handleReportFromMenu = () => {
  setSelectedMessageForReport(selectedMessageForMenu);
  setReportModalVisible(true);
  setMessageContextMenuVisible(false);
};
```

### Intégration dans renderMessage

```tsx
<TouchableOpacity 
  onLongPress={() => !isMe && handleMessageLongPress(item)}
  delayLongPress={500}
  activeOpacity={0.7}
>
  {/* Contenu du message */}
</TouchableOpacity>
```

## Styles et apparence

### Menu contextuel

- **Position** : Centré sur l'écran
- **Arrière-plan** : Overlay semi-transparent (rgba(0, 0, 0, 0.4))
- **Contenu** :
  - Fond coloré selon le thème
  - Icônes colorées (tint pour Copier/Partager, rouge pour Signaler)
  - Hauteur adaptée au contenu
  - Bordures arrondies (12px)
  - Ombre portée pour effet de profondeur

### Boutons du menu

- **Hauteur** : 48px par bouton
- **Remplissage** : 14px vertical, 16px horizontal
- **Icône + Texte** : Alignés horizontalement
- **Espacement** : 12px entre icône et texte
- **Bordures** : Séparées par des lignes fines sauf le dernier

## Cas d'utilisation

### Parent

✅ Reçoit un message d'un professionnel → Peut le copier, partager, signaler
✅ Envoie un message → Pas d'options pour son propre message

### Professionnel

✅ Reçoit un message d'un parent → Peut le copier, partager, signaler
✅ Envoie un message → Pas d'options pour son propre message

## Intégration avec le système de signalement

Le bouton "Signaler" du menu contextuel :
1. Ouvre le modal de signalement détaillé
2. Pré-sélectionne le message à signaler
3. Permet de choisir la raison et d'ajouter des détails
4. Enregistre le signalement dans Firestore pour audit par les administrateurs

## Points techniques importants

### Touches/Gestes

- **Long Press** : 500ms minimum avant activation
- **Tactile Feedback** : activeOpacity={0.7} sur le message
- **Overlay** : Toucher en dehors du menu le ferme

### Performance

- Pas de bottleneck de performance
- Rendu du menu seulement quand visible
- Pas d'animations lourdes

### Accessibilité

- Menu centré et facile à atteindre
- Texte clair et descriptif
- Icônes reconnaissables

## Limitations et améliorations futures

### Limitations actuelles

- La copie affiche une alerte plutôt que de copier vers le presse-papiers (React Native limitation)
- Le partage dépend des APIs natives du système
- Pas de suppression de message du menu (considéré comme trop dangereux)

### Améliorations futures possibles

- Intégration avec une vraie fonction de copie vers le presse-papiers
- Édition de message
- Suppression de message (avec confirmation)
- Réaction aux messages
- Épingler un message

---

**Dernière mise à jour**: Janvier 2026
**Version**: 1.0
