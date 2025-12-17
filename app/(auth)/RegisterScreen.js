import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View, useColorScheme, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { Colors } from '../../constants/theme';

// Fonction de validation détaillée pour expliquer l'erreur spécifique
const getPasswordError = (password) => {
  if (password.length < 8 || password.length > 16) {
    return "Le mot de passe doit contenir entre 8 et 16 caractères.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Le mot de passe doit contenir au moins une lettre majuscule.";
  }
  if (!/[a-z]/.test(password)) {
    return "Le mot de passe doit contenir au moins une lettre minuscule.";
  }
  if (!/\d/.test(password)) {
    return "Le mot de passe doit contenir au moins un chiffre.";
  }
  if (!/[@$!%*?&]/.test(password)) {
    return "Le mot de passe doit contenir un caractère spécial (@$!%*?&).";
  }
  return null; // Aucune erreur
};

const RegisterScreen = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const { userType } = useLocalSearchParams();
  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();
  const router = useRouter();

  const handleRegister = async () => {
    setLoading(true);
    setError('');

    // Nettoyage des espaces inutiles
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanEmail = email.trim();

    // 1. Vérification des champs requis
    if (!cleanFirstName || !cleanLastName || !cleanEmail || !password) {
      setError('Veuillez remplir tous les champs obligatoires.');
      setLoading(false);
      return;
    }

    // 2. Validation détaillée du mot de passe
    const passwordError = getPasswordError(password);
    if (passwordError) {
      setError(passwordError); // Affiche le problème spécifique
      setLoading(false);
      return;
    }

    try {
      // Création Auth
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;

      let photoURL = null;
      if (imageUri) {
        try {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const storageRef = ref(storage, `users/${user.uid}/profile.jpg`);
          await uploadBytes(storageRef, blob);
          photoURL = await getDownloadURL(storageRef);
        } catch (uploadError) {
          console.log('Erreur upload image: ' + uploadError.message);
        }
      }

      const userDoc = {
        uid: user.uid,
        firstName: cleanFirstName,
        lastName: cleanLastName,
        email: cleanEmail.toLowerCase(),
        userType: userType || 'parent',
        createdAt: serverTimestamp(),
      };
      if (photoURL) userDoc.photoURL = photoURL;

      await setDoc(doc(db, 'users', user.uid), userDoc);

      // Redirection selon le type d'utilisateur
      if (userType === 'professionnel') {
        router.replace('/(pro-tabs)');
      } else {
        router.replace('FamilyCodeScreen');
      }
    } catch (error) {
      // Gestion des erreurs Firebase
      let errorMessage = '';
      switch (error?.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Cette adresse email est déjà utilisée.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Adresse email invalide.';
          break;
        default:
          errorMessage = error.message || 'Une erreur est survenue lors de l\'inscription.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission requise', 'Autorisez l\'accès aux images pour choisir une photo de profil.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      setError('Erreur ouverture sélection images: ' + (err.message || String(err)));
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={[styles.backButtonText, { color: colors.tint }]}>←</Text>
        </TouchableOpacity>

        <View style={styles.contentContainer}>
          <Text style={[styles.title, { color: colors.tint }]}>Inscription</Text>
          
          <View style={styles.formContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Nom*</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text }]}
              placeholder="Dupont"
              placeholderTextColor={colors.textSecondary}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />

            <Text style={[styles.label, { color: colors.text }]}>Prénom*</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text }]}
              placeholder="Maya"
              placeholderTextColor={colors.textSecondary}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />

            <Text style={[styles.label, { color: colors.text }]}>Email*</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text }]}
              placeholder="votre@email.be"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: colors.text }]}>Mot de passe*</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text }]}
              placeholder="8-16 car, Maj, Min, Chiffre, Spécial"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Text style={[styles.label, { color: colors.text }]}>Photo de profil</Text>
            <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.photoPlaceholder} />
              ) : (
                <View style={[styles.photoPlaceholder, { backgroundColor: colors.cardBackground }]}>
                  <Text style={[styles.photoIcon, { color: colors.textSecondary }]}>✎</Text>
                </View>
              )}
            </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color={colors.tint} />
        ) : (
          <TouchableOpacity 
            style={[styles.registerButton, { backgroundColor: colors.tint }]} 
            onPress={handleRegister} 
            disabled={loading}
          >
            <Text style={[styles.registerButtonText, { color: '#fff' }]}>Créer le compte</Text>
          </TouchableOpacity>
        )}
        {error ? <Text style={[styles.error, { color: colors.dangerButton }]}>{error}</Text> : null}
      </View>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#BBE1FA'
  },
  contentContainer: {
    paddingTop: 100,
    paddingHorizontal: 20
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
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    fontStyle: 'italic',
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
  photoContainer: {
    marginBottom: 30
  },
  photoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  photoIcon: {
    fontSize: 24,
    color: '#999'
  },
  registerButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10
  },
  registerButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600'
  },
  loader: {
    marginTop: 20
  },
  error: {
    color: '#FF0000',
    marginTop: 10,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 14
  }
});

export default RegisterScreen;