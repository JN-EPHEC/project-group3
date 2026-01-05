import { useRouter } from 'expo-router';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import { db } from '../../constants/firebase';
import { createAndPersistSession } from '../../constants/sessionManager';
import { StripeService } from '../../constants/stripeService';
import { Colors } from '../../constants/theme';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef('');
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const auth = getAuth();

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();

        const parentId = userData.parent_id ?? (userData.userType === 'parent' ? user.uid : null);
        const professionalId = userData.professional_id ?? (userData.userType === 'professionnel' ? user.uid : null);
        const hasParent = !!parentId;
        const hasPro = !!professionalId;

        // Backfill ids if missing
        if (userData.parent_id === undefined || userData.professional_id === undefined) {
          await updateDoc(userDocRef, {
            parent_id: parentId,
            professional_id: professionalId,
          });
        }

        // Si l'utilisateur a déjà un rôle (parent/pro), vérifier l'abonnement
        if (hasParent || hasPro) {
          const hasActiveSubscription = await StripeService.hasActiveSubscription(user.uid);
          if (!hasActiveSubscription) {
            // Rediriger vers la page d'abonnement pour choisir un plan
            router.replace('/subscription');
            return;
          }
        }

        if (hasParent && hasPro) {
          // Dual role: go to chooser
          await createAndPersistSession(user, 'parent');
          router.replace({ pathname: '/RoleSelection', params: { userId: user.uid } });
          return;
        }

        if (hasParent) {
          await createAndPersistSession(user, 'parent');
          const hasFamily = (userData.familyIds && userData.familyIds.length > 0) || userData.familyId;
          if (hasFamily) {
            router.replace('/(tabs)');
          } else {
            router.replace('FamilyCodeScreen');
          }
          return;
        }

        if (hasPro) {
          await createAndPersistSession(user, 'professionnel');
          router.replace('/(pro-tabs)');
          return;
        }

        // No role yet -> onboarding choose
        router.replace('/UserTypeScreen');
      } else {
        router.replace('FamilyCodeScreen');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={[styles.backButtonText, { color: colors.tint }]}>←</Text>
      </TouchableOpacity>
      <View style={styles.contentWrapper}>
        <View style={styles.contentContainer}>
          <Text style={[styles.title, { color: colors.tint }]}>Connexion</Text>
          <Text style={[styles.subtitle, { color: colors.tint }]}>Content de vous revoir !</Text>
          
          <View style={styles.formContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Email*</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text }]}
            placeholder="votre@email.be"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          
          <Text style={[styles.label, { color: colors.text }]}>Mot de passe*</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              ref={passwordRef}
              style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text, paddingRight: 90 }]}
              placeholder="Mot de passe"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPassword}
              defaultValue={password}
              onChangeText={(text) => {
                passwordRef.current = text;
                setPassword(text);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="none"
              autoComplete="off"
              importantForAutofill="no"
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => {
                setShowPassword((prev) => !prev);
              }}
            >
              <Text style={[styles.passwordToggleText, { color: colors.tint }]}>
                {showPassword ? 'Masquer' : 'Afficher'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.push('ForgotPasswordScreen')} style={styles.linkButton}>
            <Text style={[styles.linkText, { color: colors.tint }]}>Mot de passe oublié ?</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.tint }]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={[styles.loginButtonText, { color: '#fff' }]}>Se connecter</Text>
          </TouchableOpacity>
          
          {loading && <ActivityIndicator style={styles.loader} color={colors.tint} />}
          {error ? <Text style={[styles.error, { color: colors.dangerButton }]}>{error}</Text> : null}
        </View>
      </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#BBE1FA'
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
    padding: 10
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold'
  },
  contentWrapper: {
    flex: 1,
    paddingTop: 80
  },
  contentContainer: {
    flex: 1,
    padding: 20
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10
  },
  subtitle: {
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 40
  },
  formContainer: {
    width: '100%'
  },
    passwordWrapper: {
      position: 'relative',
      width: '100%'
    },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 8
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 20,
    marginBottom: 20,
    fontSize: 16
  },
  loginButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  loginButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600'
  },
  loader: {
    marginTop: 20
  },
  error: {
    color: '#FFFFFF',
    marginTop: 10,
    textAlign: 'center'
  },
  info: {
    marginTop: 10,
    textAlign: 'center'
  },
  linkButton: {
    alignSelf: 'flex-start',
    marginBottom: 10
  },
  linkText: {
    fontSize: 14,
    textDecorationLine: 'underline'
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    top: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  passwordToggleText: {
    fontSize: 14,
    fontWeight: '700'
  },
});

export default LoginScreen;
