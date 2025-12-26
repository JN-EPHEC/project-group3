import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStripeDeepLinks } from '@/hooks/useStripeDeepLinks';
import '../constants/firebase';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Register deep link handlers for Stripe success/cancel
  useStripeDeepLinks();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName="(auth)">
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(pro-tabs)" options={{ headerShown: false, title: '' }} />
        <Stack.Screen name="modal" options={{ headerShown: false }} />
        <Stack.Screen name="add-expense" options={{ headerShown: false }} />
        <Stack.Screen name="category-approvals" options={{ headerShown: false }} />
        <Stack.Screen name="RoleSelection" options={{ headerShown: false }} />
        <Stack.Screen name="subscription" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
