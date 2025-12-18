import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { getPersistedSession, updateSessionActivity, validateAndRefreshSession } from '@/constants/sessionManager';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppState } from 'react-native';
import '../constants/firebase';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [initialRouteName, setInitialRouteName] = useState('(auth)');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const appState = AppState.currentState;

  useEffect(() => {
    const checkPersistedSession = async () => {
      try {
        const session = await getPersistedSession();
        
        if (session) {
          console.log('[AppStart] Session persistée trouvée pour:', session.email);
          
          // Prolonger l'inactivité
          await updateSessionActivity(session);
          
          // Déterminer la route initiale selon le type d'utilisateur
          if (session.userType === 'professionnel') {
            setInitialRouteName('(pro-tabs)');
          } else {
            setInitialRouteName('(tabs)');
          }
        } else {
          console.log('[AppStart] Aucune session persistée, affichage de l\'écran d\'authentification');
          setInitialRouteName('(auth)');
        }
      } catch (error) {
        console.error('[AppStart] Erreur lors de la vérification de session:', error);
        setInitialRouteName('(auth)');
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkPersistedSession();
  }, []);

  // Gérer l'inactivité quand l'app entre en arrière-plan
  useEffect(() => {
    let subscription;

    const handleAppStateChange = async (state) => {
      if (state === 'active') {
        // L'app revient au premier plan
        console.log('[SessionManager] App revient au premier plan');
        await validateAndRefreshSession();
      } else if (state === 'background' || state === 'inactive') {
        // L'app passe en arrière-plan
        console.log('[SessionManager] App passe en arrière-plan/inactivité');
      }
    };

    subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove?.();
    };
  }, []);

  if (isCheckingSession) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName={initialRouteName}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(pro-tabs)" options={{ headerShown: false, title: '' }} />
        <Stack.Screen name="modal" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
