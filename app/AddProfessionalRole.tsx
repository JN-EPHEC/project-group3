/**
 * Écran pour ajouter le rôle professionnel à un compte parent existant
 * L'utilisateur doit remplir toutes les informations professionnelles
 * Les données seront liées à user.uid (pas parent_id)
 */

import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { arrayUnion, doc, getDoc, getFirestore, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { Colors } from '../constants/theme';

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

export default function AddProfessionalRole() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [diplomaUri, setDiplomaUri] = useState<string | null>(null);
  const [professionalType, setProfessionalType] = useState<'avocat' | 'psychologue' | ''>('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [description, setDescription] = useState('');
  const [availability] = useState(DEFAULT_AVAILABILITY);
  const [hasRgpdConsent, setHasRgpdConsent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1); // 1: Professional info, 2: Photo, 3: Diploma

  const privacyUrl = 'https://wekid.be/politique-de-confidentialite';
  const consentVersion = '2024-12-06';

  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();

  const isStepValid = (step: number) => {
    if (step === 1) {
      const cleanAddress = address.trim();
      const cleanPhone = phone.trim();
      const cleanSpecialty = specialty.trim();
      const cleanDescription = description.trim();
      const phoneLooksOk = cleanPhone.length >= 8;
      return !!professionalType && !!cleanAddress && phoneLooksOk && !!cleanSpecialty && cleanDescription.length >= 10 && hasRgpdConsent;
    }
    if (step === 2) {
      // Photo optionnelle
      return true;
    }
    if (step === 3) {
      return !!diplomaUri;
    }
    return false;
  };

  const getStepHints = (step: number): string[] => {
    const hints: string[] = [];

    if (step === 1) {
      if (!professionalType) hints.push('Choisissez votre profession.');
      if (!address.trim()) hints.push('Ajoutez votre adresse.');
      if (phone.trim().length < 8) hints.push('Téléphone trop court (8+ chiffres).');
      if (!specialty.trim()) hints.push('Indiquez votre spécialité.');
      if (description.trim().length < 10) hints.push('Description trop courte (10+ caractères).');
      if (!hasRgpdConsent) hints.push('Validez le consentement RGPD.');
    }

    if (step === 3) {
      if (!diplomaUri) hints.push('Téléchargez un diplôme (PDF ou image).');
    }

    return hints;
  };

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

  const handlePickDiploma = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
    });

    if (!result.canceled) {
      setDiplomaUri(result.assets[0].uri);
    }
  };

  const handleAddRole = async () => {
    setLoading(true);
    setError('');

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      if (!professionalType) {
        setError('Veuillez sélectionner votre profession.');
        setLoading(false);
        return;
      }

      if (!diplomaUri) {
        setError('Vous devez télécharger un diplôme.');
        setLoading(false);
        return;
      }

      if (!hasRgpdConsent) {
        setError('Vous devez accepter la politique de confidentialité.');
        setLoading(false);
        return;
      }

      // Upload photo
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

      // Upload diploma
      let diplomaUrl = null;
      if (diplomaUri) {
        try {
          const response = await fetch(diplomaUri);
          const blob = await response.blob();
          const storageRef = ref(storage, `professionals/${user.uid}/diploma`);
          await uploadBytes(storageRef, blob);
          diplomaUrl = await getDownloadURL(storageRef);
        } catch (uploadError) {
          console.log('Erreur upload diploma: ' + uploadError);
        }
      }

      // Récupérer firstName et lastName du profil parent existant
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.exists() ? userDocSnap.data() : {};
      const firstName = userData.firstName || '';
      const lastName = userData.lastName || '';

      // Créer le document professionnel lié au user.uid (PAS parent_id)
      const consentPayload = {
        accepted: true,
        version: consentVersion,
        privacyUrl,
        acceptedAt: serverTimestamp(),
        source: 'professional-onboarding',
      };

      const professionalDoc = {
        userId: user.uid, // Lié au user.uid pour éviter les mélanges
        email: user.email?.toLowerCase(),
        firstName, // Même prénom que le profil parent
        lastName, // Même nom que le profil parent
        type: professionalType,
        address,
        phone,
        specialty,
        description,
        availability,
        photoUrl: photoUrl || null,
        diplomaUrl: diplomaUrl || null,
        accountStatus: 'active',
        rgpdConsent: consentPayload,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'professionals', user.uid), professionalDoc);

      // Mettre à jour le document utilisateur pour ajouter professional_id et le rôle
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        professional_id: user.uid, // Utiliser user.uid comme professional_id
        roles: arrayUnion('professionnel'),
        rgpdConsent: consentPayload,
        accountStatus: 'active',
      });

      Alert.alert('Succès', 'Rôle professionnel ajouté avec succès');
      router.replace('/(tabs)/Profil');
    } catch (error: any) {
      console.error('Add role error:', error);
      setError(error.message || 'Erreur lors de l\'ajout du rôle');
      Alert.alert('Erreur', error.message || 'Erreur lors de l\'ajout du rôle');
    } finally {
      setLoading(false);
    }
  };

  const renderStepOneForm = () => (
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
        placeholder="+32 X XX XX XX XX"
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

      <View style={[styles.consentBox, { backgroundColor: colors.cardBackground, borderColor: colors.tint }]}>
        <TouchableOpacity
          style={styles.consentRow}
          onPress={() => setHasRgpdConsent(!hasRgpdConsent)}
          disabled={loading}
        >
          <View style={[styles.checkbox, { borderColor: colors.tint, backgroundColor: hasRgpdConsent ? colors.tint : 'transparent' }]}>
            {hasRgpdConsent && <Text style={styles.checkboxMark}>✓</Text>}
          </View>
          <Text style={[styles.consentText, { color: colors.text }]}>J'accepte la Politique de confidentialité et les conditions RGPD.</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL(privacyUrl)}>
          <Text style={[styles.privacyLink, { color: colors.tint }]}>Consulter la politique</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStepTwoForm = () => (
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

  const renderStepThreeForm = () => (
    <View>
      <Text style={[styles.label, { color: colors.text }]}>Diplôme ou Certification Professionnelle *</Text>
      {diplomaUri ? (
        <View style={styles.diplomaContainer}>
          <View style={[styles.diplomaPreview, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.diplomaName, { color: colors.text }]}>📄 Diplôme téléchargé</Text>
          </View>
          <TouchableOpacity style={[styles.changeDiplomaButton, { backgroundColor: colors.tint }]} onPress={handlePickDiploma}>
            <Text style={styles.changeDiplomaText}>Changer le diplôme</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={[styles.uploadDiplomaButton, { backgroundColor: colors.cardBackground, borderColor: colors.tint }]} onPress={handlePickDiploma}>
          <Text style={[styles.uploadDiplomaText, { color: colors.tint }]}>Télécharger un diplôme (PDF ou image)</Text>
        </TouchableOpacity>
      )}
      <Text style={[styles.helperText, { color: colors.textSecondary }]}>Un diplôme valide est requis pour prouver votre statut professionnel</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={[styles.backButtonText, { color: colors.tint }]}>←</Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.tint }]}>Ajouter Rôle Professionnel</Text>
          <Text style={[styles.stepIndicator, { color: colors.textSecondary }]}>
            Étape {currentStep} sur 3
          </Text>

          {error ? <Text style={[styles.errorText, { color: '#FF6B6B' }]}>{error}</Text> : null}

          <View style={styles.formContainer}>
            {currentStep === 1 && renderStepOneForm()}
            {currentStep === 2 && renderStepTwoForm()}
            {currentStep === 3 && renderStepThreeForm()}
          </View>

          {getStepHints(currentStep).length > 0 && (
            <View style={[styles.requirementsBox, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.requirementsTitle, { color: colors.text }]}>Pour continuer :</Text>
              {getStepHints(currentStep).map((hint, idx) => (
                <Text key={idx} style={[styles.requirementsText, { color: colors.textSecondary }]}>• {hint}</Text>
              ))}
            </View>
          )}

          <View style={styles.buttonsContainer}>
            {currentStep > 1 && (
              <TouchableOpacity style={[styles.button, { backgroundColor: colors.cardBackground, flex: 1 }]} onPress={() => setCurrentStep(currentStep - 1)} disabled={loading}>
                <Text style={[styles.buttonText, { color: colors.tint }]}>Précédent</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: loading || !isStepValid(currentStep) ? colors.textSecondary : colors.tint,
                  flex: 1,
                  marginLeft: currentStep > 1 ? 12 : 0,
                  opacity: loading || !isStepValid(currentStep) ? 0.7 : 1,
                },
              ]}
              onPress={() => {
                if (!isStepValid(currentStep)) return;
                if (currentStep < 3) {
                  setCurrentStep(currentStep + 1);
                } else {
                  handleAddRole();
                }
              }}
              disabled={loading || !isStepValid(currentStep)}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.buttonText, { color: '#fff' }]}>{currentStep === 3 ? 'Ajouter le rôle' : 'Suivant'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

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
    marginTop: 40,
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
  consentBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  consentText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: {
    color: '#fff',
    fontWeight: '700',
  },
  privacyLink: {
    fontSize: 14,
    fontWeight: '700',
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
  diplomaContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  diplomaPreview: {
    width: '100%',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  diplomaName: {
    fontSize: 14,
    fontWeight: '600',
  },
  changeDiplomaButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  changeDiplomaText: {
    color: '#fff',
    fontWeight: '600',
  },
  uploadDiplomaButton: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  uploadDiplomaText: {
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  requirementsBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  requirementsTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  requirementsText: {
    fontSize: 13,
    lineHeight: 18,
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
