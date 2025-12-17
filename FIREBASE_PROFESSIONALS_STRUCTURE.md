# Firebase Structure - Professionnels

## Collections Firestore

### 1. Collection `professionals`

Cette collection contient les profils des professionnels (avocats et psychologues) qui utilisent l'application.

#### Structure du document :
```javascript
{
  userId: string,           // ID de l'utilisateur Firebase Auth
  email: string,            // Email du professionnel
  firstName: string,        // Prénom
  lastName: string,         // Nom
  type: string,            // 'avocat' ou 'psychologue'
  address: string,         // Adresse professionnelle (ex: "Paris, 75008")
  phone: string,           // Numéro de téléphone (ex: "+33 1 23 45 67 89")
  specialty: string,       // Spécialité (ex: "Droit de la Famille", "Psychologie Familiale")
  description: string,     // Description du professionnel et de ses services
  availability: {          // Créneaux horaires structurés par jour
    lundi: {
      isOpen: boolean,   // Le professionnel travaille-t-il ce jour ?
      slots: [           // Liste des créneaux horaires
        {
          start: string, // Heure de début (ex: "09:00")
          end: string,   // Heure de fin (ex: "10:00")
          available: boolean // Créneau disponible pour réservation ?
        }
      ]
    },
    // ... même structure pour mardi, mercredi, etc.
  },
  updatedAt: timestamp     // Date de dernière mise à jour
}
```

#### Exemple de document :
```javascript
{
  userId: "abc123xyz",
  email: "marie.dubois@cabinet.fr",
  firstName: "Marie",
  lastName: "Dubois",
  type: "avocat",
  address: "Paris, 75008",
  phone: "+33 1 23 45 67 89",
  specialty: "Droit de la Famille",
  description: "Spécialisée en droit de la famille avec 15 ans d'expérience...",
  availability: {
    lundi: {
      isOpen: true,
      slots: [
        { start: "09:00", end: "10:00", available: true },
        { start: "10:00", end: "11:00", available: true },
        { start: "11:00", end: "12:00", available: true },
        { start: "14:00", end: "15:00", available: true },
        { start: "15:00", end: "16:00", available: true },
        { start: "16:00", end: "17:00", available: true },
        { start: "17:00", end: "18:00", available: true }
      ]
    },
    mardi: {
      isOpen: true,
      slots: [
        { start: "09:00", end: "10:00", available: true },
        { start: "10:00", end: "11:00", available: true },
        // ... autres créneaux
      ]
    },
    // ... autres jours
    samedi: {
      isOpen: false,
      slots: []
    },
    dimanche: {
      isOpen: false,
      slots: []
    }
  },
  updatedAt: Timestamp
}
```

### 2. Collection `users` - Rôles

Le document utilisateur doit inclure le rôle 'professionnel' dans le tableau `roles` :

```javascript
{
  email: string,
  firstName: string,
  lastName: string,
  roles: ['professionnel'],  // ou ['parent', 'professionnel'] pour dual role
  familyIds: []              // Vide pour les professionnels purs
}
```

### 3. Collection `appointments`

Cette collection stocke les demandes de rendez-vous entre parents et professionnels.

#### Structure :
```javascript
{
  userId: string,              // ID du parent qui demande le rendez-vous
  professionalId: string,      // ID du professionnel
  professionalName: string,    // Nom du professionnel
  professionalType: string,    // 'avocat' ou 'psychologue'
  status: string,              // 'pending', 'confirmed', 'cancelled', 'completed'
  createdAt: timestamp,        // Date de création
  appointmentDate: timestamp,  // Date du rendez-vous (optionnel au début)
  notes: string                // Notes additionnelles (optionnel)
}
```

### 4. Collection `conversations`

Conversations entre parents et professionnels (existante, étendue pour les professionnels).

#### Structure mise à jour :
```javascript
{
  participants: [string],      // IDs des participants (parent et autres)
  professionalId: string,      // ID du professionnel (nouveau champ)
  professionalName: string,    // Nom du professionnel (nouveau champ)
  professionalType: string,    // Type du professionnel (nouveau champ)
  createdAt: timestamp,
  lastMessage: string,
  lastMessageTime: timestamp
}
```

## Fonctions Helper disponibles

Le fichier `constants/professionalHelpers.js` fournit les fonctions suivantes :

### `createOrUpdateProfessionalProfile(uid, profileData)`
Crée ou met à jour le profil d'un professionnel.

```javascript
const result = await createOrUpdateProfessionalProfile(uid, {
  firstName: "Marie",
  lastName: "Dubois",
  email: "marie.dubois@cabinet.fr",
  type: "avocat",
  address: "Paris, 75008",
  phone: "+33 1 23 45 67 89",
  specialty: "Droit de la Famille",
  description: "Spécialisée en droit de la famille..."
});
```

### `getProfessionalProfile(uid)`
Récupère le profil d'un professionnel par son ID.

```javascript
const result = await getProfessionalProfile(uid);
if (result.success) {
  console.log(result.data);
}
```

### `getProfessionalsByType(type)`
Récupère tous les professionnels d'un type spécifique.

```javascript
const avocats = await getProfessionalsByType('avocat');
const psychologues = await getProfessionalsByType('psychologue');
```

### `getAllProfessionals()`
Récupère tous les professionnels de l'application.

```javascript
const result = await getAllProfessionals();
if (result.success) {
  const professionals = result.data; // Tableau de professionnels
}
```

### `assignProfessionalRole(uid, type)`
Assigne le rôle de professionnel à un utilisateur.

```javascript
await assignProfessionalRole(uid, 'avocat');
```

### `isProfessional(uid)`
Vérifie si un utilisateur a un profil professionnel.

```javascript
const isPro = await isProfessional(uid);
```

## Règles de sécurité Firestore (à implémenter)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Professionals collection
    match /professionals/{professionalId} {
      // Allow read to all authenticated users (so parents can see professionals)
      allow read: if request.auth != null;
      
      // Allow write only to the professional themselves
      allow write: if request.auth != null && request.auth.uid == professionalId;
    }
    
    // Appointments collection
    match /appointments/{appointmentId} {
      // Allow users to read their own appointments
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         request.auth.uid == resource.data.professionalId);
      
      // Allow users to create appointments for themselves
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
      
      // Allow professionals to update appointments
      allow update: if request.auth != null && 
        request.auth.uid == resource.data.professionalId;
    }
    
    // Conversations with professionals
    match /conversations/{conversationId} {
      allow read: if request.auth != null && 
        (request.auth.uid in resource.data.participants || 
         request.auth.uid == resource.data.professionalId);
      
      allow create: if request.auth != null;
      
      allow update: if request.auth != null && 
        (request.auth.uid in resource.data.participants || 
         request.auth.uid == resource.data.professionalId);
    }
  }
}
```

## Flux de travail

### 1. Enregistrement d'un professionnel

1. L'utilisateur s'inscrit normalement via le système d'authentification
2. Il sélectionne "Professionnel" comme type d'utilisateur
3. Dans l'écran de sélection du type de professionnel (à créer), il choisit "Avocat" ou "Psychologue"
4. Appeler `assignProfessionalRole(uid, type)` pour créer le profil professionnel
5. L'utilisateur est redirigé vers l'interface professionnelle

### 2. Modification du profil professionnel

1. Le professionnel accède à l'onglet "Profil" dans l'interface pro (`app/(pro-tabs)/profil.tsx`)
2. Il clique sur l'icône "crayon" à côté de la section qu'il veut modifier
3. Un modal s'ouvre avec les champs éditables
4. À la sauvegarde, les données sont envoyées à Firebase via `setDoc(..., { merge: true })`
5. Le profil est mis à jour instantanément dans l'interface ET dans la collection `professionals`

### 3. Parents recherchant des professionnels

1. Les parents accèdent à l'onglet "Aide" (`app/(tabs)/Aide.tsx`)
2. Ils sélectionnent le type de professionnel (Avocat ou Psychologue)
3. La liste des professionnels de ce type est chargée depuis Firebase
4. Ils peuvent cliquer sur un professionnel pour voir ses détails
5. Ils peuvent :
   - Contacter le professionnel (crée une conversation)
   - Prendre rendez-vous (crée un appointment)

## Initialisation de test

Pour tester avec des données de démonstration, vous pouvez créer manuellement des documents dans la console Firebase :

1. Allez dans Firestore Database
2. Créez la collection `professionals`
3. Ajoutez un document avec la structure ci-dessus
4. Le professionnel apparaîtra automatiquement dans l'onglet Aide

Ou utilisez la fonction helper depuis le code :

```javascript
import { createOrUpdateProfessionalProfile } from '@/constants/professionalHelpers';

// Dans un useEffect ou une fonction async
await createOrUpdateProfessionalProfile('USER_ID_HERE', {
  firstName: 'Marie',
  lastName: 'Dubois',
  email: 'marie.dubois@cabinet.fr',
  type: 'avocat',
  address: 'Paris, 75008',
  phone: '+33 1 23 45 67 89',
  specialty: 'Droit de la Famille',
  description: 'Spécialisée en droit de la famille avec 15 ans d\'expérience.',
  availability: {
    lundi: '9h - 18h',
    mardi: '9h - 18h',
    mercredi: '9h - 17h',
    jeudi: '9h - 18h',
    vendredi: '9h - 17h',
    samedi: 'Sur rendez-vous',
    dimanche: 'Fermé'
  }
});
```
