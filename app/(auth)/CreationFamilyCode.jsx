import { useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Share } from 'react-native';
import { auth, createFamilyForUser } from '../../constants/firebase';

export default function CreationFamilyCodeScreen() {
  const router = useRouter();
  const [familyName, setFamilyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedCode, setGeneratedCode] = useState(null);

  async function handleCreateFamily() {
    const user = auth.currentUser;
    if (!user) {
      router.replace('/(auth)/LoginScreen');
      return;
    }
    if (!familyName) {
      setError('Veuillez donner un nom à votre famille.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { code } = await createFamilyForUser(user.uid, familyName);
      setGeneratedCode(code);
    } catch (e) {
      setError('Erreur lors de la création de la famille.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleShareCode() {
    try {
      await Share.share({
        message: `Rejoignez ma famille sur l'application avec le code : ${generatedCode}`,
      });
    } catch (error) {
      console.error('Erreur lors du partage du code:', error.message);
    }
  }

  if (generatedCode) {
    return (
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.backButtonText}>→</Text>
        </TouchableOpacity>
        <View style={styles.contentWrapper}>
          <Text style={styles.title}>Merci !</Text>
          <Text style={styles.subtitle}>Voici le code pour votre famille !</Text>
          <Text style={styles.codeText}>{generatedCode}</Text>
          <Text style={styles.infoText}>Ce code sera actif 2 jours</Text>
          <TouchableOpacity onPress={handleShareCode} style={styles.shareButton}>
            <Text style={styles.shareButtonText}>Partager le code</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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
        <Text style={styles.title}>Créer une famille</Text>
        <Text style={styles.subtitle}>Donnez un nom à votre nouvelle famille.</Text>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Nom de la famille</Text>
          <TextInput
            value={familyName}
            onChangeText={setFamilyName}
            placeholder="Ex: Famille Dupont"
            style={styles.input}
          />
          <TouchableOpacity onPress={handleCreateFamily} disabled={loading} style={styles.createButton}>
            <Text style={styles.createButtonText}>Créer</Text>
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator style={styles.loader} size="large" color="#FFFFFF" />}
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
  createButton: {
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
  createButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
  },
  loader: {
    marginTop: 20,
  },
  error: {
    marginTop: 12,
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
  codeText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginVertical: 20,
  },
  infoText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 40,
  },
  shareButton: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#3B82F6',
    fontSize: 18,
    fontWeight: '600',
  },
});
