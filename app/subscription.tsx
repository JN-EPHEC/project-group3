/**
 * Écran d'abonnement Premium
 * Permet à l'utilisateur de choisir entre abonnement mensuel ou annuel
 */

import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '../constants/stripeConfig';
import { StripeService } from '../constants/stripeService';

export default function SubscriptionScreen() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('yearly');
  const [loading, setLoading] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    checkSubscriptionStatus();
    
    // Détecter le retour de Stripe via les query params
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get('success');
      const sessionId = urlParams.get('session_id');
      
      if (success === 'true' && sessionId) {
        // Nettoyer l'URL
        window.history.replaceState({}, '', '/subscription');
        
        // Afficher un message de succès
        Alert.alert(
          '🎉 Bienvenue Premium !',
          'Votre essai gratuit de 30 jours a commencé. Profitez de toutes les fonctionnalités premium !',
          [{ text: 'OK' }]
        );
        
        // Recharger le statut
        setTimeout(() => checkSubscriptionStatus(), 1000);
      }
    }
    
    // Recharger le statut quand l'écran reprend le focus
    const interval = setInterval(() => {
      checkSubscriptionStatus();
    }, 3000); // Vérifier toutes les 3 secondes

    return () => clearInterval(interval);
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) return;

      const hasActive = await StripeService.hasActiveSubscription(user.uid);
      setHasSubscription(hasActive);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      const plan = SUBSCRIPTION_PLANS[selectedPlan];
      
      await StripeService.createCheckoutSession(plan.priceId);
      
      // L'utilisateur est maintenant redirigé vers Stripe Checkout
      // Le deep linking gérera le retour
      
    } catch (error: any) {
      Alert.alert(
        'Erreur',
        error.message || 'Impossible de créer la session de paiement'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) return;

      const status = await StripeService.getSubscriptionStatus(user.uid);
      
      // Ouvrir le Customer Portal (nécessite le customerId)
      // Pour l'instant, rediriger vers les paramètres
      router.push('/(tabs)/Profil');
      
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de gérer votre abonnement');
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (hasSubscription) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>✅ Abonnement Actif</Text>
          <Text style={styles.subtitle}>
            Vous bénéficiez de toutes les fonctionnalités Premium
          </Text>
        </View>

        <TouchableOpacity
          style={styles.manageButton}
          onPress={handleManageSubscription}
          disabled={loading}
        >
          <Text style={styles.manageButtonText}>
            Gérer mon abonnement
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Passez à Premium</Text>
          <Text style={styles.subtitle}>
            🎉 30 jours d'essai gratuit, sans engagement
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <Feature icon="✨" text="Accès à toutes les fonctionnalités" />
          <Feature icon="📊" text="Rapports et analyses avancées" />
          <Feature icon="🔔" text="Notifications illimitées" />
          <Feature icon="☁️" text="Synchronisation cloud" />
          <Feature icon="🎯" text="Support prioritaire" />
        </View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          {/* Plan Annuel */}
          <PlanCard
            plan="yearly"
            selected={selectedPlan === 'yearly'}
            onSelect={() => setSelectedPlan('yearly')}
            badge="MEILLEURE OFFRE"
          />

          {/* Plan Mensuel */}
          <PlanCard
            plan="monthly"
            selected={selectedPlan === 'monthly'}
            onSelect={() => setSelectedPlan('monthly')}
          />
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={[styles.subscribeButton, loading && styles.buttonDisabled]}
          onPress={handleSubscribe}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.subscribeButtonText}>
              Commencer l'essai gratuit
            </Text>
          )}
        </TouchableOpacity>

        {/* Terms */}
        <Text style={styles.terms}>
          L'essai gratuit dure 30 jours. Aucun débit ne sera effectué pendant cette période.
          Vous pouvez annuler à tout moment avant la fin de l'essai.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// Composant Feature
const Feature = ({ icon, text }: { icon: string; text: string }) => (
  <View style={styles.feature}>
    <Text style={styles.featureIcon}>{icon}</Text>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

// Composant PlanCard
const PlanCard = ({
  plan,
  selected,
  onSelect,
  badge,
}: {
  plan: SubscriptionPlan;
  selected: boolean;
  onSelect: () => void;
  badge?: string;
}) => {
  const planDetails = SUBSCRIPTION_PLANS[plan];

  return (
    <TouchableOpacity
      style={[styles.planCard, selected && styles.planCardSelected]}
      onPress={onSelect}
    >
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}

      <View style={styles.planHeader}>
        <Text style={styles.planName}>{planDetails.name}</Text>
        {planDetails.savings && (
          <Text style={styles.savings}>Économisez {planDetails.savings}</Text>
        )}
      </View>

      <View style={styles.priceContainer}>
        <Text style={styles.price}>{planDetails.price}€</Text>
        <Text style={styles.priceInterval}>/ {planDetails.interval === 'month' ? 'mois' : 'an'}</Text>
      </View>

      <Text style={styles.trial}>
        Puis {planDetails.price}€/{planDetails.interval === 'month' ? 'mois' : 'an'}
      </Text>

      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  featuresContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  plansContainer: {
    marginBottom: 30,
  },
  planCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planHeader: {
    marginBottom: 10,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  savings: {
    fontSize: 14,
    color: '#28A745',
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 5,
  },
  price: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  priceInterval: {
    fontSize: 16,
    color: '#666',
    marginLeft: 5,
  },
  trial: {
    fontSize: 14,
    color: '#666',
  },
  radio: {
    position: 'absolute',
    right: 20,
    top: '50%',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CCC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#007AFF',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  subscribeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  terms: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  manageButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    margin: 20,
  },
  manageButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
