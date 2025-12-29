import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack initialRouteName="WelcomeScreen">
      <Stack.Screen name="WelcomeScreen" options={{ headerShown: false }} />
      <Stack.Screen name="LoginScreen" options={{ title: 'Connexion', headerShown: false }} />
      <Stack.Screen name="ForgotPasswordScreen" options={{ title: 'Mot de passe oublié', headerShown: false }} />
      <Stack.Screen name="UserTypeScreen" options={{ headerShown: false }} />
      <Stack.Screen name="RegisterScreen" options={{ title: 'Inscription', headerShown: false }} />
      <Stack.Screen name="FamilyCodeScreen" options={{ title: 'Code Familial', headerShown: false }} />
    </Stack>
  );
}
