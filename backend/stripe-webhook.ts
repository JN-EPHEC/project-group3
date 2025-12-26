/**
 * Gestionnaire de Webhook Stripe
 * Configure l'URL dans : Stripe Dashboard → Developers → Webhooks
 * 
 * Événements à écouter :
 * - checkout.session.completed
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_failed
 */

import express from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';

const app = express();

// Configuration Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * POST /webhook/stripe
 * Endpoint pour recevoir les événements Stripe
 */
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event: Stripe.Event;

  try {
    // Vérifier la signature du webhook
    event = stripe.webhooks.constructEvent(req.body, sig!, webhookSecret);
  } catch (err: any) {
    console.error('⚠️ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('✅ Event received:', event.type);

  // Traiter les différents types d'événements
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Checkout Session terminée avec succès
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('💳 Checkout completed:', session.id);

  const userId = session.metadata?.userId;
  if (!userId) {
    console.error('No userId in session metadata');
    return;
  }

  const db = getFirestore();

  // Mettre à jour Firestore avec les informations de l'abonnement
  await db.collection('users').doc(userId).update({
    stripeCustomerId: session.customer,
    subscriptionStatus: 'trialing', // En période d'essai
    subscriptionId: session.subscription,
    updatedAt: new Date(),
  });

  console.log(`✅ User ${userId} subscription started (trial)`);
}

/**
 * Abonnement créé
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('📝 Subscription created:', subscription.id);

  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  const db = getFirestore();

  await db.collection('users').doc(userId).update({
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    updatedAt: new Date(),
  });
}

/**
 * Abonnement mis à jour
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('🔄 Subscription updated:', subscription.id);

  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  const db = getFirestore();

  await db.collection('users').doc(userId).update({
    subscriptionStatus: subscription.status,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    updatedAt: new Date(),
  });

  console.log(`✅ User ${userId} subscription updated: ${subscription.status}`);
}

/**
 * Abonnement supprimé/annulé
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('❌ Subscription deleted:', subscription.id);

  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  const db = getFirestore();

  await db.collection('users').doc(userId).update({
    subscriptionStatus: 'canceled',
    subscriptionId: null,
    currentPeriodEnd: null,
    updatedAt: new Date(),
  });

  console.log(`✅ User ${userId} subscription canceled`);
}

/**
 * Échec de paiement
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.error('⚠️ Payment failed for invoice:', invoice.id);

  const customerId = invoice.customer as string;
  
  // Récupérer le client pour obtenir l'userId
  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
  const userId = customer.metadata?.userId;

  if (!userId) {
    console.error('No userId in customer metadata');
    return;
  }

  const db = getFirestore();

  // Marquer comme impayé
  await db.collection('users').doc(userId).update({
    subscriptionStatus: 'past_due',
    lastPaymentFailed: true,
    updatedAt: new Date(),
  });

  // TODO: Envoyer une notification push à l'utilisateur
  console.log(`⚠️ User ${userId} payment failed`);
}

/**
 * Facture payée avec succès
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log('✅ Invoice paid:', invoice.id);

  const customerId = invoice.customer as string;
  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
  const userId = customer.metadata?.userId;

  if (!userId) {
    console.error('No userId in customer metadata');
    return;
  }

  const db = getFirestore();

  await db.collection('users').doc(userId).update({
    subscriptionStatus: 'active',
    lastPaymentFailed: false,
    updatedAt: new Date(),
  });

  console.log(`✅ User ${userId} payment successful`);
}

export default app;
