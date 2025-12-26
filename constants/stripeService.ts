/**
 * Service Stripe pour l'application mobile
 * Gère les appels API vers le backend Stripe
 */

import { getAuth } from 'firebase/auth';
import { Linking, NativeModules, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { STRIPE_CONFIG } from '../constants/stripeConfig';

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
    const configured = STRIPE_CONFIG.API_URL || 'http://localhost:3000';
    if (Platform.OS === 'web') return configured;
    if (!configured.includes('localhost')) return configured;
    const scriptURL: string | undefined = (NativeModules as any)?.SourceCode?.scriptURL;
    if (!scriptURL) return configured;
    const hostMatch = scriptURL.match(/^(?:http|https):\/\/([^:]+):\d+\//);
    const host = hostMatch?.[1];
    if (!host) return configured;
    return `http://${host}:3000`;
  }

  private static apiUrl = StripeService.resolveApiUrl();

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

      // Appeler l'API backend
      const response = await fetch(`${this.apiUrl}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          userId: user.uid,
          userEmail: user.email,
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
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }

      return await response.json();

    } catch (error: any) {
      console.error('Error fetching subscription status:', error);
      throw error;
    }
  }

  /**
   * Vérifie si l'utilisateur a un abonnement actif (incluant essai gratuit)
   */
  static async hasActiveSubscription(userId: string): Promise<boolean> {
    try {
      const status = await this.getSubscriptionStatus(userId);
      return status.hasActiveSubscription;
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
