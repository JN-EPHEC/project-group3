import { useRouter } from 'expo-router';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import { Colors } from '../../constants/theme';

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const auth = getAuth();

  const handleReset = async () => {
    setError('');
    setInfo('');
    const trimmedEmail = (email || '').trim();
    if (!trimmedEmail) {
      setError('Veuillez entrer votre email pour réinitialiser le mot de passe.');
      return;
    }
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, trimmedEmail);
      setInfo("Un lien de réinitialisation a été envoyé. Consultez votre boîte mail.");
    } catch (err) {
      console.error('Password reset error:', err);
      let message = "Impossible d'envoyer le lien de réinitialisation.";
      if (err?.code === 'auth/invalid-email') message = 'Email invalide.';
      else if (err?.code === 'auth/user-not-found') message = "Aucun compte trouvé pour cet email.";
      else if (err?.code === 'auth/too-many-requests') message = 'Trop de tentatives. Réessayez plus tard.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={[styles.backButtonText, { color: colors.tint }]}>←</Text>
      </TouchableOpacity>

      <View style={styles.contentWrapper}>
        <View style={styles.contentContainer}>
          <Text style={[styles.title, { color: colors.tint }]}>Mot de passe oublié</Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>
            Saisissez votre email pour recevoir un lien de réinitialisation.
          </Text>

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

            <TouchableOpacity
              style={[styles.resetButton, { backgroundColor: colors.tint }]}
              onPress={handleReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.resetButtonText}>Envoyer le lien</Text>
              )}
            </TouchableOpacity>

            {error ? <Text style={[styles.error, { color: colors.dangerButton }]}>{error}</Text> : null}
            {info ? <Text style={[styles.info, { color: colors.tint }]}>{info}</Text> : null}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#BBE1FA',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
    padding: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  contentWrapper: {
    flex: 1,
    paddingTop: 80,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 30,
  },
  formContainer: {
    width: '100%',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 20,
    marginBottom: 20,
    fontSize: 16,
  },
  resetButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resetButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
  },
  error: {
    marginTop: 12,
    textAlign: 'center',
  },
  info: {
    marginTop: 12,
    textAlign: 'center',
  },
});

export default ForgotPasswordScreen;
