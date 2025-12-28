import { getFormattedCurrentSubscriptionStatus, refreshSubscriptionStatus } from '@/constants/subscriptionSync';
import { COLORS, FONT_SIZES, SPACING } from '@/constants/theme';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface SubscriptionDisplayProps {
  /**
   * Style personnalisé du conteneur
   */
  style?: any;
  /**
   * Affiche le statut d'abonnement de manière compacte (une ligne)
   */
  compact?: boolean;
  /**
   * Callback quand l'utilisateur clique pour accéder aux détails d'abonnement
   */
  onSubscriptionPress?: () => void;
  /**
   * Callback quand l'utilisateur clique pour gérer l'abonnement
   */
  onManagePress?: () => void;
  /**
   * Force une synchronisation avec Stripe
   */
  refreshOnLoad?: boolean;
}

/**
 * Composant pour afficher le statut d'abonnement d'un utilisateur
 * Affiche si l'utilisateur a un abonnement actif, sa date d'expiration, etc.
 */
export default function SubscriptionDisplay({
  style,
  compact = false,
  onSubscriptionPress,
  onManagePress,
  refreshOnLoad = true,
}: SubscriptionDisplayProps) {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('Chargement...');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les informations d'abonnement
  useEffect(() => {
    loadSubscriptionInfo();
  }, []);

  const loadSubscriptionInfo = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Optionnellement rafraîchir depuis Stripe
      if (refreshOnLoad) {
        await refreshSubscriptionStatus();
      }

      // Récupérer le statut formaté
      const formatted = await getFormattedCurrentSubscriptionStatus();
      setIsActive(formatted.isActive);
      setStatus(formatted.status);
      setDaysRemaining(formatted.daysRemaining);
      
      if (formatted.expiresAt) {
        const date = new Date(formatted.expiresAt);
        setExpiresAt(date.toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }));
      }
    } catch (err) {
      console.error('Error loading subscription info:', err);
      setError('Impossible de charger les informations d\'abonnement');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (compact) {
    // Affichage compact (une ligne)
    return (
      <TouchableOpacity
        style={[
          styles.compactContainer,
          isActive ? styles.compactActive : styles.compactInactive,
          style,
        ]}
        onPress={onSubscriptionPress}
      >
        <View style={styles.compactContent}>
          <Text style={[styles.compactText, isActive && styles.activeText]}>
            {status}
          </Text>
          {daysRemaining !== null && daysRemaining > 0 && (
            <Text style={[styles.compactSubtext, isActive && styles.activeSubtext]}>
              {daysRemaining === 0 ? 'Expire aujourd\'hui' : `${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}`}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // Affichage complet avec plus de détails
  return (
    <View style={[styles.container, style]}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>Abonnement</Text>
        <View
          style={[
            styles.statusBadge,
            isActive ? styles.activeBadge : styles.inactiveBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              isActive ? styles.activeStatusText : styles.inactiveStatusText,
            ]}
          >
            {isActive ? '✓ Actif' : 'Inactif'}
          </Text>
        </View>
      </View>

      {/* Contenu principal */}
      <View style={styles.content}>
        <Text style={styles.statusMessage}>{status}</Text>

        {expiresAt && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Expire le :</Text>
            <Text style={styles.infoValue}>{expiresAt}</Text>
          </View>
        )}

        {daysRemaining !== null && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Jours restants :</Text>
            <Text style={[
              styles.infoValue,
              daysRemaining < 7 && styles.warningText,
            ]}>
              {daysRemaining === 0 ? 'Expire aujourd\'hui' : `${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}`}
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={loadSubscriptionInfo}
        >
          <Text style={styles.secondaryButtonText}>Actualiser</Text>
        </TouchableOpacity>

        {isActive && onManagePress && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onManagePress}
          >
            <Text style={styles.primaryButtonText}>Gérer</Text>
          </TouchableOpacity>
        )}

        {!isActive && onSubscriptionPress && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onSubscriptionPress}
          >
            <Text style={styles.primaryButtonText}>Souscrire</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.large,
    marginVertical: SPACING.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.large,
  },
  title: {
    fontSize: FONT_SIZES.large,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: SPACING.medium,
    paddingVertical: SPACING.small,
    borderRadius: 20,
  },
  activeBadge: {
    backgroundColor: '#E8F5E9',
  },
  inactiveBadge: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
  },
  activeStatusText: {
    color: '#2E7D32',
  },
  inactiveStatusText: {
    color: '#E65100',
  },
  content: {
    marginBottom: SPACING.large,
  },
  statusMessage: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: SPACING.medium,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.small,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: FONT_SIZES.small,
    color: COLORS.text,
    fontWeight: '500',
  },
  warningText: {
    color: '#E65100',
    fontWeight: '700',
  },
  errorContainer: {
    marginTop: SPACING.medium,
    padding: SPACING.medium,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
  },
  errorText: {
    color: '#C62828',
    fontSize: FONT_SIZES.small,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.medium,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.medium,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: FONT_SIZES.medium,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.medium,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: FONT_SIZES.medium,
  },
  loadingText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  // Styles compacts
  compactContainer: {
    paddingHorizontal: SPACING.medium,
    paddingVertical: SPACING.small,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactActive: {
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  compactInactive: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#E65100',
  },
  compactContent: {
    flex: 1,
  },
  compactText: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
    color: COLORS.text,
  },
  activeText: {
    color: '#2E7D32',
  },
  compactSubtext: {
    fontSize: FONT_SIZES.small - 2,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  activeSubtext: {
    color: '#2E7D32',
  },
});
