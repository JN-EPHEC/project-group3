import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  getAuth,
  signInWithEmailAndPassword
} from 'firebase/auth';
import {
  addDoc,
  arrayUnion,
  collection,
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
    await setDoc(userRef, { email, roles: [], familyId: null });
  }

  const updated = await getDoc(userRef);
  const data = updated.data() || {};
  return { user: res.user, roles: data.roles || [], familyId: data.familyId || null };
}

/**
 * Sign up: create Auth user + users/{uid} document with initial role and no family.
 * Returns { user, roles, familyId }.
 */
export async function signUp(email, password, role = 'parent') {
  const res = await createUserWithEmailAndPassword(auth, email, password);
  const uid = res.user.uid;

  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, { email, roles: [role], familyId: null });

  return { user: res.user, roles: [role], familyId: null };
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
 */
export async function getUserFamily(uid) {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  const data = snap.exists() ? snap.data() : null;
  if (!data || !data.familyId) return null;
  const familyRef = doc(db, 'families', data.familyId);
  const familySnap = await getDoc(familyRef);
  return familySnap.exists() ? { id: familySnap.id, ...familySnap.data() } : null;
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

  // attach familyId to user
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, { familyId: familyDocRef.id }, { merge: true });

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

  // set user's familyId
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, { familyId: familyRef.id }, { merge: true });

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
  const result = await signIn(email, password); // { user, roles, familyId }
  const roles = result.roles || [];
  const familyId = result.familyId || null;
  const needsFamilyCode = roles.includes('parent') && !familyId;
  return { ...result, needsFamilyCode };
}
