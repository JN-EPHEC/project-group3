/**
 * Service de synchronisation des abonnements Stripe avec Firestore
 * Synchronise les informations d'abonnement depuis Stripe vers la base de données locale
 */

import { getAuth } from 'firebase/auth';
import { getFormattedSubscriptionStatus, getUserSubscriptionInfo, updateUserSubscriptionInfo } from './firebase';
import { StripeService } from './stripeService';

export interface SubscriptionSyncData {
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionStatus?: string;
  currentPeriodEnd?: Date;
  trialEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  lastPaymentFailed?: boolean;
}

/**
 * Synchronise les informations d'abonnement Stripe de l'utilisateur courant avec Firestore
 * Cette fonction récupère les données les plus à jour de Stripe et les sauvegarde localement
 * 
 * @returns {Promise<boolean>} true si la synchronisation a réussi
 */
export async function syncUserSubscriptionFromStripe(): Promise<boolean> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      console.warn('[SubscriptionSync] Aucun utilisateur connecté');
      return false;
    }

    // Récupérer le statut d'abonnement depuis Stripe via l'API
    const stripeStatus = await StripeService.getSubscriptionStatus(user.uid);

    // Mettre à jour Firestore avec les données Stripe
    if (stripeStatus.hasActiveSubscription && stripeStatus.subscription) {
      const syncData: SubscriptionSyncData = {
        subscriptionId: stripeStatus.subscription.id,
        subscriptionStatus: stripeStatus.subscription.status,
        currentPeriodEnd: new Date(stripeStatus.subscription.currentPeriodEnd * 1000),
        cancelAtPeriodEnd: stripeStatus.subscription.cancelAtPeriodEnd,
        trialEnd: stripeStatus.subscription.trialEnd 
          ? new Date(stripeStatus.subscription.trialEnd * 1000)
          : null,
      };

      return await updateUserSubscriptionInfo(user.uid, syncData);
    }

    return true;
  } catch (error) {
    console.error('[SubscriptionSync] Erreur lors de la synchronisation:', error);
    return false;
  }
}

/**
 * Récupère les informations d'abonnement de l'utilisateur courant depuis Firestore
 * Utilise les données mises en cache localement
 * 
 * @returns {Promise<Object>} Informations d'abonnement formatées pour l'affichage
 */
export async function getUserCurrentSubscriptionInfo() {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      return {
        hasActiveSubscription: false,
        subscription: null,
        stripeCustomerId: null,
      };
    }

    return await getUserSubscriptionInfo(user.uid);
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
 * Récupère le texte formaté du statut d'abonnement pour l'affichage
 * 
 * @returns {Promise<Object>} Statut formaté avec informations lisibles
 */
export async function getFormattedCurrentSubscriptionStatus() {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      return {
        status: 'Pas connecté',
        isActive: false,
        expiresAt: null,
        daysRemaining: null,
      };
    }

    return await getFormattedSubscriptionStatus(user.uid);
  } catch (error) {
    console.error('[FormattedStatus] Erreur:', error);
    return {
      status: 'Erreur lors de la récupération du statut',
      isActive: false,
      expiresAt: null,
      daysRemaining: null,
    };
  }
}

/**
 * Vérifie si l'utilisateur a un abonnement actif
 * Combine la vérification locale et distante pour une fiabilité maximale
 * 
 * @returns {Promise<boolean>} true si l'utilisateur a un abonnement actif
 */
export async function hasActiveSubscription(): Promise<boolean> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      return false;
    }

    // D'abord vérifier dans Firestore
    const localInfo = await getUserSubscriptionInfo(user.uid);
    if (localInfo.hasActiveSubscription) {
      return true;
    }

    // Si pas actif localement, vérifier dans Stripe pour synchronisation
    try {
      const stripeStatus = await StripeService.getSubscriptionStatus(user.uid);
      if (stripeStatus.hasActiveSubscription) {
        // Mettre à jour les données locales
        await syncUserSubscriptionFromStripe();
        return true;
      }
    } catch (error) {
      // Si Stripe n'est pas accessible, on se fie aux données locales
      console.warn('[HasActiveSubscription] Impossible de vérifier Stripe:', error);
    }

    return false;
  } catch (error) {
    console.error('[HasActiveSubscription] Erreur:', error);
    return false;
  }
}

/**
 * Force la synchronisation depuis Stripe et retourne le statut à jour
 * À utiliser après un paiement ou pour forcer une mise à jour
 * 
 * @returns {Promise<Object>} Statut d'abonnement à jour
 */
export async function refreshSubscriptionStatus() {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      return {
        hasActiveSubscription: false,
        subscription: null,
        stripeCustomerId: null,
      };
    }

    // Synchroniser depuis Stripe
    await syncUserSubscriptionFromStripe();

    // Retourner les informations à jour
    return await getUserSubscriptionInfo(user.uid);
  } catch (error) {
    console.error('[RefreshSubscription] Erreur:', error);
    return {
      hasActiveSubscription: false,
      subscription: null,
      stripeCustomerId: null,
    };
  }
}
