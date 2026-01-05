import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import {
    createUserWithEmailAndPassword,
    deleteUser as fbDeleteUser,
    signOut as fbSignOut,
    getAuth,
    sendEmailVerification,
    signInWithEmailAndPassword
} from 'firebase/auth';
// Avoid static import of react-native auth entry to prevent bundler issues
// We'll require the RN helpers at runtime on native platforms
// import { initializeAuth, getReactNativePersistence } from 'firebase/auth/react-native';
import {
    addDoc,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where
} from 'firebase/firestore';
import {
    deleteObject,
    getDownloadURL,
    getStorage,
    ref,
    uploadBytes
} from 'firebase/storage';
import { Platform } from 'react-native';

import firebaseConfig from './firebaseenv.js';

const RGPD_VERSION = '2024-12-06';
const RGPD_PRIVACY_URL = 'https://wekid.be/politique-de-confidentialite';
// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Use persistent storage for React Native, fall back to web
let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    const rnAuth = require('firebase/auth');
    const initializeAuthRn = rnAuth.initializeAuth;
    const getReactNativePersistenceRn = rnAuth.getReactNativePersistence;
    if (initializeAuthRn && getReactNativePersistenceRn) {
      auth = initializeAuthRn(app, {
        persistence: getReactNativePersistenceRn(AsyncStorage),
      });
    } else {
      // Fallback to default web-style auth if RN helpers unavailable
      auth = getAuth(app);
    }
  } catch (e) {
    auth = getAuth(app);
  }
}
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };

// Helpers to allow same account to be used on both interfaces (parent / professionnel)

/**
 * Sign in and ensure a user profile exists in Firestore.
 * Returns { user, roles, familyId }.
 */
export async function signIn(email, password) {
  const res = await signInWithEmailAndPassword(auth, email, password);
  const uid = res.user.uid;

  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      email,
      roles: [],
      familyIds: [],
      parent_id: null,
      professional_id: null,
    });
  }

  const updated = await getDoc(userRef);
  const data = updated.data() || {};

  // Normalize legacy userType into explicit ids
  const parentId = data.parent_id ?? (data.userType === 'parent' ? uid : null);
  const professionalId = data.professional_id ?? (data.userType === 'professionnel' ? uid : null);

  // Backfill missing ids once
  if (data.parent_id === undefined || data.professional_id === undefined) {
    await updateDoc(userRef, {
      parent_id: parentId,
      professional_id: professionalId,
    });
  }

  // Support pour ancienne structure (familyId) et nouvelle (familyIds)
  let familyIds = data.familyIds || [];
  if (data.familyId && !familyIds.includes(data.familyId)) {
    familyIds = [data.familyId, ...familyIds];
  }
  const dualRole = !!parentId && !!professionalId;
  return { user: res.user, roles: data.roles || [], familyIds, parentId, professionalId, dualRole };
}

/**
 * Sign up: create Auth user + users/{uid} document with initial role and no family.
 * Returns { user, roles, familyId }.
 */
export async function signUp(email, password, role = 'parent') {
  const res = await createUserWithEmailAndPassword(auth, email, password);
  const uid = res.user.uid;

  // Envoi de l'email de vérification
  try {
    await sendEmailVerification(res.user);
    console.log('✅ Email de vérification envoyé à:', email);
  } catch (emailError) {
    console.error('❌ Erreur lors de l\'envoi de l\'email de vérification:', emailError.message);
  }

  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    email,
    roles: [role],
    familyIds: [],
    parent_id: role === 'parent' ? uid : null,
    professional_id: role === 'professionnel' ? uid : null,
    userType: role,
  });

  return {
    user: res.user,
    roles: [role],
    familyIds: [],
    parentId: role === 'parent' ? uid : null,
    professionalId: role === 'professionnel' ? uid : null,
    dualRole: false,
  };
}

/**
 * Get roles for a user (returns array).
 */
export async function getUserRoles(uid) {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? (snap.data().roles || []) : [];
}

/**
 * Get the family document for a user (returns family doc data or null).
 * Retourne la première famille pour rétrocompatibilité.
 */
export async function getUserFamily(uid) {
  const families = await getUserFamilies(uid);
  return families.length > 0 ? families[0] : null;
}

/**
 * Get all families for a user (returns array of family docs).
 */
export async function getUserFamilies(uid) {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  const data = snap.exists() ? snap.data() : null;
  if (!data) return [];
  
  // Support ancienne structure (familyId unique)
  let familyIds = data.familyIds || [];
  if (data.familyId && !familyIds.includes(data.familyId)) {
    familyIds = [data.familyId, ...familyIds];
  }
  
  if (familyIds.length === 0) return [];
  
  const families = [];
  for (const familyId of familyIds) {
    const familyRef = doc(db, 'families', familyId);
    const familySnap = await getDoc(familyRef);
    if (familySnap.exists()) {
      families.push({ id: familySnap.id, ...familySnap.data() });
    }
  }
  return families;
}

/**
 * Create a family for a user and attach the familyId to the user.
 * Generates a unique 6-character alphanumeric code.
 * Returns { familyId, code }.
 */
export async function createFamilyForUser(uid) {
  const familiesCol = collection(db, 'families');

  // small helper to make a code
  function makeCode() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // avoid confusing chars
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  // ensure code uniqueness (simple loop - fine for small scale)
  let code;
  let exists = true;
  while (exists) {
    code = makeCode();
    const q = query(familiesCol, where('code', '==', code));
    const snaps = await getDocs(q);
    exists = !snaps.empty;
  }

  const familyDocRef = await addDoc(familiesCol, {
    code,
    members: [uid],
    createdAt: new Date()
  });

  // attach familyId to user's familyIds array
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { familyIds: arrayUnion(familyDocRef.id) });

  return { familyId: familyDocRef.id, code };
}

/**
 * Join a family by code: adds user to family.members and sets user's familyId.
 * Returns the family doc data if success, or null if code not found.
 */
export async function joinFamilyByCode(uid, code) {
  const familiesCol = collection(db, 'families');
  const q = query(familiesCol, where('code', '==', code));
  const snaps = await getDocs(q);
  if (snaps.empty) return null;

  const familySnap = snaps.docs[0];
  const familyRef = doc(db, 'families', familySnap.id);

  // add user to members array
  await updateDoc(familyRef, { members: arrayUnion(uid) });

  // add familyId to user's familyIds array
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { familyIds: arrayUnion(familyRef.id) });

  const updatedFamilySnap = await getDoc(familyRef);
  return { id: familyRef.id, ...updatedFamilySnap.data() };
}

/**
 * Set or replace the roles array for a user.
 * Example roles: ["parent"], ["professionnel"], or ["parent","professionnel"]
 */
export async function setUserRoles(uid, rolesArray) {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, { roles: rolesArray }, { merge: true });
}

/**
 * Sign out wrapper.
 */
export async function signOut() {
  try {
    console.log('signOut function called');
    await fbSignOut(auth);
    console.log('Firebase signOut successful');
  } catch (error) {
    console.error('Error in signOut:', error);
    throw error;
  }
}

// Nouveau helper : sign in + indique si l'utilisateur parent doit passer par l'écran "family code".
export async function signInAndCheck(email, password) {
  const result = await signIn(email, password); // { user, roles, familyIds }
  const roles = result.roles || [];
  const familyIds = result.familyIds || [];
  const needsFamilyCode = roles.includes('parent') && familyIds.length === 0;
  return { ...result, needsFamilyCode };
}

/**
 * Leave a family: removes user from family members and removes familyId from user's familyIds.
 */
export async function leaveFamilyById(uid, familyId) {
  const familyRef = doc(db, 'families', familyId);
  const familySnap = await getDoc(familyRef);
  
  if (!familySnap.exists()) {
    throw new Error('Famille introuvable');
  }
  
  const familyData = familySnap.data();
  const updatedMembers = (familyData.members || []).filter(memberId => memberId !== uid);
  
  // Update family members
  await updateDoc(familyRef, { members: updatedMembers });
  
  // Remove familyId from user's familyIds
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data();
    const updatedFamilyIds = (userData.familyIds || []).filter(id => id !== familyId);
    await updateDoc(userRef, { familyIds: updatedFamilyIds });
  }
  
  return true;
}

/**
 * Get the family currency (returns currency code or 'EUR' as default).
 */
export async function getFamilyCurrency(uid) {
  const family = await getUserFamily(uid);
  if (!family?.id) return 'EUR';
  
  const familyRef = doc(db, 'families', family.id);
  const familySnap = await getDoc(familyRef);
  
  return familySnap.exists() ? (familySnap.data().currency || 'EUR') : 'EUR';
}

/**
 * Supprimer complètement le profil utilisateur (parent ou professionnel)
 * Supprime:
 * - Compte Firebase Authentication
 * - Document utilisateur Firestore
 * - Données familiales associées (si dernier membre)
 * - Conversations où l'utilisateur participe
 * - Événements créés par l'utilisateur
 * 
 * @param {string} uid - User ID à supprimer
 * @returns {Promise<Object>} { success: boolean, deletedData: Object }
 */
export async function deleteUserProfile(uid) {
  try {
    console.log('[DeleteProfile] Début suppression pour:', uid);
    
    const deletedData = {
      userDocDeleted: false,
      conversationsDeleted: 0,
      eventsDeleted: 0,
      familiesLeft: [],
      authDeleted: false
    };

    // 1. Récupérer les données utilisateur
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('Utilisateur non trouvé');
    }

    const userData = userSnap.data();
    const userType = userData.userType || 'parent';
    const familyIds = userData.familyIds || [];

    // 2. Supprimer les conversations de l'utilisateur
    console.log('[DeleteProfile] Suppression des conversations...');
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', uid)
    );
    const conversationsSnap = await getDocs(conversationsQuery);
    
    for (const convDoc of conversationsSnap.docs) {
      await deleteDoc(doc(db, 'conversations', convDoc.id));
      deletedData.conversationsDeleted++;
    }

    // 3. Supprimer/adapter les événements de l'utilisateur
    console.log('[DeleteProfile] Suppression des événements...');
    const eventsQuery = query(
      collection(db, 'events'),
      where('userId', '==', uid)
    );
    const eventsSnap = await getDocs(eventsQuery);
    
    for (const eventDoc of eventsSnap.docs) {
      await deleteDoc(doc(db, 'events', eventDoc.id));
      deletedData.eventsDeleted++;
    }

    // 4. Gérer les familles
    console.log('[DeleteProfile] Gestion des familles...');
    for (const familyId of familyIds) {
      const familyRef = doc(db, 'families', familyId);
      const familySnap = await getDoc(familyRef);
      
      if (familySnap.exists()) {
        const familyData = familySnap.data();
        const members = familyData.members || [];
        const updatedMembers = members.filter(m => m !== uid);
        
        if (updatedMembers.length === 0) {
          // Si l'utilisateur était le seul membre, supprimer la famille
          console.log('[DeleteProfile] Suppression de la famille (plus de membres):', familyId);
          await deleteDoc(familyRef);
        } else {
          // Sinon, mettre à jour la liste des membres
          await updateDoc(familyRef, { members: updatedMembers });
          deletedData.familiesLeft.push(familyId);
        }
      }
    }

    // 5. Supprimer le document utilisateur Firestore
    console.log('[DeleteProfile] Suppression du document utilisateur...');
    await deleteDoc(userRef);
    deletedData.userDocDeleted = true;

    // 6. Supprimer le compte Firebase Authentication
    console.log('[DeleteProfile] Suppression du compte Firebase Auth...');
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === uid) {
      await fbDeleteUser(currentUser);
      deletedData.authDeleted = true;
      console.log('[DeleteProfile] Compte Firebase Auth supprimé');
    }

    // 7. Effacer la session persistée
    console.log('[DeleteProfile] Effacement de la session...');
    try {
      const { clearSession } = await import('./sessionManager.js');
      await clearSession();
    } catch (error) {
      console.warn('[DeleteProfile] Session non effacée (peut ne pas être chargée):', error);
    }

    console.log('[DeleteProfile] Suppression complète terminée pour:', uid, deletedData);
    return {
      success: true,
      message: `Profil ${userType} supprimé avec succès`,
      deletedData
    };

  } catch (error) {
    console.error('[DeleteProfile] Erreur lors de la suppression du profil:', error);
    return {
      success: false,
      message: error.message || 'Erreur lors de la suppression du profil',
      error
    };
  }
}

/**
 * Vérifier les données qui seront supprimées (sans les supprimer)
 * Utile pour afficher un résumé avant confirmation
 * 
 * @param {string} uid - User ID à vérifier
 * @returns {Promise<Object>} Résumé des données à supprimer
 */
export async function getDeleteProfileSummary(uid) {
  try {
    const summary = {
      userFound: false,
      userType: null,
      email: null,
      familiesCount: 0,
      conversationsCount: 0,
      eventsCount: 0,
      willDeleteFamilies: [],
      willKeepFamilies: []
    };

    // Récupérer les données utilisateur
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return summary;
    }

    summary.userFound = true;
    const userData = userSnap.data();
    summary.userType = userData.userType || 'parent';
    summary.email = userData.email;
    summary.familiesCount = userData.familyIds?.length || 0;

    // Compter les conversations
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', uid)
    );
    const conversationsSnap = await getDocs(conversationsQuery);
    summary.conversationsCount = conversationsSnap.size;

    // Compter les événements
    const eventsQuery = query(
      collection(db, 'events'),
      where('userId', '==', uid)
    );
    const eventsSnap = await getDocs(eventsQuery);
    summary.eventsCount = eventsSnap.size;

    // Vérifier les familles
    const familyIds = userData.familyIds || [];
    for (const familyId of familyIds) {
      const familyRef = doc(db, 'families', familyId);
      const familySnap = await getDoc(familyRef);
      
      if (familySnap.exists()) {
        const familyData = familySnap.data();
        const members = familyData.members || [];
        
        if (members.length === 1 && members[0] === uid) {
          // Sera supprimée
          summary.willDeleteFamilies.push({
            id: familyId,
            name: familyData.name || `Famille ${familyId.substring(0, 6)}`,
            memberCount: members.length
          });
        } else {
          // Restera, utilisateur sera juste retiré
          summary.willKeepFamilies.push({
            id: familyId,
            name: familyData.name || `Famille ${familyId.substring(0, 6)}`,
            memberCount: members.length
          });
        }
      }
    }

    return summary;
  } catch (error) {
    console.error('[DeleteProfileSummary] Erreur:', error);
    return {
      userFound: false,
      error
    };
  }
}

/**
 * Enregistre le consentement RGPD de l'utilisateur et du profil professionnel associé.
 * Écrit dans users/{uid}.rgpdConsent et professionals/{uid}.rgpdConsent.
 */
export async function acceptRgpdConsent(uid, email) {
  try {
    if (!uid) {
      throw new Error('UID requis');
    }

    const consentPayload = {
      accepted: true,
      version: RGPD_VERSION,
      privacyUrl: RGPD_PRIVACY_URL,
      acceptedAt: serverTimestamp(),
      emailAtAcceptance: email?.toLowerCase() || null,
      source: 'app',
    };

    const userRef = doc(db, 'users', uid);
    const professionalRef = doc(db, 'professionals', uid);

    await setDoc(userRef, { rgpdConsent: consentPayload }, { merge: true });
    await setDoc(professionalRef, { rgpdConsent: consentPayload }, { merge: true });

    return { success: true, consent: consentPayload };
  } catch (error) {
    console.error('[RGPD] Erreur lors de l\'enregistrement du consentement:', error);
    return { success: false, error: error.message || 'Impossible d\'enregistrer le consentement' };
  }
}

/**
 * Crée une demande d'export des données personnelles (JSON + historique de messages).
 * Un traitement backend doit générer le fichier et envoyer un lien sécurisé par email.
 */
export async function requestDataExport(uid, email) {
  try {
    if (!uid) {
      throw new Error('UID requis');
    }

    const exportRef = await addDoc(collection(db, 'rgpd_exports'), {
      uid,
      email: email?.toLowerCase() || null,
      status: 'pending',
      createdAt: serverTimestamp(),
      lastUpdate: serverTimestamp(),
      type: 'professional',
      delivery: 'email-link',
      requestedFrom: 'app',
      version: RGPD_VERSION,
    });

    return { success: true, exportRequestId: exportRef.id };
  } catch (error) {
    console.error('[RGPD] Erreur lors de la demande d\'export:', error);
    return { success: false, error: error.message || 'Impossible de créer la demande d\'export' };
  }
}

/**
 * Anonymise un compte professionnel (Firestore uniquement; la suppression Auth doit être faite côté admin).
 * Efface les PII, marque le compte comme anonymisé et conserve une trace minimale.
 */
export async function anonymizeProfessionalAccount(uid) {
  try {
    if (!uid) {
      throw new Error('UID requis');
    }

    const anonymizedAt = serverTimestamp();
    const placeholderEmail = `anonymized-${uid}@wekid.local`;

    const professionalRef = doc(db, 'professionals', uid);
    await setDoc(professionalRef, {
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

    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
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
    }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('[RGPD] Erreur lors de l\'anonymisation:', error);
    return { success: false, error: error.message || 'Impossible d\'anonymiser le compte' };
  }
}

/**
 * Upload a professional profile photo to Firebase Storage
 * Stores in: professionals/{uid}/profile-photo
 * Updates Firestore with the photo URL
 * 
 * @param {string} uid - User ID
 * @param {Blob} imageBlob - Image file blob/data
 * @returns {Promise<Object>} { success: boolean, photoUrl: string, error?: any }
 */
export async function uploadProfessionalPhoto(uid, imageBlob) {
  try {
    if (!uid || !imageBlob) {
      throw new Error('UID et image requises');
    }

    // Create storage reference
    const photoRef = ref(storage, `professionals/${uid}/profile-photo`);
    
    // Upload file
    const snapshot = await uploadBytes(photoRef, imageBlob);
    console.log('[UploadPhoto] File uploaded:', snapshot.fullPath);
    
    // Get download URL
    const photoUrl = await getDownloadURL(photoRef);
    console.log('[UploadPhoto] Download URL:', photoUrl);
    
    // Update Firestore professionals document with photo URL
    const professionalDocRef = doc(db, 'professionals', uid);
    await setDoc(professionalDocRef, { photoUrl }, { merge: true });
    console.log('[UploadPhoto] Firestore updated with photoUrl');
    
    return {
      success: true,
      photoUrl
    };
  } catch (error) {
    console.error('[UploadPhoto] Erreur:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors du téléchargement de la photo'
    };
  }
}

/**
 * Delete a professional profile photo
 * Removes from Firebase Storage and clears Firestore reference
 * 
 * @param {string} uid - User ID
 * @returns {Promise<Object>} { success: boolean, error?: any }
 */
export async function deleteProfessionalPhoto(uid) {
  try {
    if (!uid) {
      throw new Error('UID requis');
    }

    // Delete from Storage
    const photoRef = ref(storage, `professionals/${uid}/profile-photo`);
    try {
      await deleteObject(photoRef);
      console.log('[DeletePhoto] File deleted from storage');
    } catch (err) {
      // File might not exist, continue
      if (err.code !== 'storage/object-not-found') {
        throw err;
      }
    }
    
    // Update Firestore to remove photoUrl
    const professionalDocRef = doc(db, 'professionals', uid);
    await setDoc(professionalDocRef, { photoUrl: null }, { merge: true });
    console.log('[DeletePhoto] Firestore updated');
    
    return { success: true };
  } catch (error) {
    console.error('[DeletePhoto] Erreur:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la suppression de la photo'
    };
  }
}

/**
 * Get professional photo URL from Firestore
 * 
 * @param {string} uid - User ID
 * @returns {Promise<string|null>} Photo URL or null
 */
export async function getProfessionalPhoto(uid) {
  try {
    const professionalDocRef = doc(db, 'professionals', uid);
    const snap = await getDoc(professionalDocRef);
    
    if (snap.exists()) {
      return snap.data().photoUrl || null;
    }
    return null;
  } catch (error) {
    console.error('[GetPhoto] Erreur:', error);
    return null;
  }
}

/**
 * Upload a professional diploma document to Firebase Storage
 * Stores in: professionals/{uid}/diploma
 * Updates Firestore with the diploma URL
 * 
 * @param {string} uid - User ID
 * @param {Blob} documentBlob - Document file blob/data
 * @returns {Promise<Object>} { success: boolean, diplomaUrl: string, error?: any }
 */
export async function uploadProfessionalDiploma(uid, documentBlob) {
  try {
    if (!uid || !documentBlob) {
      throw new Error('UID et document requis');
    }

    // Create storage reference
    const diplomaRef = ref(storage, `professionals/${uid}/diploma`);
    
    // Upload file
    const snapshot = await uploadBytes(diplomaRef, documentBlob);
    console.log('[UploadDiploma] File uploaded:', snapshot.fullPath);
    
    // Get download URL
    const diplomaUrl = await getDownloadURL(diplomaRef);
    console.log('[UploadDiploma] Download URL:', diplomaUrl);
    
    // Update Firestore professionals document with diploma URL
    const professionalDocRef = doc(db, 'professionals', uid);
    await setDoc(professionalDocRef, { diplomaUrl }, { merge: true });
    console.log('[UploadDiploma] Firestore updated with diplomaUrl');
    
    return {
      success: true,
      diplomaUrl
    };
  } catch (error) {
    console.error('[UploadDiploma] Erreur:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors du téléchargement du diplôme'
    };
  }
}

/**
 * Delete a professional diploma document
 * Removes from Firebase Storage and clears Firestore reference
 * 
 * @param {string} uid - User ID
 * @returns {Promise<Object>} { success: boolean, error?: any }
 */
export async function deleteProfessionalDiploma(uid) {
  try {
    if (!uid) {
      throw new Error('UID requis');
    }

    // Delete from Storage
    const diplomaRef = ref(storage, `professionals/${uid}/diploma`);
    try {
      await deleteObject(diplomaRef);
      console.log('[DeleteDiploma] File deleted from storage');
    } catch (err) {
      // File might not exist, continue
      if (err.code !== 'storage/object-not-found') {
        throw err;
      }
    }
    
    // Update Firestore to remove diplomaUrl
    const professionalDocRef = doc(db, 'professionals', uid);
    await setDoc(professionalDocRef, { diplomaUrl: null }, { merge: true });
    console.log('[DeleteDiploma] Firestore updated');
    
    return { success: true };
  } catch (error) {
    console.error('[DeleteDiploma] Erreur:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la suppression du diplôme'
    };
  }
}

/**
 * Get professional diploma URL from Firestore
 * 
 * @param {string} uid - User ID
 * @returns {Promise<string|null>} Diploma URL or null
 */
export async function getProfessionalDiploma(uid) {
  try {
    const professionalDocRef = doc(db, 'professionals', uid);
    const snap = await getDoc(professionalDocRef);
    
    if (snap.exists()) {
      return snap.data().diplomaUrl || null;
    }
    return null;
  } catch (error) {
    console.error('[GetDiploma] Erreur:', error);
    return null;
  }
}

/**
 * Récupère les informations d'abonnement Stripe d'un utilisateur depuis Firestore
 * Retourne un objet avec l'état de l'abonnement
 * 
 * @param {string} uid - User ID
 * @returns {Promise<Object>} { hasActiveSubscription, subscription, stripeCustomerId }
 */
export async function getUserSubscriptionInfo(uid) {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    
    if (!snap.exists()) {
      return {
        hasActiveSubscription: false,
        subscription: null,
        stripeCustomerId: null,
      };
    }

    const data = snap.data() || {};
    
    // Vérifier si l'abonnement est actif
    const isActive = data.subscriptionStatus === 'active' || data.subscriptionStatus === 'trialing';
    
    return {
      hasActiveSubscription: isActive,
      subscription: {
        id: data.subscriptionId || null,
        status: data.subscriptionStatus || null,
        currentPeriodEnd: data.currentPeriodEnd || null,
        trialEnd: data.trialEnd || null,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
        lastPaymentFailed: data.lastPaymentFailed || false,
      },
      stripeCustomerId: data.stripeCustomerId || null,
    };
  } catch (error) {
    console.error('[GetSubscriptionInfo] Erreur:', error);
    return {
      hasActiveSubscription: false,
      subscription: null,
      stripeCustomerId: null,
    };
  }
}

/**
 * Met à jour les informations d'abonnement d'un utilisateur dans Firestore
 * Utilisé par les webhooks Stripe pour synchroniser les données
 * 
 * @param {string} uid - User ID
 * @param {Object} subscriptionData - Données d'abonnement à mettre à jour
 * @returns {Promise<boolean>} true si succès
 */
export async function updateUserSubscriptionInfo(uid, subscriptionData) {
  try {
    const userRef = doc(db, 'users', uid);
    
    await updateDoc(userRef, {
      stripeCustomerId: subscriptionData.stripeCustomerId || null,
      subscriptionId: subscriptionData.subscriptionId || null,
      subscriptionStatus: subscriptionData.subscriptionStatus || null,
      currentPeriodEnd: subscriptionData.currentPeriodEnd || null,
      trialEnd: subscriptionData.trialEnd || null,
      cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd || false,
      lastPaymentFailed: subscriptionData.lastPaymentFailed || false,
      subscriptionUpdatedAt: new Date(),
    });
    
    console.log(`[UpdateSubscription] Infos d'abonnement mises à jour pour ${uid}`);
    return true;
  } catch (error) {
    console.error('[UpdateSubscription] Erreur:', error);
    return false;
  }
}

/**
 * Récupère le statut d'abonnement formaté pour l'affichage
 * Retourne un texte lisible du statut d'abonnement
 * 
 * @param {string} uid - User ID
 * @returns {Promise<Object>} { status, isActive, expiresAt, daysRemaining }
 */
export async function getFormattedSubscriptionStatus(uid) {
  try {
    const subInfo = await getUserSubscriptionInfo(uid);
    
    if (!subInfo.hasActiveSubscription || !subInfo.subscription) {
      return {
        status: 'Pas d\'abonnement actif',
        isActive: false,
        expiresAt: null,
        daysRemaining: null,
        trialDaysRemaining: null,
      };
    }

    const now = new Date();
    let expiresAt = null;
    let daysRemaining = null;
    let status = 'Abonnement actif';

    // Vérifier si en période d'essai
    if (subInfo.subscription.status === 'trialing' && subInfo.subscription.trialEnd) {
      expiresAt = subInfo.subscription.trialEnd;
      daysRemaining = Math.ceil((new Date(subInfo.subscription.trialEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      status = `Période d'essai (${daysRemaining} jours restants)`;
    } else if (subInfo.subscription.currentPeriodEnd) {
      // Sinon, afficher la date de fin de période
      expiresAt = subInfo.subscription.currentPeriodEnd;
      daysRemaining = Math.ceil((new Date(subInfo.subscription.currentPeriodEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (subInfo.subscription.cancelAtPeriodEnd) {
        status = `Résilié (expire le ${new Date(subInfo.subscription.currentPeriodEnd).toLocaleDateString('fr-FR')})`;
      } else {
        status = `Actif jusqu'au ${new Date(subInfo.subscription.currentPeriodEnd).toLocaleDateString('fr-FR')}`;
      }
    }

    // Gérer les cas d'erreur de paiement
    if (subInfo.subscription.lastPaymentFailed) {
      status = 'Erreur de paiement - Action requise';
    }

    return {
      status,
      isActive: subInfo.hasActiveSubscription,
      expiresAt,
      daysRemaining,
      cancelAtPeriodEnd: subInfo.subscription.cancelAtPeriodEnd,
      trialEnd: subInfo.subscription.trialEnd,
    };
  } catch (error) {
    console.error('[FormattedStatus] Erreur:', error);
    return {
      status: 'Impossible de récupérer le statut',
      isActive: false,
      expiresAt: null,
      daysRemaining: null,
      trialDaysRemaining: null,
    };
  }
}

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

/**
 * Afficher à nouveau une conversation précédemment masquée
 * 
 * @param {string} conversationId - ID de la conversation
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<void>}
 */
export async function unhideConversationForUser(conversationId, userId) {
  try {
    console.log(`[UnhideConversation] Début unhide - Conv: ${conversationId}, User: ${userId}`);
    const convRef = doc(db, 'conversations', conversationId);
    
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) {
      throw new Error('Conversation non trouvée');
    }

    const convData = convSnap.data();
    let hiddenFor = convData.hiddenFor || [];
    console.log(`[UnhideConversation] hiddenFor actuel:`, hiddenFor);
    
    // Retirer userId du tableau hiddenFor
    hiddenFor = hiddenFor.filter(id => id !== userId);
    console.log(`[UnhideConversation] hiddenFor après filtrage:`, hiddenFor);

    await updateDoc(convRef, {
      hiddenFor: hiddenFor
    });

    console.log(`[UnhideConversation] ✅ Conversation ${conversationId} restaurée pour l'utilisateur ${userId}`);
  } catch (error) {
    console.error('[UnhideConversation] Erreur:', error);
    throw error;
  }
}
