import { useRouter } from 'expo-router';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const auth = getAuth();

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/'); // Navigate to the main app screen on successful login
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <View style={styles.contentWrapper}>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Connexion</Text>
          <Text style={styles.subtitle}>Content de vous revoir !</Text>
          
          <View style={styles.formContainer}>
          <Text style={styles.label}>Email*</Text>
          <TextInput
            style={styles.input}
            placeholder="votre@email.be"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          
          <Text style={styles.label}>Mot de passe*</Text>
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor="#999"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>Se connecter</Text>
          </TouchableOpacity>
          
          {loading && <ActivityIndicator style={styles.loader} color="#FFFFFF" />}
          {error ? <Text style={styles.error}>{error}</Text> : null}
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
  }
});

export default LoginScreen;
