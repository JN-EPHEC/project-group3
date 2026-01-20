/**
 * Composant racine pour gérer le Deep Linking Stripe
 * À intégrer dans _layout.tsx ou le composant principal
 */

import { syncUserSubscriptionFromStripe } from '@/constants/subscriptionSync';
import { useRouter } from 'expo-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import { Alert, Linking } from 'react-native';

export function useStripeDeepLinks() {
  const router = useRouter();

  useEffect(() => {
    console.log('🔵 useStripeDeepLinks: Hook initialisé');
    
    // Gérer l'URL initiale (app ouvert via deep link)
    Linking.getInitialURL().then(url => {
      console.log('🔵 Initial URL:', url);
      if (url) {
        handleDeepLink(url);
      }
    });

    // Écouter les deep links pendant que l'app est active
    const subscription = Linking.addEventListener('url', event => {
      console.log('🔵 Deep link event:', event.url);
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = async (url: string) => {
    console.log('🔵 Deep link received:', url);

    try {
      // Récupérer le type d'utilisateur pour les redirections
      const auth = getAuth();
      const user = auth.currentUser;
      const db = getFirestore();
      
      let userType = 'parent';
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          userType = userDoc.data()?.userType || 'parent';
        } catch (error) {
          console.error('Error fetching user type:', error);
        }
      }

      const profileRoute = userType === 'professionnel' ? '/(pro-tabs)/ProSettings' : '/(tabs)/Profil';

      // Vérifier si l'URL contient des paramètres de succès ou d'annulation
      const isPaymentSuccess = url.includes('payment-success') || url.includes('success=true');
      const isPaymentCancelled = url.includes('payment-cancelled') || url.includes('cancelled=true');
      const isSettings = url.includes('settings');

      console.log('🔵 URL Analysis:', {
        isPaymentSuccess,
        isPaymentCancelled,
        isSettings,
        url
      });

      // Payment Success
      if (isPaymentSuccess) {
        const urlParams = new URLSearchParams(url.split('?')[1]);
        const sessionId = urlParams.get('session_id');

        console.log('✅ Payment success détecté! Session ID:', sessionId);

        if (sessionId) {
          await handlePaymentSuccess(sessionId);
        } else {
          // Même sans session ID, afficher le message de succès
          Alert.alert(
            '🎉 Paiement réussi !',
            'Votre abonnement est en cours d\'activation.',
            [
              {
                text: 'OK',
                onPress: () => {
                  const homeRoute = userType === 'professionnel' ? '/(pro-tabs)/' : '/(tabs)/';
                  router.push(homeRoute);
                },
              },
            ]
          );
        }
      }

      // Payment Cancelled
      else if (isPaymentCancelled) {
        console.log('❌ Payment cancelled détecté');
        Alert.alert(
          'Paiement annulé',
          'Vous avez annulé le processus de paiement. Vous pouvez réessayer à tout moment.',
          [
            {
              text: 'OK',
              onPress: () => router.push(profileRoute),
            },
          ]
        );
      }

      // Settings return
      else if (isSettings) {
        console.log('⚙️ Settings return détecté');
        router.push(profileRoute);
      }

    } catch (error) {
      console.error('❌ Error handling deep link:', error);
    }
  };

  const handlePaymentSuccess = async (sessionId: string) => {
    try {
      const auth = getAuth();
      const db = getFirestore();

      const finalize = async (uid: string) => {
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();
        const userType = userData?.userType || 'parent';

        await updateDoc(userRef, {
          stripeSessionId: sessionId,
          subscriptionStatus: 'trialing',
          updatedAt: new Date(),
        });

        // Forcer une synchro depuis Stripe (utile en local si webhooks absents)
        await syncUserSubscriptionFromStripe();

        const homeRoute = userType === 'professionnel' ? '/(pro-tabs)/' : '/(tabs)/';
        Alert.alert(
          '🎉 Bienvenue Premium !',
          'Votre essai gratuit de 30 jours a commencé. Profitez de toutes les fonctionnalités premium !',
          [
            {
              text: 'Commencer',
              onPress: () => router.push(homeRoute),
            },
          ]
        );
      };

      const user = auth.currentUser;

      // Sur web, le deep link peut arriver avant que Firebase Auth soit prêt.
      if (!user) {
        console.warn('Payment success detected but user not authenticated yet. Waiting for auth…');
        Alert.alert(
          'Paiement confirmé',
          "Votre abonnement est en cours d'activation. Veuillez patienter quelques secondes...",
          [{ text: 'OK' }]
        );

        return new Promise<void>((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, async (u) => {
            if (u) {
              unsubscribe();
              try {
                await finalize(u.uid);
              } catch (e) {
                console.error('Error finalizing after auth ready:', e);
              }
              resolve();
            }
          });

          // Sécurité : si après 8s aucun user, on sort et on redirige
          setTimeout(() => {
            unsubscribe();
            console.warn('Auth not ready after payment; please refresh and reconnect.');
            router.push('/(tabs)/');
            resolve();
          }, 8000);
        });
      }

      await finalize(user.uid);

    } catch (error: any) {
      console.error('Error handling payment success:', error);
      
      // En cas d'erreur, essayer de récupérer le type d'utilisateur depuis auth
      const db = getFirestore();
      const auth = getAuth();
      const user = auth.currentUser;
      
      let homeRoute = '/(tabs)/';
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userType = userDoc.data()?.userType || 'parent';
          homeRoute = userType === 'professionnel' ? '/(pro-tabs)/' : '/(tabs)/';
        } catch {
          // Utiliser la route par défaut
        }
      }
      
      Alert.alert(
        'Paiement confirmé',
        'Votre abonnement est en cours d\'activation. Vous recevrez une confirmation par email.',
        [
          {
            text: 'OK',
            onPress: () => router.push(homeRoute),
          },
        ]
      );
    }
  };
}
