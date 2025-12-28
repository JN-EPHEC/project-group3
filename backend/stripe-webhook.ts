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

import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import Stripe from 'stripe';
import { dateToTimestamp, db, timestamp } from './firebase-admin';

// Charger les variables d'environnement depuis la racine du projet
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();

// Configuration Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
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
 * Enregistre le client Stripe et initialise l'abonnement
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('💳 Checkout completed:', session.id);

  const userId = session.metadata?.userId;
  if (!userId) {
    console.error('❌ No userId in session metadata');
    return;
  }

  // Créer ou mettre à jour l'utilisateur dans Firestore
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  // Si l'utilisateur n'existe pas, le créer
  if (!userDoc.exists) {
    console.log(`📝 Créant nouvel utilisateur: ${userId}`);
    await userRef.set({
      uid: userId,
      createdAt: timestamp(),
    });
  }

  // Mettre à jour avec les informations Stripe
  const updateData: any = {
    stripeCustomerId: session.customer,
    subscriptionUpdatedAt: timestamp(),
  };

  // Si c'est un abonnement, ajouter les infos
  if (session.subscription) {
    updateData.subscriptionId = session.subscription;
    
    // Récupérer les détails de l'abonnement
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    
    updateData.subscriptionStatus = subscription.status;
    updateData.currentPeriodEnd = dateToTimestamp(new Date(subscription.current_period_end * 1000));
    updateData.cancelAtPeriodEnd = subscription.cancel_at_period_end || false;
    updateData.lastPaymentFailed = false;
    
    if (subscription.trial_end) {
      updateData.trialEnd = dateToTimestamp(new Date(subscription.trial_end * 1000));
    }
  }

  await userRef.update(updateData);

  console.log(`✅ User ${userId} subscription started`);
}

/**
 * Abonnement créé
 * Enregistre les détails de l'abonnement dans Firestore
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('📝 Subscription created:', subscription.id);

  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error('❌ No userId in subscription metadata');
    return;
  }

  const updateData: any = {
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    currentPeriodEnd: dateToTimestamp(new Date(subscription.current_period_end * 1000)),
    trialEnd: subscription.trial_end ? dateToTimestamp(new Date(subscription.trial_end * 1000)) : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
    lastPaymentFailed: false,
    subscriptionUpdatedAt: timestamp(),
  };

  await db.collection('users').doc(userId).update(updateData);

  console.log(`✅ User ${userId} subscription created: ${subscription.id}`);
}

/**
 * Abonnement mis à jour
 * Synchronise les changements (renouvellement, changement de plan, résiliation, etc.)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('🔄 Subscription updated:', subscription.id);

  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error('❌ No userId in subscription metadata');
    return;
  }

  const updateData: any = {
    subscriptionStatus: subscription.status,
    currentPeriodEnd: dateToTimestamp(new Date(subscription.current_period_end * 1000)),
    cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
    lastPaymentFailed: false,
    subscriptionUpdatedAt: timestamp(),
  };

  // Mettre à jour trialEnd si en période d'essai
  if (subscription.trial_end) {
    updateData.trialEnd = dateToTimestamp(new Date(subscription.trial_end * 1000));
  }

  await db.collection('users').doc(userId).update(updateData);

  console.log(`✅ User ${userId} subscription updated: ${subscription.status}`);
}

/**
 * Abonnement supprimé/annulé
 * Mise à jour du statut de l'abonnement à 'canceled'
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('❌ Subscription deleted:', subscription.id);

  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error('❌ No userId in subscription metadata');
    return;
  }

  await db.collection('users').doc(userId).update({
    subscriptionStatus: 'canceled',
    subscriptionId: null,
    currentPeriodEnd: null,
    trialEnd: null,
    cancelAtPeriodEnd: false,
    lastPaymentFailed: false,
    subscriptionUpdatedAt: timestamp(),
  });

  console.log(`✅ User ${userId} subscription canceled`);
}

/**
 * Échec de paiement
 * Marque l'utilisateur comme ayant une erreur de paiement
 * L'abonnement est généralement mis en suspens après quelques tentatives
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.error('⚠️ Payment failed for invoice:', invoice.id);

  const customerId = invoice.customer as string;
  
  // Récupérer le client pour obtenir l'userId
  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
  const userId = customer.metadata?.userId;

  if (!userId) {
    console.error('❌ No userId in customer metadata');
    return;
  }

  // Marquer comme impayé et enregistrer l'erreur
  await db.collection('users').doc(userId).update({
    lastPaymentFailed: true,
    lastPaymentFailedAt: timestamp(),
    subscriptionUpdatedAt: timestamp(),
    subscriptionStatus: 'past_due', // Marquer comme en retard de paiement
  });

  console.log(`⚠️ User ${userId} payment failed - action required`);
  // TODO: Envoyer une notification push à l'utilisateur pour relancer le paiement
}

/**
 * Facture payée avec succès
 * Remet l'abonnement en bon état après paiement
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log('✅ Invoice paid:', invoice.id);

  const customerId = invoice.customer as string;
  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
  const userId = customer.metadata?.userId;

  if (!userId) {
    console.error('❌ No userId in customer metadata');
    return;
  }

  // Récupérer l'abonnement pour mettre à jour la période
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    
    await db.collection('users').doc(userId).update({
      subscriptionStatus: subscription.status,
      currentPeriodEnd: dateToTimestamp(new Date(subscription.current_period_end * 1000)),
      lastPaymentFailed: false,
      subscriptionUpdatedAt: timestamp(),
    });
  } else {
    // Juste mettre à jour le statut de paiement
    await db.collection('users').doc(userId).update({
      lastPaymentFailed: false,
      subscriptionUpdatedAt: timestamp(),
    });
  }

  console.log(`✅ User ${userId} payment successful - subscription renewed`);
}

export default app;
