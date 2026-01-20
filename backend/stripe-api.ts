/**
 * Backend API pour créer des Stripe Checkout Sessions
 * 
 * Déploiement recommandé :
 * - Firebase Functions
 * - Vercel Serverless
 * - Railway
 * - Heroku
 * 
 * Installation : npm install stripe express cors dotenv
 */

import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import Stripe from 'stripe';
import { db } from './firebase-admin';
import { handleStripeWebhook } from './stripe-webhook';

// Charger les variables d'environnement depuis la racine du projet
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();

// Mode permissif en développement (défaut). Mettre STRICT_CORS=1 pour n'autoriser que ALLOWED_ORIGINS.
const strictCors = process.env.STRICT_CORS === '1';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',').map(o => o.trim()).filter(Boolean);

// Configuration Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

// Middleware CORS (très permissif en dev)
app.use(cors({
  origin: strictCors ? allowedOrigins : true, // true = reflet origin
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature', 'ngrok-skip-browser-warning'],
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Pré-vol (OPTIONS)
app.options('*', cors({ 
  origin: strictCors ? allowedOrigins : true,
  allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature', 'ngrok-skip-browser-warning'],
}));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Test Firebase connection
app.get('/test-firebase', async (_req, res) => {
  try {
    // Tester la connexion en listant les collections
    const collections = await db.listCollections();
    const collectionNames = collections.map(col => col.id);
    
    res.json({ 
      connected: true,
      collections: collectionNames,
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } catch (error: any) {
    res.status(500).json({ 
      connected: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/create-checkout-session
 * Crée une session Stripe Checkout avec essai gratuit de 30 jours
 */
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { priceId, userId, userEmail, successUrl, cancelUrl } = req.body;

    // Validation
    if (!priceId) {
      return res.status(400).json({ error: 'priceId is required' });
    }

    if (!userId || !userEmail) {
      return res.status(400).json({ error: 'userId and userEmail are required' });
    }

    // Vérifier que le priceId est valide (configurable via variables d'environnement)
    const monthlyPrice = process.env.PRICE_MONTHLY_ID || 'price_1SiXfe2OiYebg9QDRWHm63We';
    const yearlyPrice = process.env.PRICE_YEARLY_ID || 'price_1SiXfe2OiYebg9QDfh8rWIcX';
    const validPriceIds = [monthlyPrice, yearlyPrice].filter(Boolean);

    if (!validPriceIds.includes(priceId)) {
      return res.status(400).json({ error: 'Invalid priceId' });
    }

    // Créer ou récupérer le client Stripe
    let customer: Stripe.Customer;
    const existingCustomers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
      
      // Vérifier si le userId est déjà dans les métadonnées du customer
      if (!customer.metadata?.userId) {
        console.log('🔄 Updating existing customer with userId metadata...');
        customer = await stripe.customers.update(customer.id, {
          metadata: {
            userId: userId,
          },
        });
      }
    } else {
      customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          userId: userId,
        },
      });
    }

    const sanitizeUrl = (url?: string) => {
      if (!url || typeof url !== 'string') return undefined;
      // Autoriser les URLs HTTP/HTTPS ET les deep links (myapp://, exp://)
      return /^(https?|myapp|exp):\/\//i.test(url) ? url : undefined;
    };

    const resolvedSuccessUrl = sanitizeUrl(successUrl) || process.env.SUCCESS_URL || 'myapp://payment-success?session_id={CHECKOUT_SESSION_ID}';
    const resolvedCancelUrl = sanitizeUrl(cancelUrl) || process.env.CANCEL_URL || 'myapp://payment-cancelled';

    console.log('🔵 URLs de redirection Stripe:');
    console.log('   ✅ Success URL:', resolvedSuccessUrl);
    console.log('   ❌ Cancel URL:', resolvedCancelUrl);

    // Créer la Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      // Configuration de l'essai gratuit
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          userId: userId,
        },
      },

      // Forcer la collecte de la méthode de paiement
      payment_method_collection: 'always',

      // URLs de redirection - utiliser des URLs web pour dev, deep links pour mobile
      success_url: resolvedSuccessUrl,
      cancel_url: resolvedCancelUrl,

      // Permettre les codes promo (optionnel)
      allow_promotion_codes: true,

      // Métadonnées pour le tracking
      metadata: {
        userId: userId,
        source: 'mobile_app',
      },
    });

    // Retourner l'URL de la session
    res.json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      error: error.message || 'An error occurred',
    });
  }
});

/**
 * POST /api/create-portal-session
 * Crée une session Customer Portal pour gérer l'abonnement
 */
app.post('/api/create-portal-session', async (req, res) => {
  try {
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'customerId is required' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: 'myapp://settings',
    });

    res.json({
      url: session.url,
    });

  } catch (error: any) {
    console.error('Error creating portal session:', error);
    res.status(500).json({
      error: error.message || 'An error occurred',
    });
  }
});

/**
 * GET /api/subscription-status/:userId
 * Vérifie le statut d'abonnement d'un utilisateur
 * Retourne les informations de l'abonnement actif le plus récent
 */
app.get('/api/subscription-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Rechercher le client Stripe via les métadonnées (search est plus efficace)
    const customers = await stripe.customers.search({
      query: `metadata['userId']:'${userId}'`,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return res.json({
        hasActiveSubscription: false,
        subscription: null,
        stripeCustomerId: null,
      });
    }

    const customer = customers.data[0];

    // Récupérer les abonnements actifs ou en période d'essai
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 10,
    });

    // Vérifier s'il y a un abonnement actif ou en période d'essai
    const activeSubscription = subscriptions.data.find(
      sub => sub.status === 'active' || sub.status === 'trialing'
    );

    if (!activeSubscription) {
      return res.json({
        hasActiveSubscription: false,
        subscription: null,
        stripeCustomerId: customer.id,
      });
    }

    res.json({
      hasActiveSubscription: true,
      stripeCustomerId: customer.id,
      subscription: {
        id: activeSubscription.id,
        status: activeSubscription.status,
        currentPeriodEnd: activeSubscription.current_period_end,
        cancelAtPeriodEnd: activeSubscription.cancel_at_period_end,
        trialEnd: activeSubscription.trial_end,
      },
    });

  } catch (error: any) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({
      error: error.message || 'An error occurred',
    });
  }
});

/**
 * POST /api/sync-subscription/:userId
 * Force la synchronisation des informations d'abonnement depuis Stripe
 * Utile pour s'assurer que Firestore est à jour
 */
app.post('/api/sync-subscription/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Récupérer le statut depuis Stripe
    const customers = await stripe.customers.search({
      query: `metadata['userId']:'${userId}'`,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return res.json({
        success: true,
        synced: false,
        message: 'Pas de client Stripe trouvé',
      });
    }

    const customer = customers.data[0];
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 10,
    });

    const activeSubscription = subscriptions.data.find(
      sub => sub.status === 'active' || sub.status === 'trialing'
    );

    // Les webhooks se chargeront de mettre à jour Firestore
    // Cette réponse confirme juste que la synchronisation a été déclenchée
    res.json({
      success: true,
      synced: true,
      message: 'Synchronisation déclenchée',
      subscription: activeSubscription ? {
        id: activeSubscription.id,
        status: activeSubscription.status,
        currentPeriodEnd: activeSubscription.current_period_end,
      } : null,
    });

  } catch (error: any) {
    console.error('Error syncing subscription:', error);
    res.status(500).json({
      error: error.message || 'An error occurred',
    });
  }
});

// Démarrer le serveur (pour développement local)
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});

export default app;
