/**
 * RGPD maintenance job
 * - Anonymises disabled professional accounts after 180 days
 * - Keeps only the last 14 daily backups in the backup bucket
 *
 * Schedule suggestion: run daily at 02:00 via OS cron or a hosted scheduler.
 */
import admin, { db } from './firebase-admin';

const DISABLED_AFTER_DAYS = 180;
const BACKUP_RETENTION_DAYS = 14;
const BACKUP_PREFIX = 'backups/daily-';
const BACKUP_BUCKET = process.env.BACKUP_BUCKET;

async function anonymizeProfessional(uid: string) {
  const anonymizedAt = admin.firestore.FieldValue.serverTimestamp();
  const placeholderEmail = `anonymized-${uid}@wekid.local`;

  await db.collection('professionals').doc(uid).set({
    accountStatus: 'anonymized',
    anonymizedAt,
    address: null,
    phone: null,
    specialty: null,
    description: null,
    availability: {},
    photoUrl: null,
    diplomaUrl: null,
    rgpdConsent: {
      accepted: false,
      anonymized: true,
      anonymizedAt,
    },
  }, { merge: true });

  await db.collection('users').doc(uid).set({
    anonymized: true,
    anonymizedAt,
    email: placeholderEmail,
    firstName: 'Utilisateur',
    lastName: 'Anonymisé',
    phone: null,
    address: null,
    roles: [],
    professional_id: null,
    parent_id: null,
    accountStatus: 'anonymized',
  }, { merge: true });

  try {
    await admin.auth().deleteUser(uid);
  } catch (error) {
    console.warn(`[RGPD] Impossible de supprimer l'utilisateur Auth ${uid}:`, error);
  }
}

async function processDisabledProfessionals() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DISABLED_AFTER_DAYS);
  const cutoffTs = admin.firestore.Timestamp.fromDate(cutoffDate);

  const snap = await db.collection('professionals')
    .where('accountStatus', '==', 'disabled')
    .where('disabledAt', '<=', cutoffTs)
    .get();

  console.log(`[RGPD] Comptes désactivés trouvés: ${snap.size}`);

  for (const doc of snap.docs) {
    console.log(`[RGPD] Anonymisation ${doc.id}`);
    await anonymizeProfessional(doc.id);
  }
}

async function pruneBackups() {
  if (!BACKUP_BUCKET) {
    console.log('[RGPD] BACKUP_BUCKET non configuré, saut de la purge');
    return;
  }

  const bucket = admin.storage().bucket(BACKUP_BUCKET);
  const [files] = await bucket.getFiles({ prefix: BACKUP_PREFIX });

  if (!files || files.length <= BACKUP_RETENTION_DAYS) {
    console.log('[RGPD] Aucune purge nécessaire');
    return;
  }

  const sorted = files.sort((a, b) => {
    const aDate = new Date(a.metadata.updated || a.metadata.timeCreated || Date.now());
    const bDate = new Date(b.metadata.updated || b.metadata.timeCreated || Date.now());
    return bDate.getTime() - aDate.getTime();
  });

  const toDelete = sorted.slice(BACKUP_RETENTION_DAYS);
  for (const file of toDelete) {
    console.log(`[RGPD] Suppression ancien backup ${file.name}`);
    await file.delete();
  }
}

async function run() {
  try {
    await processDisabledProfessionals();
    await pruneBackups();
    console.log('[RGPD] Traitement terminé');
    process.exit(0);
  } catch (error) {
    console.error('[RGPD] Erreur lors du traitement:', error);
    process.exit(1);
  }
}

run();
