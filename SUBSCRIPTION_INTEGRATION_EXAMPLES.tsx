/**
 * Exemple d'intégration - Écran de profil avec affichage d'abonnement
 * Ce fichier montre comment intégrer le système d'abonnement dans un écran existant
 */

import SubscriptionDisplay from '@/components/SubscriptionDisplay';
import { STRIPE_CONFIG } from '@/constants/stripeConfig';
import { StripeService } from '@/constants/stripeService';
import { getUserCurrentSubscriptionInfo } from '@/constants/subscriptionSync';
import { COLORS, FONT_SIZES, SPACING } from '@/constants/theme';
import { getAuth } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * EXEMPLE 1: Afficher simplement le composant d'abonnement
 */
export function ProfileScreenSimple() {
  const handleSubscribe = async () => {
    try {
      await StripeService.createCheckoutSession(STRIPE_CONFIG.PRICES.monthly);
    } catch (error) {
      console.error('Error:', error);
      alert('Erreur lors du paiement');
    }
  };

  const handleManageSubscription = async () => {
    try {
      const subInfo = await getUserCurrentSubscriptionInfo();
      if (subInfo.stripeCustomerId) {
        await StripeService.openCustomerPortal(subInfo.stripeCustomerId);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Erreur lors de l\'accès au portail');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Mon Profil</Text>
        
        {/* Afficher le composant d'abonnement */}
        <SubscriptionDisplay
          onSubscriptionPress={handleSubscribe}
          onManagePress={handleManageSubscription}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * EXEMPLE 2: Affichage compact dans la barre d'en-tête
 */
export function ProfileScreenWithCompactBadge() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mon Profil</Text>
        
        {/* Badge compact dans l'en-tête */}
        <SubscriptionDisplay
          compact={true}
          style={styles.compactBadge}
        />
      </View>
      
      <ScrollView>
        {/* Reste du contenu */}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * EXEMPLE 3: Affichage personnalisé avec gestion des états
 */
export function ProfileScreenCustomized() {
  const [subInfo, setSubInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    loadSubscriptionInfo();
  }, []);

  const loadSubscriptionInfo = async () => {
    try {
      const info = await getUserCurrentSubscriptionInfo();
      setSubInfo(info);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      const priceId = STRIPE_CONFIG.PRICES.monthly;
      await StripeService.createCheckoutSession(priceId);
      
      // Après le paiement, recharger les infos
      setTimeout(() => loadSubscriptionInfo(), 2000);
    } catch (error) {
      console.error('Error:', error);
      alert('Erreur lors de la création de l\'abonnement');
    }
  };

  if (isLoading) {
    return <Text style={styles.loadingText}>Chargement...</Text>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Mon Profil</Text>

        {/* Afficher différemment selon le statut */}
        {subInfo?.hasActiveSubscription ? (
          <View style={styles.premiumSection}>
            <Text style={styles.sectionTitle}>✨ Compte Premium</Text>
            <Text style={styles.sectionText}>
              Vous avez accès à toutes les fonctionnalités premium
            </Text>
            
            {/* Afficher les détails de l'abonnement */}
            <SubscriptionDisplay />
          </View>
        ) : (
          <View style={styles.freeSection}>
            <Text style={styles.sectionTitle}>Compte Gratuit</Text>
            <Text style={styles.sectionText}>
              Passez à Premium pour débloquer toutes les fonctionnalités
            </Text>
            
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={handleSubscribe}
            >
              <Text style={styles.upgradeButtonText}>
                Passer à Premium - {STRIPE_CONFIG.CURRENCY} 9,99/mois
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * EXEMPLE 4: Intégration avec contrôle d'accès aux fonctionnalités
 */
export function ProtectedFeatureScreen() {
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const subInfo = await getUserCurrentSubscriptionInfo();
      setHasAccess(subInfo.hasActiveSubscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setHasAccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Text style={styles.loadingText}>Vérification de l'abonnement...</Text>;
  }

  if (!hasAccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.lockScreen}>
          <Text style={styles.lockTitle}>🔒 Fonctionnalité Premium</Text>
          <Text style={styles.lockText}>
            Cette fonctionnalité nécessite un abonnement actif
          </Text>
          
          <SubscriptionDisplay
            onSubscriptionPress={async () => {
              try {
                await StripeService.createCheckoutSession(STRIPE_CONFIG.PRICES.monthly);
              } catch (error) {
                console.error('Error:', error);
              }
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Afficher le contenu premium
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Contenu Premium</Text>
        {/* Contenu ici */}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * EXEMPLE 5: Onglet d'abonnement dédié
 */
export function SubscriptionTabScreen() {
  const handleMonthlyPlan = async () => {
    try {
      await StripeService.createCheckoutSession(STRIPE_CONFIG.PRICES.monthly);
    } catch (error) {
      console.error('Error:', error);
      alert('Erreur lors de la souscription');
    }
  };

  const handleYearlyPlan = async () => {
    try {
      await StripeService.createCheckoutSession(STRIPE_CONFIG.PRICES.yearly);
    } catch (error) {
      console.error('Error:', error);
      alert('Erreur lors de la souscription');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Nos Plans</Text>

        {/* Afficher le statut actuel */}
        <SubscriptionDisplay />

        {/* Plans disponibles */}
        <View style={styles.plansContainer}>
          {/* Plan mensuel */}
          <TouchableOpacity
            style={styles.planCard}
            onPress={handleMonthlyPlan}
          >
            <Text style={styles.planName}>Plan Mensuel</Text>
            <Text style={styles.planPrice}>9,99 € / mois</Text>
            <Text style={styles.planFeatures}>• Accès complet</Text>
            <Text style={styles.planFeatures}>• Support prioritaire</Text>
            <Text style={styles.planFeatures}>• Essai gratuit 30 jours</Text>
            <TouchableOpacity style={styles.planButton}>
              <Text style={styles.planButtonText}>Souscrire</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Plan annuel */}
          <TouchableOpacity
            style={[styles.planCard, styles.planCardHighlight]}
            onPress={handleYearlyPlan}
          >
            <View style={styles.badgePopular}>
              <Text style={styles.badgeText}>Économisez 20%</Text>
            </View>
            <Text style={styles.planName}>Plan Annuel</Text>
            <Text style={styles.planPrice}>95,88 € / an</Text>
            <Text style={styles.planFeatures}>• Tout du plan mensuel</Text>
            <Text style={styles.planFeatures}>• Facturation annuelle</Text>
            <Text style={styles.planFeatures}>• Réductions exclusives</Text>
            <TouchableOpacity style={styles.planButton}>
              <Text style={styles.planButtonText}>Souscrire</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {/* FAQ */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Questions Fréquentes</Text>
          <Text style={styles.faqQuestion}>Puis-je annuler mon abonnement ?</Text>
          <Text style={styles.faqAnswer}>
            Oui, vous pouvez annuler à tout moment depuis vos paramètres.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.large,
  },
  header: {
    padding: SPACING.large,
  },
  title: {
    fontSize: FONT_SIZES.huge,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.large,
  },
  compactBadge: {
    marginTop: SPACING.medium,
  },
  loadingText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.large,
  },
  // Premium section
  premiumSection: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: SPACING.large,
    marginBottom: SPACING.large,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: SPACING.medium,
  },
  sectionText: {
    fontSize: FONT_SIZES.medium,
    color: '#2E7D32',
    marginBottom: SPACING.large,
  },
  // Free section
  freeSection: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: SPACING.large,
    marginBottom: SPACING.large,
  },
  upgradeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.large,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: SPACING.medium,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: FONT_SIZES.medium,
  },
  // Lock screen
  lockScreen: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.large,
  },
  lockTitle: {
    fontSize: FONT_SIZES.huge,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.medium,
  },
  lockText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.large,
  },
  // Plans
  plansContainer: {
    flexDirection: 'column',
    gap: SPACING.large,
    marginVertical: SPACING.large,
  },
  planCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.large,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  planCardHighlight: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  badgePopular: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.medium,
    paddingVertical: SPACING.small,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: SPACING.medium,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: FONT_SIZES.small,
  },
  planName: {
    fontSize: FONT_SIZES.large,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  planPrice: {
    fontSize: FONT_SIZES.huge,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.medium,
  },
  planFeatures: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small,
  },
  planButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.medium,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: SPACING.large,
  },
  planButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: FONT_SIZES.medium,
  },
  // FAQ
  faqSection: {
    marginTop: SPACING.large,
  },
  faqTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.medium,
  },
  faqQuestion: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  faqAnswer: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.large,
  },
});

export default ProfileScreenSimple;
