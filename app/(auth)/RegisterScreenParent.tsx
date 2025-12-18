import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useColorScheme,
} from 'react-native';
import { Colors } from '../../constants/theme';

const getPasswordError = (password: string) => {
  if (password.length < 8 || password.length > 16) {
    return 'Le mot de passe doit contenir entre 8 et 16 caractères.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Le mot de passe doit contenir au moins une lettre majuscule.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Le mot de passe doit contenir au moins une lettre minuscule.';
  }
  if (!/\d/.test(password)) {
    return 'Le mot de passe doit contenir au moins un chiffre.';
  }
  if (!/[@$!%*?&]/.test(password)) {
    return 'Le mot de passe doit contenir un caractère spécial (@$!%*?&).';
  }
  return null;
};

export default function RegisterScreenParent() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Erreur', 'Accès à la galerie refusé');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError('');

    try {
      const cleanFirstName = firstName.trim();
      const cleanLastName = lastName.trim();
      const cleanEmail = email.trim();

      if (!cleanFirstName || !cleanLastName || !cleanEmail || !password) {
        setError('Veuillez remplir tous les champs obligatoires.');
        setLoading(false);
        return;
      }

      const passwordError = getPasswordError(password);
      if (passwordError) {
        setError(passwordError);
        setLoading(false);
        return;
      }

      // Create Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;

      let profileImage = null;
      if (imageUri) {
        try {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const storageRef = ref(storage, `users/${user.uid}/profile.jpg`);
          await uploadBytes(storageRef, blob);
          profileImage = await getDownloadURL(storageRef);
        } catch (uploadError) {
          console.log('Erreur upload image: ' + uploadError);
        }
      }

      // Create user document
      const userDoc: any = {
        uid: user.uid,
        firstName: cleanFirstName,
        lastName: cleanLastName,
        email: cleanEmail.toLowerCase(),
        userType: 'parent',
        createdAt: serverTimestamp(),
      };
      if (profileImage) userDoc.profileImage = profileImage;

      await setDoc(doc(db, 'users', user.uid), userDoc);

      Alert.alert('Succès', 'Votre compte a été créé avec succès');
      router.replace('/(auth)/FamilyCodeScreen');
    } catch (error: any) {
      console.error('Register error:', error);
      let errorMessage = 'Erreur lors de l\'inscription';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Cet email est déjà utilisé.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email invalide.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={[styles.backButtonText, { color: colors.tint }]}>←</Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.tint }]}>Inscription Parent</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Créez votre compte pour gérer votre famille</Text>

          {error ? <Text style={[styles.errorText, { color: '#FF6B6B' }]}>{error}</Text> : null}

          <View style={styles.formContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Prénom*</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text }]}
              placeholder="Votre prénom"
              placeholderTextColor={colors.textSecondary}
              value={firstName}
              onChangeText={setFirstName}
              editable={!loading}
            />

            <Text style={[styles.label, { color: colors.text }]}>Nom*</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text }]}
              placeholder="Votre nom"
              placeholderTextColor={colors.textSecondary}
              value={lastName}
              onChangeText={setLastName}
              editable={!loading}
            />

            <Text style={[styles.label, { color: colors.text }]}>Email*</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text }]}
              placeholder="votre@email.be"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />

            <Text style={[styles.label, { color: colors.text }]}>Mot de passe*</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text }]}
              placeholder="Min 8 caractères avec majuscule, chiffre et caractère spécial"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />

            <Text style={[styles.label, { color: colors.text }]}>Photo de profil (optionnel)</Text>
            {imageUri ? (
              <View style={styles.photoContainer}>
                <Image source={{ uri: imageUri }} style={styles.photoPreview} />
                <TouchableOpacity style={[styles.changePhotoButton, { backgroundColor: colors.tint }]} onPress={handlePickImage}>
                  <Text style={styles.changePhotoText}>Changer la photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={[styles.uploadPhotoButton, { backgroundColor: colors.cardBackground, borderColor: colors.tint }]} onPress={handlePickImage}>
                <Text style={[styles.uploadPhotoText, { color: colors.tint }]}>Ajouter une photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.registerButton, { backgroundColor: colors.tint }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerButtonText}>Créer mon compte</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginLink}>
            <Text style={[styles.loginText, { color: colors.textSecondary }]}>Vous avez déjà un compte? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/LoginScreen')}>
              <Text style={[styles.loginLinkText, { color: colors.tint }]}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const SafeAreaView = View;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  errorText: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  formContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  photoContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  changePhotoButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  changePhotoText: {
    color: '#fff',
    fontWeight: '600',
  },
  uploadPhotoButton: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  uploadPhotoText: {
    fontSize: 16,
    fontWeight: '600',
  },
  registerButton: {
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 24,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  loginText: {
    fontSize: 14,
  },
  loginLinkText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
