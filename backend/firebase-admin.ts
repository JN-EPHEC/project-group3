/**
 * Firebase Admin SDK Initialization
 * 
 * Ce fichier initialise Firebase Admin SDK pour les opérations backend.
 * Il est utilisé par les webhooks Stripe pour synchroniser les données avec Firestore.
 * 
 * Configuration requise :
 * 1. Télécharger serviceAccountKey.json depuis Firebase Console
 * 2. Placer dans backend/serviceAccountKey.json
 * 3. Configurer les variables d'environnement dans .env
 */

import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement depuis la racine du projet
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Chemin vers le fichier de clé de compte de service
const serviceAccountPath = path.join(__dirname, './serviceAccountKey.json');

// Vérifier que le fichier existe
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ serviceAccountKey.json introuvable!');
  console.error('📂 Chemin attendu:', serviceAccountPath);
  console.error('');
  console.error('🔧 Comment obtenir ce fichier :');
  console.error('   1. Aller à Firebase Console: https://console.firebase.google.com');
  console.error('   2. Sélectionner votre projet');
  console.error('   3. Settings ⚙️ → Service Accounts');
  console.error('   4. Cliquer "Generate new private key"');
  console.error('   5. Sauvegarder en tant que: backend/serviceAccountKey.json');
  console.error('');
  process.exit(1);
}

// Lire et parser le fichier de clé
let serviceAccount: any;
try {
  const serviceAccountData = fs.readFileSync(serviceAccountPath, 'utf8');
  serviceAccount = JSON.parse(serviceAccountData);
} catch (error: any) {
  console.error('❌ Erreur lors de la lecture de serviceAccountKey.json:', error.message);
  process.exit(1);
}

// Vérifier les champs requis
if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
  console.error('❌ serviceAccountKey.json invalide - champs requis manquants');
  console.error('Le fichier doit contenir: project_id, private_key, client_email');
  process.exit(1);
}

// Initialiser Firebase Admin (une seule fois)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    console.log('✅ Firebase Admin initialisé avec succès');
    console.log(`📦 Project ID: ${serviceAccount.project_id}`);
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'initialisation de Firebase Admin:', error.message);
    process.exit(1);
  }
} else {
  console.log('ℹ️  Firebase Admin déjà initialisé');
}

// Exporter les instances Firestore et Auth
export const db = admin.firestore();
export const auth = admin.auth();
export const adminApp = admin.app();

// Configuration Firestore pour de meilleures performances
db.settings({
  ignoreUndefinedProperties: true, // Ignore les propriétés undefined (évite les erreurs)
});

// Fonction utilitaire pour obtenir un timestamp Firestore
export const timestamp = () => admin.firestore.Timestamp.now();

// Fonction utilitaire pour convertir une date en timestamp Firestore
export const dateToTimestamp = (date: Date) => admin.firestore.Timestamp.fromDate(date);

// Exporter admin pour les cas avancés
export default admin;

console.log('🚀 Firebase Admin SDK prêt à l\'emploi');
