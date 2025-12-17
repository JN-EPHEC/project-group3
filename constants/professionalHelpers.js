import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Create or update a professional profile in Firestore
 * @param {string} uid - User ID
 * @param {Object} profileData - Professional profile data
 */
export async function createOrUpdateProfessionalProfile(uid, profileData) {
  try {
    const professionalRef = doc(db, 'professionals', uid);
    
    const dataToSave = {
      userId: uid,
      firstName: profileData.firstName || '',
      lastName: profileData.lastName || '',
      email: profileData.email || '',
      type: profileData.type || '', // 'avocat' or 'psychologue'
      address: profileData.address || '',
      phone: profileData.phone || '',
      specialty: profileData.specialty || '',
      description: profileData.description || '',
      availability: profileData.availability || {
        lundi: '9h - 18h',
        mardi: '9h - 18h',
        mercredi: '9h - 18h',
        jeudi: '9h - 18h',
        vendredi: '9h - 18h',
        samedi: 'Fermé',
        dimanche: 'Fermé'
      },
      updatedAt: new Date()
    };
    
    await setDoc(professionalRef, dataToSave, { merge: true });
    
    return { success: true, data: dataToSave };
  } catch (error) {
    console.error('Error creating/updating professional profile:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a professional profile by user ID
 * @param {string} uid - User ID
 */
export async function getProfessionalProfile(uid) {
  try {
    const professionalRef = doc(db, 'professionals', uid);
    const professionalSnap = await getDoc(professionalRef);
    
    if (professionalSnap.exists()) {
      return { success: true, data: { id: professionalSnap.id, ...professionalSnap.data() } };
    } else {
      return { success: false, error: 'Professional profile not found' };
    }
  } catch (error) {
    console.error('Error getting professional profile:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all professionals of a specific type
 * @param {string} type - 'avocat' or 'psychologue'
 */
export async function getProfessionalsByType(type) {
  try {
    const professionalsRef = collection(db, 'professionals');
    const q = query(professionalsRef, where('type', '==', type));
    const querySnapshot = await getDocs(q);
    
    const professionals = [];
    querySnapshot.forEach((doc) => {
      professionals.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: professionals };
  } catch (error) {
    console.error('Error getting professionals by type:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all professionals (both lawyers and psychologists)
 */
export async function getAllProfessionals() {
  try {
    const professionalsRef = collection(db, 'professionals');
    const querySnapshot = await getDocs(professionalsRef);
    
    const professionals = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Only include professionals with a valid type
      if (data.type === 'avocat' || data.type === 'psychologue') {
        professionals.push({ id: doc.id, ...data });
      }
    });
    
    return { success: true, data: professionals };
  } catch (error) {
    console.error('Error getting all professionals:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add professional role to a user
 * This should be called when a user registers as a professional or upgrades their account
 * @param {string} uid - User ID
 * @param {string} type - 'avocat' or 'psychologue'
 */
export async function assignProfessionalRole(uid, type) {
  try {
    // Update user document to include professional role
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const currentRoles = userData.roles || [];
      
      // Add 'professionnel' role if not already present
      if (!currentRoles.includes('professionnel')) {
        currentRoles.push('professionnel');
        await setDoc(userRef, { roles: currentRoles }, { merge: true });
      }
      
      // Create initial professional profile
      await createOrUpdateProfessionalProfile(uid, {
        email: userData.email,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        type: type
      });
      
      return { success: true };
    } else {
      return { success: false, error: 'User not found' };
    }
  } catch (error) {
    console.error('Error assigning professional role:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if a user has a professional profile
 * @param {string} uid - User ID
 */
export async function isProfessional(uid) {
  try {
    const professionalRef = doc(db, 'professionals', uid);
    const professionalSnap = await getDoc(professionalRef);
    
    return professionalSnap.exists();
  } catch (error) {
    console.error('Error checking if user is professional:', error);
    return false;
  }
}
