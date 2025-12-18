import { useRouter } from 'expo-router';
import { getAuth, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import { db } from '../../constants/firebase';
import { createAndPersistSession } from '../../constants/sessionManager';
import { Colors } from '../../constants/theme';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetInfo, setResetInfo] = useState('');
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const auth = getAuth();

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    setResetInfo('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        
        // Créer et persister la session avec le type d'utilisateur
        const userType = userData.userType === 'professionnel' ? 'professionnel' : 'parent';
        await createAndPersistSession(user, userType);
        
        // Vérifier le type d'utilisateur
        if (userData.userType === 'professionnel') {
          console.log('Professional user, redirecting to pro interface...');
          router.replace('/(pro-tabs)');
        } else if (userData.familyId) {
          console.log('User already has a family, redirecting to home...');
          router.replace('/(tabs)');
        } else {
          console.log('User has no family, redirecting to FamilyCodeScreen...');
          router.replace('FamilyCodeScreen');
        }
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

  const handlePasswordReset = async () => {
    setError('');
    setResetInfo('');
    const trimmedEmail = (email || '').trim();
    if (!trimmedEmail) {
      setError('Veuillez entrer votre email pour réinitialiser le mot de passe.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setResetInfo("Lien de réinitialisation envoyé. Vérifiez votre boîte mail.");
    } catch (err) {
      console.error('Password reset error:', err);
      let message = "Impossible d'envoyer le lien de réinitialisation.";
      if (err?.code === 'auth/invalid-email') message = 'Email invalide.';
      else if (err?.code === 'auth/user-not-found') message = "Aucun compte trouvé pour cet email.";
      else if (err?.code === 'auth/too-many-requests') message = 'Trop de tentatives. Réessayez plus tard.';
      setError(message);
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
          <TextInput
            style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text }]}
            placeholder="Mot de passe"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity onPress={handlePasswordReset} style={styles.linkButton}>
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
          {resetInfo ? <Text style={[styles.info, { color: colors.tint }]}>{resetInfo}</Text> : null}
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
  }
});

export default LoginScreen;
