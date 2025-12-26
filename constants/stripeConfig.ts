/**
 * Configuration Stripe pour l'application
 * 
 * ⚠️ IMPORTANT : 
 * - Mets tes vraies clés Stripe dans un fichier .env
 * - NE JAMAIS commit les clés en production dans le code
 */

export const STRIPE_CONFIG = {
  // Clés API (à remplacer par tes vraies clés)
  PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_YOUR_KEY',
  
  // Price IDs pour les abonnements
  PRICES: {
    MONTHLY: 'price_1SiXfe2OiYebg9QDRWHm63We0', // 7,99€/mois
    YEARLY: 'price_1SiXfe2OiYebg9QDfh8rWIcX1',  // 89,99€/an
  },
  
  // ID du produit
  PRODUCT_ID: 'prod_TftSX4g41Ot7Vn',
  
  // Configuration de l'essai gratuit
  TRIAL_DAYS: 30,
  
  // Deep Links (à personnaliser selon ton app)
  DEEP_LINKS: {
    SUCCESS: 'myapp://payment-success',
    CANCEL: 'myapp://payment-cancelled',
  },
  
  // URL de ton backend API
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
};

// Types pour TypeScript
export type SubscriptionPlan = 'monthly' | 'yearly';

export interface SubscriptionPlanDetails {
  id: string;
  name: string;
  price: number;
  priceId: string;
  interval: 'month' | 'year';
  trialDays: number;
  savings?: string;
}

// Détails des plans
export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, SubscriptionPlanDetails> = {
  monthly: {
    id: 'monthly',
    name: 'Abonnement Mensuel',
    price: 7.99,
    priceId: STRIPE_CONFIG.PRICES.MONTHLY,
    interval: 'month',
    trialDays: 30,
  },
  yearly: {
    id: 'yearly',
    name: 'Abonnement Annuel',
    price: 89.99,
    priceId: STRIPE_CONFIG.PRICES.YEARLY,
    interval: 'year',
    trialDays: 30,
    savings: '6% (au lieu de 95,88€)',
  },
};
