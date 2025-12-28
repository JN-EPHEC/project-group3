/**
 * Script de Configuration Automatique Backend
 * 
 * Ce script vérifie et configure automatiquement le backend:
 * - Vérifie les variables d'environnement
 * - Vérifie serviceAccountKey.json
 * - Aide à remplir les valeurs manquantes
 * - Teste la connexion Firebase
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔧 Configuration Backend Stripe + Firebase\n');
console.log('===========================================\n');

// Chemins (un seul .env centralisé à la racine)
const envPath = path.join(__dirname, '..', '.env');
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

// Étape 1: Vérifier .env existe (racine)
console.log('📋 Étape 1: Vérification du fichier .env (racine)');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env introuvable à la racine du projet');
  console.log('   Chemin attendu:', envPath);
  process.exit(1);
}
console.log('✅ .env trouvé\n');

// Étape 2: Lire .env
console.log('📋 Étape 2: Lecture de .env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};

envContent.split('\n').forEach(line => {
  // Ignorer les commentaires et lignes vides
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (key && value) {
        env[key] = value;
      }
    }
  }
});

// Variables requises
const requiredVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'PRICE_MONTHLY_ID',
  'PRICE_YEARLY_ID',
  'FIREBASE_PROJECT_ID',
];

const missingVars = [];
const placeholderVars = [];

requiredVars.forEach(varName => {
  if (!env[varName]) {
    missingVars.push(varName);
  } else if (env[varName].includes('xxxxx') || env[varName].includes('REMPLACER')) {
    placeholderVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.log('❌ Variables manquantes:');
  missingVars.forEach(v => console.log(`   - ${v}`));
  console.log('');
} else if (placeholderVars.length > 0) {
  console.log('⚠️  Variables à remplir:');
  placeholderVars.forEach(v => console.log(`   - ${v}: ${env[v]}`));
  console.log('');
} else {
  console.log('✅ Toutes les variables sont remplies\n');
}

// Étape 3: Vérifier serviceAccountKey.json
console.log('📋 Étape 3: Vérification serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.log('❌ serviceAccountKey.json introuvable');
  console.log('');
  console.log('🔧 Comment l\'obtenir:');
  console.log('   1. Aller à: https://console.firebase.google.com');
  console.log('   2. Sélectionner votre projet');
  console.log('   3. Settings ⚙️ → Service Accounts');
  console.log('   4. Cliquer "Generate new private key"');
  console.log('   5. Sauvegarder en tant que: backend/serviceAccountKey.json');
  console.log('');
  process.exit(1);
} else {
  console.log('✅ serviceAccountKey.json existe');
  
  // Lire le contenu
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    
    // Vérifier les champs requis
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      console.log('❌ serviceAccountKey.json invalide - champs manquants');
      process.exit(1);
    }
    
    console.log(`   Project ID: ${serviceAccount.project_id}`);
    console.log(`   Client Email: ${serviceAccount.client_email}`);
    console.log('');
    
    // Vérifier si .env correspond
    console.log('📋 Étape 4: Synchronisation .env ↔ serviceAccountKey.json');
    
    let needsUpdate = false;
    let newEnvContent = envContent;
    
    if (env.FIREBASE_PROJECT_ID !== serviceAccount.project_id) {
      console.log(`⚠️  FIREBASE_PROJECT_ID différent:`);
      console.log(`   .env: ${env.FIREBASE_PROJECT_ID}`);
      console.log(`   serviceAccountKey.json: ${serviceAccount.project_id}`);
      console.log(`   → Mise à jour en cours...`);
      
      newEnvContent = newEnvContent.replace(
        /FIREBASE_PROJECT_ID=.*/,
        `FIREBASE_PROJECT_ID=${serviceAccount.project_id}`
      );
      needsUpdate = true;
    }
    
    if (!env.FIREBASE_PRIVATE_KEY || env.FIREBASE_PRIVATE_KEY.includes('REMPLACER')) {
      console.log(`⚠️  FIREBASE_PRIVATE_KEY manquant`);
      console.log(`   → Mise à jour en cours...`);
      
      const privateKey = serviceAccount.private_key.replace(/\n/g, '\\n');
      newEnvContent = newEnvContent.replace(
        /FIREBASE_PRIVATE_KEY=.*/,
        `FIREBASE_PRIVATE_KEY="${privateKey}"`
      );
      needsUpdate = true;
    }
    
    if (!env.FIREBASE_CLIENT_EMAIL || env.FIREBASE_CLIENT_EMAIL.includes('REMPLACER')) {
      console.log(`⚠️  FIREBASE_CLIENT_EMAIL manquant`);
      console.log(`   → Mise à jour en cours...`);
      
      newEnvContent = newEnvContent.replace(
        /FIREBASE_CLIENT_EMAIL=.*/,
        `FIREBASE_CLIENT_EMAIL=${serviceAccount.client_email}`
      );
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      fs.writeFileSync(envPath, newEnvContent, 'utf8');
      console.log('✅ .env mis à jour avec les valeurs de serviceAccountKey.json\n');
    } else {
      console.log('✅ .env et serviceAccountKey.json synchronisés\n');
    }
    
  } catch (error) {
    console.log('❌ Erreur lors de la lecture de serviceAccountKey.json:', error.message);
    process.exit(1);
  }
}

// Étape 5: Récapitulatif
console.log('📋 Étape 5: Récapitulatif Configuration');
console.log('=========================================\n');

console.log('Stripe:');
console.log(`  Secret Key: ${env.STRIPE_SECRET_KEY?.substring(0, 20)}...`);
console.log(`  Webhook Secret: ${env.STRIPE_WEBHOOK_SECRET?.substring(0, 15)}...`);
console.log(`  Monthly Price: ${env.PRICE_MONTHLY_ID}`);
console.log(`  Yearly Price: ${env.PRICE_YEARLY_ID}`);
console.log('');

console.log('Firebase:');
console.log(`  Project ID: ${env.FIREBASE_PROJECT_ID}`);
console.log(`  Client Email: ${env.FIREBASE_CLIENT_EMAIL}`);
console.log(`  Private Key: ${env.FIREBASE_PRIVATE_KEY ? '✅ Configuré' : '❌ Manquant'}`);
console.log('');

console.log('Server:');
console.log(`  Port: ${env.PORT || 3000}`);
console.log(`  Host: ${env.HOST || '0.0.0.0'}`);
console.log(`  Environment: ${env.NODE_ENV || 'development'}`);
console.log('');

// Vérifier si prêt à démarrer
if (missingVars.length === 0 && placeholderVars.length === 0 && fs.existsSync(serviceAccountPath)) {
  console.log('✅ Configuration complète!');
  console.log('');
  console.log('🚀 Prochaines étapes:');
  console.log('   1. Installer les dépendances: npm install');
  console.log('   2. Démarrer le serveur: npm run dev');
  console.log('   3. Tester: curl http://localhost:3000/health');
  console.log('   4. Tester Firebase: curl http://localhost:3000/test-firebase');
  console.log('');
} else {
  console.log('⚠️  Configuration incomplète');
  console.log('');
  console.log('🔧 Actions requises:');
  if (missingVars.length > 0) {
    console.log('   - Remplir les variables manquantes dans .env');
  }
  if (placeholderVars.length > 0) {
    console.log('   - Remplacer les valeurs placeholder dans .env');
  }
  if (!fs.existsSync(serviceAccountPath)) {
    console.log('   - Télécharger serviceAccountKey.json depuis Firebase Console');
  }
  console.log('');
  console.log('   Puis relancer: node setup-backend.js');
  console.log('');
}
