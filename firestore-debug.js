/**
 * 🔍 Script de Vérification Firestore
 * Copier-coller dans: Firebase Console → Firestore → Query
 * 
 * Cela vérifie que les champs d'abonnement sont correctement synchronisés
 */

// ============================================
// 1. Vérifier un utilisateur spécifique
// ============================================
// À utiliser dans la Firebase Admin Console ou un cloud function
async function checkUserSubscription(userId) {
  const db = require('firebase-admin').firestore();
  
  console.log(`\n🔍 Vérification utilisateur: ${userId}`);
  console.log('═'.repeat(50));
  
  const userDoc = await db.collection('users').doc(userId).get();
  
  if (!userDoc.exists) {
    console.error(`❌ Utilisateur non trouvé: ${userId}`);
    return;
  }
  
  const user = userDoc.data();
  
  console.log('\n📊 Champs d\'abonnement:');
  console.log({
    stripeCustomerId: user.stripeCustomerId || '❌ Manquant',
    subscriptionId: user.subscriptionId || '❌ Manquant',
    subscriptionStatus: user.subscriptionStatus || '❌ Manquant',
    currentPeriodEnd: user.currentPeriodEnd ? new Date(user.currentPeriodEnd.seconds * 1000).toLocaleDateString() : '❌ Manquant',
    trialEnd: user.trialEnd ? new Date(user.trialEnd.seconds * 1000).toLocaleDateString() : '❌ Manquant',
    cancelAtPeriodEnd: user.cancelAtPeriodEnd ?? '❌ Manquant',
    lastPaymentFailed: user.lastPaymentFailed ?? '❌ Manquant',
    subscriptionUpdatedAt: user.subscriptionUpdatedAt ? new Date(user.subscriptionUpdatedAt.seconds * 1000).toLocaleString() : '❌ Manquant',
  });
  
  console.log('\n✅ Vérifications:');
  const checks = {
    'Stripe Customer ID existe': !!user.stripeCustomerId,
    'Subscription ID existe': !!user.subscriptionId,
    'Status est défini': !!user.subscriptionStatus,
    'Statut est "active" ou "trialing"': ['active', 'trialing'].includes(user.subscriptionStatus),
    'Période d\'essai définie': !!user.trialEnd,
    'Pas en défaut de paiement': !user.lastPaymentFailed,
  };
  
  Object.entries(checks).forEach(([check, result]) => {
    console.log(`  ${result ? '✅' : '❌'} ${check}`);
  });
  
  return user;
}

// ============================================
// 2. Compter les utilisateurs par statut
// ============================================
async function countBySubscriptionStatus() {
  const db = require('firebase-admin').firestore();
  
  console.log('\n📊 Statistiques d\'abonnement:');
  console.log('═'.repeat(50));
  
  const stats = {
    active: 0,
    trialing: 0,
    canceled: 0,
    past_due: 0,
    none: 0,
  };
  
  const snapshot = await db.collection('users').get();
  
  snapshot.forEach(doc => {
    const status = doc.data().subscriptionStatus || 'none';
    if (status in stats) {
      stats[status]++;
    }
  });
  
  console.log('\nPar statut:');
  Object.entries(stats).forEach(([status, count]) => {
    const emoji = {
      'active': '✅',
      'trialing': '⏳',
      'canceled': '❌',
      'past_due': '⚠️',
      'none': '⭕',
    }[status] || '❓';
    console.log(`  ${emoji} ${status.padEnd(12)}: ${count}`);
  });
  
  const totalWithSub = Object.values(stats).reduce((a, b) => a + b) - stats.none;
  console.log(`\nTotal utilisateurs: ${snapshot.size}`);
  console.log(`Total avec abonnement: ${totalWithSub}`);
  console.log(`Taux de conversion: ${((totalWithSub / snapshot.size) * 100).toFixed(1)}%`);
}

// ============================================
// 3. Trouver les utilisateurs avec erreurs
// ============================================
async function findProblems() {
  const db = require('firebase-admin').firestore();
  
  console.log('\n🔴 Utilisateurs avec problèmes:');
  console.log('═'.repeat(50));
  
  const snapshot = await db.collection('users').get();
  const problems = [];
  
  snapshot.forEach(doc => {
    const user = doc.data();
    const issues = [];
    
    // Problème 1: Stripe ID manquant mais abonnement défini
    if (!user.stripeCustomerId && user.subscriptionStatus) {
      issues.push('❌ stripeCustomerId manquant');
    }
    
    // Problème 2: Subscription ID manquant mais status défini
    if (!user.subscriptionId && user.subscriptionStatus && user.subscriptionStatus !== 'none') {
      issues.push('❌ subscriptionId manquant');
    }
    
    // Problème 3: En défaut de paiement
    if (user.lastPaymentFailed) {
      issues.push('⚠️  lastPaymentFailed = true');
    }
    
    // Problème 4: Période d'essai expirée mais pas d'infos de période
    if (user.subscriptionStatus === 'trialing' && !user.trialEnd) {
      issues.push('❌ trialEnd manquant');
    }
    
    // Problème 5: Pas de current period end
    if (user.subscriptionStatus === 'active' && !user.currentPeriodEnd) {
      issues.push('❌ currentPeriodEnd manquant');
    }
    
    if (issues.length > 0) {
      problems.push({
        uid: doc.id,
        email: user.email,
        issues: issues,
      });
    }
  });
  
  if (problems.length === 0) {
    console.log('✅ Aucun problème détecté!');
  } else {
    console.log(`\n🔴 ${problems.length} utilisateur(s) avec problèmes:\n`);
    problems.forEach(p => {
      console.log(`  👤 ${p.email} (${p.uid})`);
      p.issues.forEach(issue => {
        console.log(`     ${issue}`);
      });
    });
  }
  
  return problems;
}

// ============================================
// 4. Exporter les données pour debug
// ============================================
async function exportDebugData(userId) {
  const db = require('firebase-admin').firestore();
  
  console.log('\n📥 Export pour debug:');
  console.log('═'.repeat(50));
  
  const user = await db.collection('users').doc(userId).get();
  
  if (!user.exists) {
    console.error(`❌ Utilisateur non trouvé: ${userId}`);
    return;
  }
  
  const data = {
    timestamp: new Date().toISOString(),
    userId: userId,
    userData: user.data(),
  };
  
  console.log(JSON.stringify(data, null, 2));
  console.log('\n💡 Copier ce JSON pour le support technique');
  
  return data;
}

// ============================================
// Utilisation
// ============================================

// Vérifier un utilisateur:
// checkUserSubscription('user-id-here')

// Voir les stats:
// countBySubscriptionStatus()

// Trouver les problèmes:
// findProblems()

// Exporter pour debug:
// exportDebugData('user-id-here')

console.log(`
🔍 Script de vérification Firestore chargé!

Fonctions disponibles:
  1. checkUserSubscription('uid')      → Vérifie un utilisateur
  2. countBySubscriptionStatus()       → Compter par statut
  3. findProblems()                    → Trouver les problèmes
  4. exportDebugData('uid')            → Exporter pour debug

Exemple:
  checkUserSubscription('user123')
`);
