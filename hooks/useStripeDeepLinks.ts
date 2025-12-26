/**
 * Composant racine pour gérer le Deep Linking Stripe
 * À intégrer dans _layout.tsx ou le composant principal
 */

import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { doc, getFirestore, updateDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import { Alert, Linking } from 'react-native';

export function useStripeDeepLinks() {
  const router = useRouter();

  useEffect(() => {
    // Gérer l'URL initiale (app ouvert via deep link)
    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Écouter les deep links pendant que l'app est active
    const subscription = Linking.addEventListener('url', event => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = async (url: string) => {
    console.log('Deep link received:', url);

    try {
      // Payment Success
      if (url.startsWith('myapp://payment-success')) {
        const urlParams = new URLSearchParams(url.split('?')[1]);
        const sessionId = urlParams.get('session_id');

        if (sessionId) {
          await handlePaymentSuccess(sessionId);
        }
      }

      // Payment Cancelled
      else if (url.startsWith('myapp://payment-cancelled')) {
        Alert.alert(
          'Paiement annulé',
          'Vous avez annulé le processus de paiement. Vous pouvez réessayer à tout moment.',
          [
            {
              text: 'OK',
              onPress: () => router.push('/(tabs)/Profil'),
            },
          ]
        );
      }

      // Settings return
      else if (url.startsWith('myapp://settings')) {
        router.push('/(tabs)/Profil');
      }

    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  };

  const handlePaymentSuccess = async (sessionId: string) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Mettre à jour Firestore (le webhook le fera aussi, mais c'est un backup)
      const db = getFirestore();
      const userRef = doc(db, 'users', user.uid);
      
      await updateDoc(userRef, {
        stripeSessionId: sessionId,
        subscriptionStatus: 'trialing',
        updatedAt: new Date(),
      });

      // Afficher un message de succès
      Alert.alert(
        '🎉 Bienvenue Premium !',
        'Votre essai gratuit de 30 jours a commencé. Profitez de toutes les fonctionnalités premium !',
        [
          {
            text: 'Commencer',
            onPress: () => router.push('/(tabs)/'),
          },
        ]
      );

    } catch (error: any) {
      console.error('Error handling payment success:', error);
      
      Alert.alert(
        'Paiement confirmé',
        'Votre abonnement est en cours d\'activation. Vous recevrez une confirmation par email.',
        [
          {
            text: 'OK',
            onPress: () => router.push('/(tabs)/'),
          },
        ]
      );
    }
  };
}
