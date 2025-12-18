import { initializeApp } from 'firebase/app';
import {
    createUserWithEmailAndPassword,
    deleteUser as fbDeleteUser,
    signOut as fbSignOut,
    getAuth,
    signInWithEmailAndPassword
} from 'firebase/auth';
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
    setDoc,
    updateDoc,
    where
} from 'firebase/firestore';

import firebaseConfig from './firebaseenv.js';
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };

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
    await setDoc(userRef, { email, roles: [], familyIds: [] });
  }

  const updated = await getDoc(userRef);
  const data = updated.data() || {};
  // Support pour ancienne structure (familyId) et nouvelle (familyIds)
  let familyIds = data.familyIds || [];
  if (data.familyId && !familyIds.includes(data.familyId)) {
    familyIds = [data.familyId, ...familyIds];
  }
  return { user: res.user, roles: data.roles || [], familyIds };
}

/**
 * Sign up: create Auth user + users/{uid} document with initial role and no family.
 * Returns { user, roles, familyId }.
 */
export async function signUp(email, password, role = 'parent') {
  const res = await createUserWithEmailAndPassword(auth, email, password);
  const uid = res.user.uid;

  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, { email, roles: [role], familyIds: [] });

  return { user: res.user, roles: [role], familyIds: [] };
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
