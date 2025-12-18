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

const DEFAULT_SLOTS = [
  { start: '08:00', end: '09:00', available: false },
  { start: '09:00', end: '10:00', available: true },
  { start: '10:00', end: '11:00', available: true },
  { start: '11:00', end: '12:00', available: true },
  { start: '12:00', end: '13:00', available: false },
  { start: '13:00', end: '14:00', available: false },
  { start: '14:00', end: '15:00', available: true },
  { start: '15:00', end: '16:00', available: true },
  { start: '16:00', end: '17:00', available: true },
  { start: '17:00', end: '18:00', available: true },
  { start: '18:00', end: '19:00', available: false },
  { start: '19:00', end: '20:00', available: false },
];

const DEFAULT_AVAILABILITY = {
  lundi: { isOpen: true, slots: DEFAULT_SLOTS },
  mardi: { isOpen: true, slots: DEFAULT_SLOTS },
  mercredi: { isOpen: true, slots: DEFAULT_SLOTS },
  jeudi: { isOpen: true, slots: DEFAULT_SLOTS },
  vendredi: { isOpen: true, slots: DEFAULT_SLOTS },
  samedi: { isOpen: false, slots: [] },
  dimanche: { isOpen: false, slots: [] },
};

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

export default function RegisterScreenProfessional() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Basic info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Professional info
  const [professionalType, setProfessionalType] = useState<'avocat' | 'psychologue' | ''>('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [description, setDescription] = useState('');
  const [availability, setAvailability] = useState(DEFAULT_AVAILABILITY);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1); // 1: Basic, 2: Professional, 3: Photo

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

      if (!professionalType) {
        setError('Veuillez sélectionner votre profession.');
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

      let photoUrl = null;
      if (imageUri) {
        try {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const storageRef = ref(storage, `professionals/${user.uid}/profile-photo`);
          await uploadBytes(storageRef, blob);
          photoUrl = await getDownloadURL(storageRef);
        } catch (uploadError) {
          console.log('Erreur upload image: ' + uploadError);
        }
      }

      // Create user document
      const userDoc = {
        uid: user.uid,
        firstName: cleanFirstName,
        lastName: cleanLastName,
        email: cleanEmail.toLowerCase(),
        userType: 'professionnel',
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', user.uid), userDoc);

      // Create professional document
      const professionalDoc = {
        userId: user.uid,
        email: cleanEmail.toLowerCase(),
        firstName: cleanFirstName,
        lastName: cleanLastName,
        type: professionalType,
        address,
        phone,
        specialty,
        description,
        availability,
        photoUrl: photoUrl || null,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'professionals', user.uid), professionalDoc);

      Alert.alert('Succès', 'Votre compte a été créé avec succès');
      router.replace('/(pro-tabs)');
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

  const renderStepOneForm = () => (
    <View>
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
    </View>
  );

  const renderStepTwoForm = () => (
    <View>
      <Text style={[styles.label, { color: colors.text }]}>Profession*</Text>
      <View style={styles.typeButtonsContainer}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            {
              backgroundColor: professionalType === 'avocat' ? colors.tint : colors.cardBackground,
              borderColor: colors.tint,
            },
          ]}
          onPress={() => setProfessionalType('avocat')}
        >
          <Text style={[styles.typeButtonText, { color: professionalType === 'avocat' ? '#fff' : colors.text }]}>
            Avocat
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeButton,
            {
              backgroundColor: professionalType === 'psychologue' ? colors.tint : colors.cardBackground,
              borderColor: colors.tint,
            },
          ]}
          onPress={() => setProfessionalType('psychologue')}
        >
          <Text style={[styles.typeButtonText, { color: professionalType === 'psychologue' ? '#fff' : colors.text }]}>
            Psychologue
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, { color: colors.text }]}>Adresse*</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text }]}
        placeholder="Votre adresse"
        placeholderTextColor={colors.textSecondary}
        value={address}
        onChangeText={setAddress}
        editable={!loading}
      />

      <Text style={[styles.label, { color: colors.text }]}>Téléphone*</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text }]}
        placeholder="+33 X XX XX XX XX"
        placeholderTextColor={colors.textSecondary}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        editable={!loading}
      />

      <Text style={[styles.label, { color: colors.text }]}>Spécialité*</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text }]}
        placeholder="Ex: Droit de la Famille"
        placeholderTextColor={colors.textSecondary}
        value={specialty}
        onChangeText={setSpecialty}
        editable={!loading}
      />

      <Text style={[styles.label, { color: colors.text }]}>Description*</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.cardBackground, color: colors.text }]}
        placeholder="Décrivez votre parcours et vos compétences..."
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
        editable={!loading}
        textAlignVertical="top"
      />
    </View>
  );

  const renderStepThreeForm = () => (
    <View>
      <Text style={[styles.label, { color: colors.text }]}>Photo de profil</Text>
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
      <Text style={[styles.helperText, { color: colors.textSecondary }]}>La photo de profil est optionnelle mais recommandée</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={[styles.backButtonText, { color: colors.tint }]}>←</Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.tint }]}>Inscription Professionnel</Text>
          <Text style={[styles.stepIndicator, { color: colors.textSecondary }]}>
            Étape {currentStep} sur 3
          </Text>

          {error ? <Text style={[styles.errorText, { color: '#FF6B6B' }]}>{error}</Text> : null}

          <View style={styles.formContainer}>
            {currentStep === 1 && renderStepOneForm()}
            {currentStep === 2 && renderStepTwoForm()}
            {currentStep === 3 && renderStepThreeForm()}
          </View>

          <View style={styles.buttonsContainer}>
            {currentStep > 1 && (
              <TouchableOpacity style={[styles.button, { backgroundColor: colors.cardBackground, flex: 1 }]} onPress={() => setCurrentStep(currentStep - 1)} disabled={loading}>
                <Text style={[styles.buttonText, { color: colors.tint }]}>Précédent</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: colors.tint, flex: 1, marginLeft: currentStep > 1 ? 12 : 0 },
              ]}
              onPress={() => {
                if (currentStep < 3) {
                  setCurrentStep(currentStep + 1);
                } else {
                  handleRegister();
                }
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.buttonText, { color: '#fff' }]}>{currentStep === 3 ? 'Créer mon compte' : 'Suivant'}</Text>
              )}
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
  stepIndicator: {
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
  textArea: {
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  typeButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  photoContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
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
  helperText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
