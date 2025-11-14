import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { auth, createFamilyForUser, joinFamilyByCode } from '../../constants/firebase';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

export default function FamilyCodeScreen() {
  const router = useRouter();
  const [uid, setUid] = useState(null);
  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.replace('/(auth)/LoginScreen');
      return;
    }
    setUid(user.uid);
  }, [router]);

  function handleCreateFamily() {
    router.push('/(auth)/CreationFamilyCode');
  }

  async function handleJoinByCode() {
    if (!uid || !codeInput) {
      setError('Veuillez entrer un code.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const family = await joinFamilyByCode(uid, codeInput.trim().toUpperCase());
      if (!family) {
        setError('Code introuvable. Vérifiez le code et réessayez.');
      } else {
        setMessage('Vous avez rejoint la famille.');
        router.replace('/');
      }
    } catch (e) {
      setError('Erreur lors de la jonction à la famille.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <View style={styles.contentWrapper}>
        <Text style={styles.title}>Code de famille</Text>
        <Text style={styles.subtitle}>Entrez le code de votre famille pour la rejoindre, ou créez la vôtre !</Text>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Code de famille</Text>
          <TextInput
            value={codeInput}
            onChangeText={setCodeInput}
            placeholder="Ex: AB12CD"
            style={styles.input}
            autoCapitalize="characters"
          />
          <TouchableOpacity onPress={handleJoinByCode} disabled={loading} style={styles.joinButton}>
            <Text style={styles.joinButtonText}>Rejoindre</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.separatorContainer}>
          <View style={styles.line} />
          <Text style={styles.separatorText}>OU</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity
          onPress={handleCreateFamily}
          style={styles.createButton}
          disabled={loading}
        >
          <Text style={styles.createButtonText}>Créer une famille</Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator style={styles.loader} size="large" color="#FFFFFF" />}
        {message && <Text style={styles.message}>{message}</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    </View>
  );
}

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
    padding: 10
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold'
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    color: '#FFFFFF',
    alignSelf: 'flex-start',
    marginLeft: 35,
    marginBottom: 8,
  },
  input: {
    width: '90%',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 20,
    marginBottom: 20,
    fontSize: 16,
  },
  joinButton: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  joinButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    marginVertical: 30,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#FFFFFF',
  },
  separatorText: {
    color: '#FFFFFF',
    marginHorizontal: 10,
    fontWeight: 'bold',
  },
  createButton: {
    width: '90%',
    backgroundColor: 'transparent',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loader: {
    marginTop: 20,
  },
  message: {
    marginTop: 12,
    color: 'green',
    fontSize: 16,
    textAlign: 'center',
  },
  error: {
    marginTop: 12,
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
});