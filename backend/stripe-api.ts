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
import Stripe from 'stripe';

// Charger les variables d'environnement
dotenv.config();

const app = express();

// Origins autorisées pour le développement (configurable via ALLOWED_ORIGINS)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:19006',
  'http://127.0.0.1:19006',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:8082',
  'http://127.0.0.1:8082',
  'http://localhost:8083',
  'http://127.0.0.1:8083',
  'http://localhost:8084',
  'http://127.0.0.1:8084',
  'http://localhost:8085',
  'http://127.0.0.1:8085',
  'http://localhost:8086',
  'http://127.0.0.1:8086',
].join(','))
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Configuration Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Requêtes sans en-tête Origin (ex: mobile native)
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`Blocked CORS origin: ${origin}`);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

/**
 * POST /api/create-checkout-session
 * Crée une session Stripe Checkout avec essai gratuit de 30 jours
 */
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { priceId, userId, userEmail } = req.body;

    // Validation
    if (!priceId) {
      return res.status(400).json({ error: 'priceId is required' });
    }

    if (!userId || !userEmail) {
      return res.status(400).json({ error: 'userId and userEmail are required' });
    }

    // Vérifier que le priceId est valide
    const validPriceIds = [
      'price_1SiXfe2OiYebg9QDRWHm63We0', // Mensuel
      'price_1SiXfe2OiYebg9QDfh8rWIcX1', // Annuel
    ];

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
    } else {
      customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          userId: userId,
        },
      });
    }

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

      // URLs de redirection (Deep Linking)
      success_url: `myapp://payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `myapp://payment-cancelled`,

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
 */
app.get('/api/subscription-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Rechercher le client Stripe via les métadonnées
    const customers = await stripe.customers.list({
      limit: 1,
    });

    const customer = customers.data.find(c => c.metadata.userId === userId);

    if (!customer) {
      return res.json({
        hasActiveSubscription: false,
        subscription: null,
      });
    }

    // Récupérer les abonnements actifs
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return res.json({
        hasActiveSubscription: false,
        subscription: null,
      });
    }

    const subscription = subscriptions.data[0];

    res.json({
      hasActiveSubscription: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialEnd: subscription.trial_end,
      },
    });

  } catch (error: any) {
    console.error('Error fetching subscription status:', error);
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
