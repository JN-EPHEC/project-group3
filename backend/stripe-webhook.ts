/**
 * Gestionnaire de Webhook Stripe - Version Blindée contre les Dates Invalides
 */

import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import Stripe from 'stripe';
import { dateToTimestamp, db, timestamp } from './firebase-admin';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export const handleStripeWebhook = async (req: express.Request, res: express.Response) => {
  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) throw new Error('Missing Stripe signature or Webhook Secret');
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('⚠️ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Log concis pour éviter de polluer
  console.log(`📨 Webhook: ${event.type}`);

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
        break;
    }
    res.json({ received: true });
  } catch (error: any) {
    console.error('❌ Error handling webhook logic:', error);
    res.json({ received: true, error: error.message });
  }
};

// --- Helper de Sécurité (La correction est ICI) ---

/**
 * Convertit un timestamp Stripe (secondes) en Timestamp Firestore de manière sécurisée.
 * Renvoie null si la date est invalide, évitant le crash "valid integer".
 */
function safeDateToTimestamp(seconds: number | null | undefined) {
  if (typeof seconds !== 'number') return null;
  
  const ms = seconds * 1000;
  if (isNaN(ms)) return null;

  const date = new Date(ms);
  // Vérifie si la date est valide (getTime ne renvoie pas NaN)
  if (isNaN(date.getTime())) {
      console.warn(`⚠️ Date invalide reçue de Stripe: ${seconds}`);
      return null;
  }

  try {
    return dateToTimestamp(date);
  } catch (e) {
    console.error('⚠️ Erreur conversion dateToTimestamp:', e);
    return null;
  }
}

// Fonction pour récupérer l'ID utilisateur de manière robuste
async function getUserIdFromCustomer(customerOrId: string | Stripe.Customer | Stripe.DeletedCustomer | null): Promise<string | undefined> {
  if (!customerOrId) return undefined;
  
  if (typeof customerOrId !== 'string' && 'metadata' in customerOrId && customerOrId.metadata?.userId) {
    return customerOrId.metadata.userId;
  }

  const customerId = typeof customerOrId === 'string' ? customerOrId : customerOrId.id;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted && customer.metadata?.userId) {
      return customer.metadata.userId;
    }
  } catch (e) {
    console.error('Error retrieving customer:', e);
  }
  return undefined;
}

// --- Handlers ---

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  let userId = session.metadata?.userId || await getUserIdFromCustomer(session.customer);
  if (!userId) return;

  const updateData: any = {
    uid: userId,
    stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
    subscriptionUpdatedAt: timestamp(),
  };

  if (session.subscription) {
    updateData.subscriptionId = session.subscription;
    const sub = await stripe.subscriptions.retrieve(session.subscription as string);
    updateData.subscriptionStatus = sub.status;
    // Utilisation du helper sécurisé
    updateData.currentPeriodEnd = safeDateToTimestamp(sub.current_period_end);
    updateData.trialEnd = safeDateToTimestamp(sub.trial_end);
    updateData.cancelAtPeriodEnd = sub.cancel_at_period_end || false;
  }

  await db.collection('users').doc(userId).set(updateData, { merge: true });
  console.log(`✅ User ${userId} updated after checkout`);
}

async function handleSubscriptionCreated(sub: Stripe.Subscription) {
  let userId = sub.metadata?.userId || await getUserIdFromCustomer(sub.customer);
  if (!userId) { 
      console.error('❌ Sub Created: userId introuvable'); 
      return; 
  }

  console.log(`📝 Traitement Sub Created pour ${userId}. Fin: ${sub.current_period_end}`);

  const updateData: any = {
    uid: userId,
    subscriptionId: sub.id,
    subscriptionStatus: sub.status,
    // Utilisation du helper sécurisé
    currentPeriodEnd: safeDateToTimestamp(sub.current_period_end),
    trialEnd: safeDateToTimestamp(sub.trial_end),
    cancelAtPeriodEnd: sub.cancel_at_period_end || false,
    lastPaymentFailed: false,
    subscriptionUpdatedAt: timestamp(),
  };

  await db.collection('users').doc(userId).set(updateData, { merge: true });
  console.log(`✅ User ${userId} subscription created: ${sub.status}`);
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  let userId = sub.metadata?.userId || await getUserIdFromCustomer(sub.customer);
  if (!userId) return;

  const updateData: any = {
    uid: userId,
    subscriptionStatus: sub.status,
    currentPeriodEnd: safeDateToTimestamp(sub.current_period_end),
    trialEnd: safeDateToTimestamp(sub.trial_end),
    cancelAtPeriodEnd: sub.cancel_at_period_end || false,
    subscriptionUpdatedAt: timestamp(),
  };

  await db.collection('users').doc(userId).set(updateData, { merge: true });
  console.log(`✅ User ${userId} subscription updated: ${sub.status}`);
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  let userId = sub.metadata?.userId || await getUserIdFromCustomer(sub.customer);
  if (!userId) return;

  await db.collection('users').doc(userId).set({
    subscriptionStatus: 'canceled',
    subscriptionId: null,
    currentPeriodEnd: null,
    trialEnd: null,
    cancelAtPeriodEnd: false,
    subscriptionUpdatedAt: timestamp(),
  }, { merge: true });
  
  console.log(`✅ User ${userId} subscription canceled`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const userId = await getUserIdFromCustomer(invoice.customer);
  if (!userId) return;

  await db.collection('users').doc(userId).set({
    lastPaymentFailed: true,
    lastPaymentFailedAt: timestamp(),
    subscriptionStatus: 'past_due',
  }, { merge: true });
  
  console.log(`⚠️ User ${userId} payment failed`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const userId = await getUserIdFromCustomer(invoice.customer);
  if (!userId) return;

  if (invoice.subscription) {
     const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
     await db.collection('users').doc(userId).set({
        subscriptionStatus: sub.status,
        currentPeriodEnd: safeDateToTimestamp(sub.current_period_end),
        lastPaymentFailed: false
     }, { merge: true });
  } else {
     await db.collection('users').doc(userId).set({
        lastPaymentFailed: false
     }, { merge: true });
  }
  console.log(`✅ User ${userId} invoice paid`);
}