/**
 * Session Management with Token Persistence and Auto-Expiration
 * 
 * Cette implémentation fournit:
 * - Persistance de session utilisateur via AsyncStorage
 * - Tokens d'authentification (JWT-like)
 * - Expiration automatique après 30 jours d'inactivité
 * - Gestion de l'activation/désactivation de session
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOut as fbSignOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// Configuration
const SESSION_STORAGE_KEY = 'wekid_session';
const INACTIVITY_THRESHOLD = 30 * 24 * 60 * 60 * 1000; // 30 jours en millisecondes
const TOKEN_VERSION = '1.0';

/**
 * Structure d'une session persistée
 * @typedef {Object} PersistentSession
 * @property {string} uid - Firebase User ID
 * @property {string} email - Email utilisateur
 * @property {string} token - Token JWT-like
 * @property {number} tokenCreatedAt - Timestamp création token
 * @property {number} lastActivityAt - Timestamp dernière activité
 * @property {'parent' | 'professionnel'} userType - Type d'utilisateur actif (mode courant)
 * @property {string | null} [parentId]
 * @property {string | null} [professionalId]
 * @property {boolean} [dualRole]
 * @property {string[]} [roles] - Rôles utilisateur
 * @property {string[]} [familyIds] - IDs des familles
 * @property {number} expiresAt - Timestamp expiration session
 */

/**
 * Créer une session et la persister
 * @param user Firebase user object
 * @param userType 'parent' ou 'professionnel'
 * @returns {Promise<PersistentSession>}
 */
export async function createAndPersistSession(user, userType = 'parent') {
  try {
    // Récupérer les données utilisateur depuis Firestore
    const userDocRef = doc(db, 'users', user.uid);
    let userData = {};
    
    try {
      const userDocSnap = await getDoc(userDocRef);
      userData = userDocSnap.exists() ? userDocSnap.data() : {};
    } catch (firestoreError) {
      console.warn('[Session] Impossible de récupérer les données utilisateur Firestore:', firestoreError?.message);
      // Continuer avec des données vides
    }

    // Générer un token
    const token = generateToken(user.uid);
    const now = Date.now();
    const expiresAt = now + INACTIVITY_THRESHOLD;

    const parentId = userData.parent_id ?? (userData.userType === 'parent' ? user.uid : null);
    const professionalId = userData.professional_id ?? (userData.userType === 'professionnel' ? user.uid : null);
    const dualRole = !!parentId && !!professionalId;

    // Créer l'objet session
    const session = {
      uid: user.uid,
      email: user.email,
      token,
      tokenCreatedAt: now,
      lastActivityAt: now,
      userType,
      parentId,
      professionalId,
      dualRole,
      roles: userData.roles || [],
      familyIds: userData.familyIds || [],
      expiresAt
    };

    // Persister en AsyncStorage (critique)
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

    // Mettre à jour le timestamp de dernière connexion dans Firestore (optionnel)
    try {
      await updateDoc(userDocRef, {
        lastLoginAt: new Date(),
        lastActivityAt: new Date()
      });
    } catch (firestoreError) {
      console.warn('[Session] Mise à jour Firestore échouée lors de la création (non-bloquant):', firestoreError?.message);
      // Ne pas bloquer - la session est déjà en AsyncStorage
    }

    console.log('[Session] Session créée et persistée pour:', user.email);
    return session;
  } catch (error) {
    console.error('[Session] Erreur critique lors de la création de session:', error);
    throw error;
  }
}


/**
 * Récupérer la session persistée
 * @returns {Promise<PersistentSession | null>}
 */
export async function getPersistedSession() {
  try {
    const sessionData = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionData) {
      return null;
    }

    const session = JSON.parse(sessionData);
    
    // Vérifier si la session a expiré
    if (isSessionExpired(session)) {
      console.log('[Session] Session expirée (inactivité > 30 jours)');
      await clearSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error('[Session] Erreur lors de la récupération de session:', error);
    return null;
  }
}

/**
 * Vérifier si une session est expirée
 * @param session Session à vérifier
 * @returns {boolean}
 */
export function isSessionExpired(session) {
  if (!session) return true;
  const now = Date.now();
  return now > session.expiresAt;
}

/**
 * Mettre à jour l'activité de la session (prolonger l'expiration)
 * @param session Session active
 * @returns {Promise<PersistentSession>}
 */
export async function updateSessionActivity(session) {
  try {
    if (!session) return null;

    const now = Date.now();
    const expiresAt = now + INACTIVITY_THRESHOLD;

    // Mettre à jour la session en mémoire
    const updatedSession = {
      ...session,
      lastActivityAt: now,
      expiresAt
    };

    // Persister la session mise à jour
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession));

    // Mettre à jour Firestore (optionnel - ne pas bloquer si erreur)
    if (session.uid) {
      try {
        const userDocRef = doc(db, 'users', session.uid);
        await updateDoc(userDocRef, {
          lastActivityAt: new Date()
        });
      } catch (firestoreError) {
        // Log l'erreur mais ne pas bloquer la session
        // La session est déjà persistée en AsyncStorage
        console.warn('[Session] Mise à jour Firestore échouée (non-bloquant):', firestoreError?.message);
      }
    }

    return updatedSession;
  } catch (error) {
    console.error('[Session] Erreur lors de la mise à jour d\'activité:', error);
    return session;
  }
}

/**
 * Vérifier la validité et prolonger la session si nécessaire
 * Doit être appelé régulièrement
 * @returns {Promise<boolean>} true si la session est valide
 */
export async function validateAndRefreshSession() {
  try {
    const session = await getPersistedSession();
    
    if (!session) {
      return false;
    }

    // Prolonger l'inactivité
    await updateSessionActivity(session);
    return true;
  } catch (error) {
    console.error('[Session] Erreur lors de la validation de session:', error);
    return false;
  }
}

/**
 * Met à jour le rôle actif dans la session persistée (parent/professionnel)
 * @param {'parent'|'professionnel'} role
 */
export async function setActiveSessionRole(role) {
  try {
    const session = await getPersistedSession();
    if (!session) return null;
    const updated = { ...session, userType: role };
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('[Session] Erreur lors du changement de rôle actif:', error);
    return null;
  }
}

/**
 * Effacer la session (déconnexion)
 * @returns {Promise<void>}
 */
export async function clearSession() {
  try {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    await fbSignOut(auth);
    console.log('[Session] Session effacée et utilisateur déconnecté');
  } catch (error) {
    console.error('[Session] Erreur lors de l\'effacement de session:', error);
    throw error;
  }
}

/**
 * Générer un token d'authentification (simulation JWT)
 * @param uid User ID
 * @returns {string}
 */
function generateToken(uid) {
  // Créer un token basique (en production, ce serait un JWT réel)
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    uid,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 jours
    ver: TOKEN_VERSION
  }));
  
  // Clé secrète locale (en production, utiliser une vraie signature)
  const signature = btoa('wekid_secret_key_' + uid);
  
  return `${header}.${payload}.${signature}`;
}

/**
 * Vérifier la validité d'un token
 * @param token Token à vérifier
 * @returns {boolean}
 */
export function isTokenValid(token) {
  try {
    if (!token) return false;
    
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);

    return payload.exp > now;
  } catch (error) {
    console.error('[Session] Erreur lors de la vérification du token:', error);
    return false;
  }
}

/**
 * Obtenir les informations de session avec détails d'expiration
 * @returns {Promise<Object>}
 */
export async function getSessionDetails() {
  try {
    const session = await getPersistedSession();
    
    if (!session) {
      return {
        active: false,
        session: null,
        expirationInfo: null
      };
    }

    const now = Date.now();
    const timeUntilExpiration = session.expiresAt - now;
    const daysUntilExpiration = Math.floor(timeUntilExpiration / (24 * 60 * 60 * 1000));
    const hoursUntilExpiration = Math.floor((timeUntilExpiration % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    return {
      active: true,
      session,
      expirationInfo: {
        expiresAt: new Date(session.expiresAt),
        timeUntilExpiration,
        daysUntilExpiration,
        hoursUntilExpiration,
        isExpiringSoon: timeUntilExpiration < (7 * 24 * 60 * 60 * 1000), // Moins de 7 jours
        isExpired: false
      }
    };
  } catch (error) {
    console.error('[Session] Erreur lors de la récupération des détails de session:', error);
    return {
      active: false,
      session: null,
      expirationInfo: null,
      error
    };
  }
}

/**
 * Forcer la fin de la session (après 30 jours d'inactivité)
 * Utile pour les cas où la session est restée en mémoire mais devrait être expirée
 * @returns {Promise<boolean>}
 */
export async function forceSessionExpiration() {
  try {
    const session = await getPersistedSession();
    
    if (!session) {
      return false;
    }

    // Vérifier l'inactivité réelle
    const now = Date.now();
    const inactivityDuration = now - session.lastActivityAt;

    if (inactivityDuration > INACTIVITY_THRESHOLD) {
      console.log('[Session] Session expirée due à inactivité > 30 jours');
      await clearSession();
      return true;
    }

    return false;
  } catch (error) {
    console.error('[Session] Erreur lors de la vérification d\'inactivité:', error);
    return false;
  }
}

export const SESSION_CONFIG = {
  STORAGE_KEY: SESSION_STORAGE_KEY,
  INACTIVITY_THRESHOLD,
  TOKEN_VERSION
};
