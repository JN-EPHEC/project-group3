import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStripeDeepLinks } from '@/hooks/useStripeDeepLinks';
import { LogBox } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import '../constants/firebase';

LogBox.ignoreLogs([
  'Missing or insufficient permissions',
  'FirebaseError: [code=permission-denied]',
  'Uncaught Error in snapshot listener', // <--- C'est celle-ci qui s'affiche dans tes logs
  '@firebase/firestore:',
  'InternalBytecode.js'
]);

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Register deep link handlers for Stripe success/cancel
  useStripeDeepLinks();

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack initialRouteName="(auth)">
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(pro-tabs)" options={{ headerShown: false, title: '' }} />
          <Stack.Screen name="modal" options={{ headerShown: false }} />
          <Stack.Screen name="add-expense" options={{ headerShown: false }} />
          <Stack.Screen name="edit-expense" options={{ headerShown: false }} />
          <Stack.Screen name="expense-details" options={{ headerShown: false }} />
          <Stack.Screen name="expense-approvals" options={{ headerShown: false }} />
          <Stack.Screen name="category-approvals" options={{ headerShown: false }} />
          <Stack.Screen name="budget-settings" options={{ headerShown: false }} />
          <Stack.Screen name="currencies" options={{ headerShown: false }} />
          <Stack.Screen name="RoleSelection" options={{ headerShown: false }} />
          <Stack.Screen name="subscription" options={{ headerShown: false }} />
          <Stack.Screen name="manage-subscription" options={{ headerShown: false }} />
          <Stack.Screen name="AddProfessionalRole" options={{ headerShown: false }} />
          <Stack.Screen name="conversation" options={{ headerShown: false }} />
          <Stack.Screen name="admin-messages" options={{ headerShown: false }} />
          <Stack.Screen name="admin-message-reports" options={{ headerShown: false }} />
          <Stack.Screen name="admin-moderation" options={{ headerShown: false }} />
          <Stack.Screen name="create-event" options={{ headerShown: false }} />
          <Stack.Screen name="edit-event" options={{ headerShown: false }} />
          <Stack.Screen name="event-details" options={{ headerShown: false }} />
          <Stack.Screen name="scan-barcode" options={{ headerShown: false }} />
          <Stack.Screen 
            name="helpcenter-pro" 
            options={{ 
              headerShown: false,
              presentation: 'card',
              animation: 'slide_from_right'
            }} 
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
