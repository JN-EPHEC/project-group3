/**
 * Service Stripe pour l'application mobile
 * Gère les appels API vers le backend Stripe
 */

import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Linking, NativeModules, Platform } from 'react-native';
import { STRIPE_CONFIG } from '../constants/stripeConfig';
import { db } from './firebase'; // Assurez-vous que le fichier firebase.js est bien dans le même dossier

export interface CreateCheckoutSessionParams {
  priceId: string;
  userId: string;
  userEmail: string;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
    trialEnd: number | null;
  } | null;
}

/**
 * Service principal pour gérer les paiements Stripe
 */
export class StripeService {
  private static resolveApiUrl(): string {
    // Priorité aux overrides explicites (Expo extra/env)
    const explicitExtraUrl: string | undefined = (Constants as any)?.expoConfig?.extra?.EXPO_PUBLIC_API_URL
      || (Constants as any)?.manifest?.extra?.EXPO_PUBLIC_API_URL;
    if (explicitExtraUrl) return explicitExtraUrl;

    const configured = STRIPE_CONFIG.API_URL || 'https://momentously-involucral-hal.ngrok-free.dev';
    // Web: utiliser tel quel
    if (Platform.OS === 'web') return configured;

    // Si ce n'est pas une URL locale, garder tel quel (ex: ngrok/production)
    const isLocal = /^(http:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)|::1)/i.test(configured) || configured.endsWith(':3000');
    if (!isLocal) return configured;

    // Essayer d'extraire l'hôte de l'URL du bundle Expo (marche souvent sur Expo Go)
    const scriptURL: string | undefined = (NativeModules as any)?.SourceCode?.scriptURL;
    let hostFromScript: string | undefined;
    if (scriptURL) {
      const hostMatch = scriptURL.match(/^(?:http|https):\/\/([^:]+):\d+\//);
      hostFromScript = hostMatch?.[1];
      // Éviter les hôtes exp.direct (tunnel), non accessibles pour un backend local
      if (hostFromScript && hostFromScript.includes('exp.direct')) {
        hostFromScript = undefined;
      }
    }

    // Autres fallbacks: Expo Constants (SDK récents)
    const hostUri: string | undefined = (Constants as any)?.expoConfig?.hostUri || (Constants as any)?.manifest?.debuggerHost;
    let hostFromConstants: string | undefined;
    if (hostUri) hostFromConstants = hostUri.split(':')[0];

    const host = hostFromScript || hostFromConstants;
    if (host && !host.includes('exp.direct')) {
      return `http://${host}:3000`;
    }

    // Android émulateur: fallback utile
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000';
    }

    // Dernier recours: configuré (probablement localhost) ➜ risque d'échec sur appareil réel
    return configured;
  }

  private static apiUrl = StripeService.resolveApiUrl();

  private static buildReturnUrls() {
    const envSuccess = process.env.EXPO_PUBLIC_SUCCESS_URL
      || (Constants as any)?.expoConfig?.extra?.EXPO_PUBLIC_SUCCESS_URL
      || (Constants as any)?.manifest?.extra?.EXPO_PUBLIC_SUCCESS_URL;
    const envCancel = process.env.EXPO_PUBLIC_CANCEL_URL
      || (Constants as any)?.expoConfig?.extra?.EXPO_PUBLIC_CANCEL_URL
      || (Constants as any)?.manifest?.extra?.EXPO_PUBLIC_CANCEL_URL;

    // Utiliser l'origine courante sur le web pour respecter le port en cours
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const origin = window.location.origin.replace(/\/$/, '');
      return {
        successUrl: envSuccess || `${origin}/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: envCancel || `${origin}/subscription?cancelled=true`,
      };
    }

    // Sur mobile : vérifier si on est dans Expo Go ou une app standalone
    const expoScheme = (Constants as any)?.expoConfig?.scheme || (Constants as any)?.manifest?.scheme || 'myapp';
    const isExpoGo = (Constants as any)?.appOwnership === 'expo';
    
    if (isExpoGo) {
      // Dans Expo Go, utiliser exp:// avec l'hôte du projet
      const hostUri = (Constants as any)?.expoConfig?.hostUri || (Constants as any)?.manifest?.debuggerHost;
      const host = hostUri ? hostUri.split(':').shift() : '';
      const projectId = (Constants as any)?.expoConfig?.extra?.eas?.projectId;
      
      console.log('🔵 Expo Go détecté - Configuration deep link:');
      console.log('   - Host URI:', hostUri);
      console.log('   - Host:', host);
      console.log('   - Project ID:', projectId);
      
      // Pour Expo Go, on utilise la route avec paramètres
      return {
        successUrl: envSuccess || `exp://${host}/--/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: envCancel || `exp://${host}/--/subscription?cancelled=true`,
      };
    }
    
    // Pour une app standalone, utiliser le schéma personnalisé
    return {
      successUrl: envSuccess || `${expoScheme}://payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: envCancel || `${expoScheme}://payment-cancelled`,
    };
  }

  /**
   * Crée une session Stripe Checkout et ouvre le navigateur
   */
  static async createCheckoutSession(priceId: string): Promise<void> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error('User must be authenticated');
      }

      if (!user.email) {
        throw new Error("Votre compte n'a pas d'email. Veuillez ajouter un email à votre profil.");
      }

      const returnUrls = this.buildReturnUrls();

      // Appeler l'API backend
      const response = await fetch(`${this.apiUrl}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          priceId,
          userId: user.uid,
          userEmail: user.email,
          successUrl: returnUrls.successUrl,
          cancelUrl: returnUrls.cancelUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const data: CheckoutSessionResponse = await response.json();

      // Ouvrir l'URL de checkout dans le navigateur système
      try {
        await WebBrowser.openBrowserAsync(data.url);
      } catch {
        const canOpen = await Linking.canOpenURL(data.url);
        if (!canOpen) {
          throw new Error('Impossible d\'ouvrir Stripe Checkout');
        }
        await Linking.openURL(data.url);
      }

    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Ouvre le Customer Portal Stripe pour gérer l'abonnement
   */
  static async openCustomerPortal(customerId: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/api/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          customerId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create portal session');
      }

      const data = await response.json();

      // Ouvrir le portal
      const canOpen = await Linking.canOpenURL(data.url);
      if (canOpen) {
        await Linking.openURL(data.url);
      } else {
        throw new Error('Cannot open Customer Portal URL');
      }

    } catch (error: any) {
      console.error('Error opening customer portal:', error);
      throw error;
    }
  }

  /**
   * Vérifie le statut d'abonnement de l'utilisateur
   */
  static async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    try {
      const response = await fetch(`${this.apiUrl}/api/subscription-status/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }

      return await response.json();

    } catch (error: any) {
      // Ajoute des détails utiles pour le debug sur appareil réel
      console.error('[StripeService] Error fetching subscription status:', error);
      console.error('[StripeService] API URL used:', this.apiUrl);
      console.warn('[StripeService] Conseils:');
      console.warn(' - Vérifiez que le backend tourne: cd backend && npm run dev');
      console.warn(' - Depuis votre iPhone, ouvrez Safari: http://<IP_PC>:3000/health');
      console.warn(' - Si inaccessible, désactivez/autorisez le pare-feu Windows pour Node.js (port 3000)');
      console.warn(' - Ou définissez EXPO_PUBLIC_API_URL sur une URL accessible (LAN ou ngrok https)');
      throw error;
    }
  }

  /**
   * Vérifie si l'utilisateur a un abonnement actif (incluant essai gratuit)
   */
  static async hasActiveSubscription(userId: string): Promise<boolean> {
    try {
      // On récupère le document utilisateur directement
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) return false;

      const data = userDoc.data();
      const now = Date.now() / 1000; // Maintenant en secondes

      // 1. Vérification du statut : on accepte 'active' ET 'trialing'
      const status = data.subscriptionStatus;
      const isValidStatus = status === 'active' || status === 'trialing';

      if (!isValidStatus) return false;

      // 2. Vérification des dates (C'est ici que ça bloquait avant)
      // On regarde soit la fin de période normale, soit la fin de l'essai
      const currentPeriodEnd = data.currentPeriodEnd?.seconds || 0;
      const trialEnd = data.trialEnd?.seconds || 0;

      // Si l'une des deux dates est dans le futur, c'est bon
      const isDateValid = currentPeriodEnd > now || trialEnd > now;

      console.log(`🔍 Vérif Abo: Status=${status}, ValidDate=${isDateValid} (Fin Période: ${currentPeriodEnd}, Fin Essai: ${trialEnd})`);

      return isDateValid;

    } catch (error) {
      console.error('Error checking subscription:', error);
      return false;
    }
  }
}
/**
 * Hook personnalisé pour gérer le Deep Linking après paiement
 * À utiliser dans le composant racine de l'app
 */
export const useStripeDeepLinking = (
  onPaymentSuccess: (sessionId: string) => void,
  onPaymentCancelled: () => void
) => {
  const handleDeepLink = (event: { url: string }) => {
    const url = event.url;

    if (url.startsWith('myapp://payment-success')) {
      // Extraire le session_id de l'URL
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const sessionId = urlParams.get('session_id');
      
      if (sessionId) {
        onPaymentSuccess(sessionId);
      }
    } else if (url.startsWith('myapp://payment-cancelled')) {
      onPaymentCancelled();
    }
  };

  return { handleDeepLink };
};
