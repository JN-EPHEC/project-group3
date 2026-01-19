/**
 * Page de gestion d'abonnement
 * Affiche tous les détails de l'abonnement de l'utilisateur :
 * - Type d'abonnement (mensuel/annuel)
 * - Date de début
 * - Date de fin/renouvellement
 * - Durée depuis l'abonnement
 * - Statut de l'abonnement
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SUBSCRIPTION_PLANS } from '../constants/stripeConfig';
import { StripeService } from '../constants/stripeService';

interface SubscriptionDetails {
  type: 'monthly' | 'yearly' | 'unknown';
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  daysSubscribed: number;
  daysRemaining: number;
  price: number;
  isTrialing: boolean;
  cancelAtPeriodEnd: boolean;
}

export default function ManageSubscriptionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<SubscriptionDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriptionDetails();
  }, []);

  const loadSubscriptionDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        setError('Utilisateur non connecté');
        return;
      }

      // Récupérer les informations d'abonnement
      console.log('📱 Récupération des infos d\'abonnement pour:', user.uid);
      
      // Utiliser la même méthode que la page Profil
      const subInfo: any = await StripeService.getSubscriptionStatus(user.uid);
      console.log('📊 Infos d\'abonnement récupérées:', JSON.stringify(subInfo, null, 2));
      
      if (!subInfo || typeof subInfo !== 'object') {
        console.error('❌ subInfo invalide:', subInfo);
        setError('Impossible de récupérer les informations d\'abonnement');
        return;
      }
      
      console.log('✅ hasActiveSubscription:', subInfo.hasActiveSubscription);
      console.log('✅ subscription:', subInfo.subscription);
      
      if (!subInfo.hasActiveSubscription || !subInfo.subscription) {
        setError('Aucun abonnement actif trouvé');
        return;
      }

      const sub: any = subInfo.subscription;
      
      // Déterminer le type d'abonnement en récupérant les détails complets depuis Stripe
      let subscriptionType: 'monthly' | 'yearly' | 'unknown' = 'unknown';
      let price = 0;
      
      try {
        const stripeStatus = await StripeService.getSubscriptionStatus(user.uid);
        if (stripeStatus.subscription) {
          const subscriptionId = stripeStatus.subscription.id;
          
          // Comparer avec les price IDs connus
          // Note: Pour une vraie implémentation, il faudrait récupérer le price_id depuis Stripe
          // Pour l'instant, on estime basé sur le montant ou les métadonnées
          
          // Essayer de deviner basé sur le currentPeriodEnd
          const periodStart = new Date((stripeStatus.subscription as any).current_period_start * 1000);
          const periodEnd = new Date(stripeStatus.subscription.currentPeriodEnd * 1000);
          const periodDays = Math.round((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
          
          if (periodDays > 200) {
            subscriptionType = 'yearly';
            price = SUBSCRIPTION_PLANS.yearly.price;
          } else if (periodDays < 100) {
            subscriptionType = 'monthly';
            price = SUBSCRIPTION_PLANS.monthly.price;
          }
        }
      } catch (e) {
        console.error('Erreur lors de la récupération des détails Stripe:', e);
      }

      // Calculer les dates
      const now = new Date();
      // StripeService retourne des timestamps en secondes (epoch)
      let endDate: Date | null = null;
      if (sub.currentPeriodEnd) {
        // currentPeriodEnd est un timestamp en secondes
        endDate = new Date(sub.currentPeriodEnd * 1000);
      }
      
      // Estimer la date de début (date de fin - durée de la période)
      let startDate: Date | null = null;
      if (endDate) {
        startDate = new Date(endDate);
        if (subscriptionType === 'yearly') {
          startDate.setFullYear(startDate.getFullYear() - 1);
        } else if (subscriptionType === 'monthly') {
          startDate.setMonth(startDate.getMonth() - 1);
        }
      }

      // Calculer la durée depuis l'abonnement
      const daysSubscribed = startDate 
        ? Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Calculer les jours restants
      const daysRemaining = endDate
        ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      setDetails({
        type: subscriptionType,
        status: sub.status || 'unknown',
        startDate,
        endDate,
        daysSubscribed,
        daysRemaining,
        price,
        isTrialing: sub.status === 'trialing',
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd || false,
      });

    } catch (error: any) {
      console.error('Erreur lors du chargement des détails:', error);
      setError(error.message || 'Impossible de charger les détails de l\'abonnement');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Annuler l\'abonnement',
      'Pour annuler votre abonnement, veuillez nous contacter à support@example.com ou gérer votre abonnement depuis le portail Stripe.',
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Chargement des détails...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gérer l'abonnement</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadSubscriptionDetails}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!details) {
    return null;
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'Non disponible';
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getSubscriptionTypeName = () => {
    switch (details.type) {
      case 'monthly':
        return 'Abonnement Mensuel';
      case 'yearly':
        return 'Abonnement Annuel';
      default:
        return 'Abonnement';
    }
  };

  const getStatusBadge = () => {
    if (details.isTrialing) {
      return { text: 'Période d\'essai', color: '#FF9500' };
    }
    if (details.cancelAtPeriodEnd) {
      return { text: 'Résiliation programmée', color: '#FF3B30' };
    }
    if (details.status === 'active') {
      return { text: 'Actif', color: '#34C759' };
    }
    return { text: details.status, color: '#8E8E93' };
  };

  const statusBadge = getStatusBadge();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gérer l'abonnement</Text>
        </View>

        {/* Status Badge */}
        <View style={styles.statusBadgeContainer}>
          <View style={[styles.statusBadge, { backgroundColor: statusBadge.color }]}>
            <Text style={styles.statusBadgeText}>{statusBadge.text}</Text>
          </View>
        </View>

        {/* Subscription Type */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📦</Text>
            <Text style={styles.cardTitle}>Type d'abonnement</Text>
          </View>
          <Text style={styles.cardValue}>{getSubscriptionTypeName()}</Text>
          {details.price > 0 && (
            <Text style={styles.cardSubValue}>
              {details.price.toFixed(2)}€ / {details.type === 'yearly' ? 'an' : 'mois'}
            </Text>
          )}
        </View>

        {/* Start Date */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📅</Text>
            <Text style={styles.cardTitle}>Date de début</Text>
          </View>
          <Text style={styles.cardValue}>{formatDate(details.startDate)}</Text>
          {details.daysSubscribed > 0 && (
            <Text style={styles.cardSubValue}>
              Il y a {details.daysSubscribed} jour{details.daysSubscribed > 1 ? 's' : ''}
            </Text>
          )}
        </View>

        {/* End Date / Renewal */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>🔄</Text>
            <Text style={styles.cardTitle}>
              {details.cancelAtPeriodEnd ? 'Date d\'expiration' : 'Prochain renouvellement'}
            </Text>
          </View>
          <Text style={styles.cardValue}>{formatDate(details.endDate)}</Text>
          {details.daysRemaining > 0 && (
            <Text style={styles.cardSubValue}>
              Dans {details.daysRemaining} jour{details.daysRemaining > 1 ? 's' : ''}
            </Text>
          )}
        </View>

        {/* Subscription Duration */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>⏱️</Text>
            <Text style={styles.cardTitle}>Durée d'abonnement</Text>
          </View>
          <Text style={styles.cardValue}>
            {details.daysSubscribed} jour{details.daysSubscribed > 1 ? 's' : ''}
          </Text>
          {details.daysSubscribed > 30 && (
            <Text style={styles.cardSubValue}>
              Soit environ {Math.floor(details.daysSubscribed / 30)} mois
            </Text>
          )}
        </View>

        {/* Trial Info */}
        {details.isTrialing && (
          <View style={[styles.card, styles.trialCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🎉</Text>
              <Text style={styles.cardTitle}>Période d'essai gratuite</Text>
            </View>
            <Text style={styles.cardValue}>
              Plus que {details.daysRemaining} jour{details.daysRemaining > 1 ? 's' : ''} d'essai
            </Text>
            <Text style={styles.cardSubValue}>
              Aucun débit ne sera effectué pendant cette période
            </Text>
          </View>
        )}

        {/* Cancellation Info */}
        {details.cancelAtPeriodEnd && (
          <View style={[styles.card, styles.cancelCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>⚠️</Text>
              <Text style={styles.cardTitle}>Résiliation programmée</Text>
            </View>
            <Text style={styles.cardValue}>
              Votre abonnement prendra fin le {formatDate(details.endDate)}
            </Text>
            <Text style={styles.cardSubValue}>
              Vous conservez l'accès jusqu'à cette date
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {!details.cancelAtPeriodEnd && (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleCancelSubscription}
            >
              <Text style={styles.cancelButtonText}>Annuler l'abonnement</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={loadSubscriptionDetails}
          >
            <Text style={styles.refreshButtonText}>Actualiser</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Pour toute question concernant votre abonnement, contactez-nous à support@example.com
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  statusBadgeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  cardSubValue: {
    fontSize: 14,
    color: '#8E8E93',
  },
  trialCard: {
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  cancelCard: {
    backgroundColor: '#FFE6E6',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  actionsContainer: {
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#E5E5EA',
    borderRadius: 12,
  },
  footerText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
