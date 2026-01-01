import DeleteProfileModal from '@/components/DeleteProfileModal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { arrayUnion, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { acceptRgpdConsent, auth, db, deleteProfessionalPhoto, requestDataExport, signOut, uploadProfessionalPhoto } from '../../constants/firebase';
import { Colors } from '../../constants/theme';

type ProfessionalType = 'avocat' | 'psychologue' | '';

import * as DocumentPicker from 'expo-document-picker';
import { deleteProfessionalDiploma, uploadProfessionalDiploma } from '../../constants/firebase';
interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

interface DayAvailability {
  isOpen: boolean;
  slots: TimeSlot[];
}

interface AvailabilitySchedule {
  lundi: DayAvailability;
  mardi: DayAvailability;
  mercredi: DayAvailability;
  jeudi: DayAvailability;
  vendredi: DayAvailability;
  samedi: DayAvailability;
  dimanche: DayAvailability;
}

// Default time slots for a working day
const DEFAULT_SLOTS: TimeSlot[] = [
  { start: '08:00', end: '09:00', available: false },
  { start: '09:00', end: '10:00', available: true },
  { start: '10:00', end: '11:00', available: true },
  { start: '11:00', end: '12:00', available: true },
  { start: '12:00', end: '13:00', available: false }, // Lunch break
  { start: '13:00', end: '14:00', available: false },
  { start: '14:00', end: '15:00', available: true },
  { start: '15:00', end: '16:00', available: true },
  { start: '16:00', end: '17:00', available: true },
  { start: '17:00', end: '18:00', available: true },
  { start: '18:00', end: '19:00', available: false },
  { start: '19:00', end: '20:00', available: false },
];

const DEFAULT_AVAILABILITY: AvailabilitySchedule = {
  lundi: { isOpen: true, slots: DEFAULT_SLOTS },
  mardi: { isOpen: true, slots: DEFAULT_SLOTS },
  mercredi: { isOpen: true, slots: DEFAULT_SLOTS },
  jeudi: { isOpen: true, slots: DEFAULT_SLOTS },
  vendredi: { isOpen: true, slots: DEFAULT_SLOTS },
  samedi: { isOpen: false, slots: [] },
  dimanche: { isOpen: false, slots: [] },
};

export default function ProProfilScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const accentColor = '#FFCEB0';
  const privacyUrl = 'https://wekid.fr/politique-de-confidentialite';
  const consentVersion = '2024-12-06';
  const handleUploadDiploma = async () => {
    try {
      // Open document picker
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploadingDiploma(true);
        const asset = result.assets[0];
        
        // Convert URI to blob
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        
        // Upload to Firebase
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error('Utilisateur non connecté');
        }

        const uploadResult = await uploadProfessionalDiploma(currentUser.uid, blob);
        
        if (uploadResult.success) {
          setDiplomaUrl(uploadResult.diplomaUrl);
          Alert.alert('Succès', 'Diplôme mis à jour');
        } else {
          Alert.alert('Erreur', uploadResult.error || 'Impossible de télécharger le diplôme');
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Erreur', 'Erreur lors du téléchargement du diplôme');
    } finally {
      setIsUploadingDiploma(false);
    }
  };

  const handleDeleteDiploma = async () => {
    Alert.alert(
      'Supprimer le diplôme',
      'Êtes-vous sûr de vouloir supprimer votre diplôme ?',
      [
        { text: 'Annuler', onPress: () => {} },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsUploadingDiploma(true);
              const currentUser = auth.currentUser;
              if (!currentUser) {
                throw new Error('Utilisateur non connecté');
              }

              const deleteResult = await deleteProfessionalDiploma(currentUser.uid);
              
              if (deleteResult.success) {
                setDiplomaUrl(null);
                Alert.alert('Succès', 'Diplôme supprimé');
              } else {
                Alert.alert('Erreur', deleteResult.error || 'Impossible de supprimer le diplôme');
              }
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Erreur', 'Erreur lors de la suppression du diplôme');
            } finally {
              setIsUploadingDiploma(false);
            }
          }
        }
      ]
    );
  };

  const handleAcceptConsent = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      setIsSavingConsent(true);
      const res = await acceptRgpdConsent(currentUser.uid, currentUser.email || undefined);
      if (!res.success) {
        Alert.alert('Erreur', res.error || 'Enregistrement du consentement impossible');
        return;
      }
      setHasRgpdConsent(true);
      setConsentChecked(true);
      setShowConsentModal(false);
    } catch (error) {
      console.error('Consent error:', error);
      Alert.alert('Erreur', 'Impossible de valider votre consentement');
    } finally {
      setIsSavingConsent(false);
    }
  };

  const handleRequestExport = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      setExportLoading(true);
      const res = await requestDataExport(currentUser.uid, currentUser.email || undefined);
      if (!res.success) {
        Alert.alert('Erreur', res.error || 'Demande non créée');
        return;
      }
      Alert.alert('Demande envoyée', 'Nous préparons votre export de données. Un lien sécurisé sera envoyé par email.');
    } catch (error) {
      console.error('Export request error:', error);
      Alert.alert('Erreur', 'Impossible de demander l\'export pour le moment');
    } finally {
      setExportLoading(false);
    }
  };

  const handleAddMissingRole = async () => {
    const current = auth.currentUser;
    if (!current) return;
    const userRef = doc(db, 'users', current.uid);
    const missingRole = parentId ? (professionalId ? null : 'professionnel') : 'parent';
    if (!missingRole) {
      Alert.alert('Info', 'Les deux rôles sont déjà actifs.');
      return;
    }

    Alert.alert(
      'Ajouter un rôle',
      missingRole === 'professionnel'
        ? 'Ajouter le rôle Professionnel à votre compte ?'
        : 'Ajouter le rôle Parent à votre compte ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Continuer',
          onPress: async () => {
            try {
              const payload = missingRole === 'professionnel'
                ? { professional_id: current.uid, roles: arrayUnion('professionnel') }
                : { parent_id: current.uid, roles: arrayUnion('parent') };
              await updateDoc(userRef, payload);
              Alert.alert('Succès', 'Rôle ajouté. Complétez le profil associé.');
            } catch (e) {
              console.error('Error adding role', e);
              Alert.alert('Erreur', 'Impossible d\'ajouter le rôle.');
            }
          },
        },
      ]
    );
  };
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [diplomaUrl, setDiplomaUrl] = useState<string | null>(null);
  const [isUploadingDiploma, setIsUploadingDiploma] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  
  // Professional-specific fields
  const [professionalType, setProfessionalType] = useState<ProfessionalType>('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [description, setDescription] = useState('');
  const [availability, setAvailability] = useState<AvailabilitySchedule>(DEFAULT_AVAILABILITY);
  const [hasRgpdConsent, setHasRgpdConsent] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [isSavingConsent, setIsSavingConsent] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const handleOpenPrivacy = async () => {
    try {
      await Linking.openURL(privacyUrl);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ouvrir la politique de confidentialité');
    }
  };

  const handleOpenNotifications = async () => {
    try {
      const opened = await Linking.openSettings();
      if (!opened) {
        Alert.alert('Info', 'Ouvrez les réglages système pour ajuster les notifications.');
      }
    } catch (error) {
      Alert.alert('Info', 'Ouvrez les réglages système pour ajuster les notifications.');
    }
  };

  const handleContactSupport = async () => {
    const mailto = 'mailto:support@wekid.fr?subject=Support%20WeKid%20Pro&body=Décrivez votre demande:';
    const canOpen = await Linking.canOpenURL(mailto);
    if (!canOpen) {
      Alert.alert('Info', 'Envoyez-nous un email à support@wekid.fr');
      return;
    }
    await Linking.openURL(mailto);
  };

  const handleRateApp = async () => {
    try {
      const available = await StoreReview.isAvailableAsync();
      if (available) {
        await StoreReview.requestReview();
        return;
      }
    } catch (error) {
      // fallback to store links
    }
    const storeUrl = Platform.OS === 'ios'
      ? 'https://apps.apple.com/app/id000000000'
      : 'https://play.google.com/store/apps/details?id=com.wekid.app';
    try {
      await Linking.openURL(storeUrl);
    } catch (error) {
      Alert.alert('Info', 'Recherchez "WeKid" dans votre store pour laisser un avis.');
    }
  };
  
  // Edit modal states
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editField, setEditField] = useState<'name' | 'contact' | 'description' | 'availability' | 'type'>('name');
  const [tempFirstName, setTempFirstName] = useState('');
  const [tempLastName, setTempLastName] = useState('');
  const [tempAddress, setTempAddress] = useState('');
  const [tempPhone, setTempPhone] = useState('');
  const [tempSpecialty, setTempSpecialty] = useState('');
  const [tempDescription, setTempDescription] = useState('');
  const [tempAvailability, setTempAvailability] = useState<AvailabilitySchedule>(DEFAULT_AVAILABILITY);
  const [tempProfessionalType, setTempProfessionalType] = useState<ProfessionalType>('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<keyof AvailabilitySchedule>('lundi');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setEmail(currentUser.email || '');
      const uid = currentUser.uid;

      const fetchData = async () => {
        try {
          // Get user basic info
          const userDocRef = doc(db, 'users', uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setFirstName(userData.firstName || 'Professionnel');
            setLastName(userData.lastName || '');
            setParentId(userData.parent_id ?? (userData.userType === 'parent' ? uid : null));
            setProfessionalId(userData.professional_id ?? (userData.userType === 'professionnel' ? uid : null));
            const userConsent = !!userData.rgpdConsent?.accepted;
            setHasRgpdConsent(userConsent);
            setConsentChecked(userConsent);
            setShowConsentModal(!userConsent);
          }
          
          // Get professional profile
          const professionalDocRef = doc(db, 'professionals', uid);
          const professionalDocSnap = await getDoc(professionalDocRef);
          if (professionalDocSnap.exists()) {
            const profData = professionalDocSnap.data();
            setProfessionalType(profData.type || '');
            setAddress(profData.address || '');
            setPhone(profData.phone || '');
            setSpecialty(profData.specialty || '');
            setDescription(profData.description || '');
            setPhotoUrl(profData.photoUrl || null);
            const consentAccepted = !!(profData.rgpdConsent && profData.rgpdConsent.accepted);
            const finalConsent = consentAccepted || hasRgpdConsent;
            setHasRgpdConsent(finalConsent);
            setConsentChecked(finalConsent);
            setShowConsentModal(!finalConsent);
            
            // Handle availability - support both old (string) and new (object) format
            if (profData.availability) {
               // Check if it's the old format (strings) or new format (objects)
               setDiplomaUrl(profData.diplomaUrl || null);
              const firstDay = profData.availability.lundi;
              if (typeof firstDay === 'string') {
                // Old format - convert to new format
                setAvailability(DEFAULT_AVAILABILITY);
              } else if (firstDay && typeof firstDay === 'object' && 'isOpen' in firstDay) {
                // New format - use as is
                setAvailability(profData.availability);
              } else {
                setAvailability(DEFAULT_AVAILABILITY);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    } else {
      router.replace('/(auth)/LoginScreen');
    }
  }, [router]);

  const handleLogout = async () => {
  console.log('=== handleLogout triggered ===');
  try {
    // 1. Naviguer d'abord vers l'écran public (Welcome)
    // Cela force le "unmount" de tes écrans protégés et déclenche le cleanup du useEffect
    router.replace('/(auth)/WelcomeScreen');

    // 2. Attendre que le démontage soit effectif (100ms suffisent)
    // avant de couper l'accès Firebase
    setTimeout(async () => {
      console.log('Calling signOut after navigation...');
      await signOut();
      console.log('SignOut completed cleanly');
    }, 100);

  } catch (error) {
    console.error('Error signing out:', error);
    // En cas d'erreur, on force quand même la navigation pour ne pas bloquer l'user
    router.replace('/(auth)/WelcomeScreen');
  }
};

  const handleUploadPhoto = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Erreur', 'Accès à la galerie refusé');
        return;
      }

      // Open image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploadingPhoto(true);
        const asset = result.assets[0];
        
        // Convert URI to blob
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        
        // Upload to Firebase
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error('Utilisateur non connecté');
        }

        const uploadResult = await uploadProfessionalPhoto(currentUser.uid, blob);
        
        if (uploadResult.success) {
          setPhotoUrl(uploadResult.photoUrl);
          Alert.alert('Succès', 'Photo de profil mise à jour');
        } else {
          Alert.alert('Erreur', uploadResult.error || 'Impossible de télécharger la photo');
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Erreur', 'Erreur lors du téléchargement de la photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    Alert.alert(
      'Supprimer la photo',
      'Êtes-vous sûr de vouloir supprimer votre photo de profil ?',
      [
        { text: 'Annuler', onPress: () => {} },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsUploadingPhoto(true);
              const currentUser = auth.currentUser;
              if (!currentUser) {
                throw new Error('Utilisateur non connecté');
              }

              const deleteResult = await deleteProfessionalPhoto(currentUser.uid);
              
              if (deleteResult.success) {
                setPhotoUrl(null);
                Alert.alert('Succès', 'Photo de profil supprimée');
              } else {
                Alert.alert('Erreur', deleteResult.error || 'Impossible de supprimer la photo');
              }
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Erreur', 'Erreur lors de la suppression de la photo');
            } finally {
              setIsUploadingPhoto(false);
            }
          }
        }
      ]
    );
  };

  const openEditModal = (field: 'name' | 'contact' | 'description' | 'availability' | 'type') => {
    setEditField(field);
    setTempFirstName(firstName);
    setTempLastName(lastName);
    setTempAddress(address);
    setTempPhone(phone);
    setTempSpecialty(specialty);
    setTempDescription(description);
    setTempAvailability(availability);
    setTempProfessionalType(professionalType);
    setIsEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setIsSaving(true);
    try {
      const uid = currentUser.uid;
      
      // Update user basic info
      if (editField === 'name') {
        const userDocRef = doc(db, 'users', uid);
        await setDoc(userDocRef, {
          firstName: tempFirstName,
          lastName: tempLastName
        }, { merge: true });
        setFirstName(tempFirstName);
        setLastName(tempLastName);
      }
      
      // Update professional profile
      const professionalDocRef = doc(db, 'professionals', uid);
      const updateData: any = {
        userId: uid,
        email: currentUser.email,
        firstName: editField === 'name' ? tempFirstName : firstName,
        lastName: editField === 'name' ? tempLastName : lastName,
      };

      if (editField === 'contact') {
        updateData.address = tempAddress;
        updateData.phone = tempPhone;
        updateData.specialty = tempSpecialty;
        setAddress(tempAddress);
        setPhone(tempPhone);
        setSpecialty(tempSpecialty);
      } else if (editField === 'description') {
        updateData.description = tempDescription;
        setDescription(tempDescription);
      } else if (editField === 'availability') {
        updateData.availability = tempAvailability;
        setAvailability(tempAvailability);
      } else if (editField === 'type') {
        updateData.type = tempProfessionalType;
        setProfessionalType(tempProfessionalType);
      }
      
      // Always include current values for fields not being edited
      if (editField !== 'contact') {
        updateData.address = address;
        updateData.phone = phone;
        updateData.specialty = specialty;
      }
      if (editField !== 'description') {
        updateData.description = description;
      }
      if (editField !== 'availability') {
        updateData.availability = availability;
      }
      if (editField !== 'type') {
        updateData.type = professionalType;
      }

      await setDoc(professionalDocRef, updateData, { merge: true });
      
      setIsEditModalVisible(false);
      Alert.alert('Succès', 'Votre profil a été mis à jour');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le profil');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.containerCentered}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={[styles.title, { color: accentColor }]} numberOfLines={1} ellipsizeMode="tail">Profil </Text>
              {(!parentId || !professionalId) && (
                <TouchableOpacity style={[styles.addRoleButton, { backgroundColor: colors.cardBackground }]} onPress={handleAddMissingRole}>
                  <IconSymbol name="person.badge.plus" size={18} color={accentColor} />
                  <Text style={[styles.addRoleText, { color: accentColor }]}>
                    {!parentId ? 'Ajouter rôle Parent' : 'Ajouter rôle Pro'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.userInfoSection}>
            <Text style={[styles.name, { color: colors.text }]}>{firstName} {lastName}</Text>
            {professionalType && (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {professionalType === 'avocat' ? 'Avocat' : 'Psychologue'}
              </Text>
            )}
            {!professionalType && (
              <Text style={[styles.warningText, { color: '#FF6B6B' }]}>
                ⚠️ Définissez votre type de professionnel pour apparaître dans les recherches
              </Text>
            )}
          </View>

          <View style={styles.avatarSection}>
            {photoUrl ? (
              <Image 
                source={{ uri: photoUrl }} 
                style={[styles.avatarCircle, { borderRadius: 60 }]}
              />
            ) : (
              <View style={[styles.avatarCircle, { backgroundColor: colors.secondaryCardBackground }]}>
                <IconSymbol name="person.fill" size={60} color={accentColor} />
              </View>
            )}
            <View style={styles.photoButtonsContainer}>
              <TouchableOpacity 
                style={[styles.photoButton, { backgroundColor: accentColor }]}
                onPress={handleUploadPhoto}
                disabled={isUploadingPhoto}
              >
                {isUploadingPhoto ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <IconSymbol name="camera.fill" size={16} color="#fff" />
                )}
              </TouchableOpacity>
              {photoUrl && (
                <TouchableOpacity 
                  style={[styles.photoButton, { backgroundColor: '#FF6B6B' }]}
                  onPress={handleDeletePhoto}
                  disabled={isUploadingPhoto}
                >
                  <IconSymbol name="trash.fill" size={16} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Diplôme */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>Diplôme ou Certification</Text>
            </View>

            {diplomaUrl ? (
              <View style={[styles.diplomaCard, { backgroundColor: colors.cardBackground }]}>
                <View style={styles.diplomaInfo}>
                  <IconSymbol name="doc.fill" size={24} color={accentColor} />
                  <View style={styles.diplomaTextContainer}>
                    <Text style={[styles.diplomaLabel, { color: colors.textSecondary }]}>Diplôme téléchargé</Text>
                    <Text style={[styles.diplomaValue, { color: colors.text }]}>Document disponible</Text>
                  </View>
                </View>
                <View style={styles.diplomaButtonsContainer}>
                  <TouchableOpacity 
                    style={[styles.diplomaButton, { backgroundColor: accentColor }]}
                    onPress={handleUploadDiploma}
                    disabled={isUploadingDiploma}
                  >
                    {isUploadingDiploma ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <IconSymbol name="arrow.up.doc.fill" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.diplomaButton, { backgroundColor: '#FF6B6B' }]}
                    onPress={handleDeleteDiploma}
                    disabled={isUploadingDiploma}
                  >
                    <IconSymbol name="trash.fill" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={[styles.diplomaCard, { backgroundColor: colors.cardBackground, borderStyle: 'dashed', borderWidth: 1, borderColor: accentColor }]}>
                <View style={styles.diplomaInfo}>
                  <IconSymbol name="doc.badge.plus" size={24} color={accentColor} />
                  <View style={styles.diplomaTextContainer}>
                    <Text style={[styles.diplomaLabel, { color: colors.textSecondary }]}>Aucun diplôme</Text>
                    <Text style={[styles.diplomaValue, { color: colors.text }]}>Ajoutez un diplôme ou une certification</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={[styles.diplomaButton, { backgroundColor: accentColor }]}
                  onPress={handleUploadDiploma}
                  disabled={isUploadingDiploma}
                >
                  {isUploadingDiploma ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <IconSymbol name="arrow.up.doc.fill" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Type de professionnel */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>Type de professionnel</Text>
            </View>
            
            <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.infoRow}>
                <IconSymbol name="briefcase" size={20} color={colors.textSecondary} />
                <View style={styles.infoText}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Profession</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {professionalType === 'avocat' ? 'Avocat' : professionalType === 'psychologue' ? 'Psychologue' : 'Non défini'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Informations personnelles */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>Informations personnelles</Text>
            </View>
            
            <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.infoRow}>
                <IconSymbol name="person" size={20} color={colors.textSecondary} />
                <View style={styles.infoText}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Nom</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{firstName} {lastName}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.infoRow}>
                <IconSymbol name="envelope" size={20} color={colors.textSecondary} />
                <View style={styles.infoText}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{email}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Coordonnées professionnelles */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>Coordonnées professionnelles</Text>
              <TouchableOpacity 
                onPress={() => openEditModal('contact')}
                style={[styles.editButton, { backgroundColor: accentColor }]}
              >
                <IconSymbol name="pencil" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.infoRow}>
                <IconSymbol name="mappin" size={20} color={colors.textSecondary} />
                <View style={styles.infoText}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Adresse</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{address || 'Non renseignée'}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.infoRow}>
                <IconSymbol name="phone" size={20} color={colors.textSecondary} />
                <View style={styles.infoText}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Téléphone</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{phone || 'Non renseigné'}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.infoRow}>
                <IconSymbol name="star" size={20} color={colors.textSecondary} />
                <View style={styles.infoText}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Spécialité</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{specialty || 'Non renseignée'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>Description</Text>
              <TouchableOpacity 
                onPress={() => openEditModal('description')}
                style={[styles.editButton, { backgroundColor: accentColor }]}
              >
                <IconSymbol name="pencil" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.descriptionText, { color: colors.text }]}>
                {description || 'Aucune description'}
              </Text>
            </View>
          </View>

          {/* Disponibilités */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>Disponibilités</Text>
              <TouchableOpacity 
                onPress={() => openEditModal('availability')}
                style={[styles.editButton, { backgroundColor: accentColor }]}
              >
                <IconSymbol name="pencil" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
              {Object.entries(availability).map(([day, dayData]) => {
                const dayName = day.charAt(0).toUpperCase() + day.slice(1);
                const availableSlots = dayData.isOpen 
                  ? dayData.slots.filter(slot => slot.available)
                  : [];
                
                return (
                  <View key={day} style={styles.availabilityRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dayText, { color: colors.text, fontWeight: '600' }]}>
                        {dayName}
                      </Text>
                      {!dayData.isOpen ? (
                        <Text style={[styles.slotText, { color: colors.textSecondary, fontStyle: 'italic' }]}>
                          Fermé
                        </Text>
                      ) : availableSlots.length === 0 ? (
                        <Text style={[styles.slotText, { color: colors.textSecondary, fontStyle: 'italic' }]}>
                          Aucun créneau disponible
                        </Text>
                      ) : (
                        <View style={styles.slotsContainer}>
                          {availableSlots.map((slot, idx) => (
                            <View key={idx} style={[styles.slotChip, { backgroundColor: accentColor + '20', borderColor: accentColor }]}>
                              <Text style={[styles.slotText, { color: '#000' }]}>
                                {slot.start} - {slot.end}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>Mes données</Text>
            </View>
            <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.descriptionText, { color: colors.text, marginBottom: 12 }]}>Exportez vos données personnelles ou consultez la politique de confidentialité.</Text>
              <View style={styles.dataActionsRow}>
                <TouchableOpacity
                  style={[styles.dataActionButton, { backgroundColor: accentColor }]}
                  onPress={handleRequestExport}
                  disabled={exportLoading}
                >
                  {exportLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.dataActionText}>Demander l'export</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dataActionButton, { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: accentColor }]}
                  onPress={() => Linking.openURL(privacyUrl)}
                >
                  <Text style={[styles.dataActionText, { color: accentColor }]}>Politique RGPD</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>Sécurité & notifications</Text>
            </View>
            <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}> 
              <TouchableOpacity style={styles.supportRow} onPress={handleOpenPrivacy}>
                <IconSymbol name="lock" size={22} color={colors.textSecondary} />
                <Text style={[styles.supportText, { color: colors.text }]}>Sécurités et confidentialité</Text>
                <IconSymbol name="chevron.right" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
              <TouchableOpacity style={styles.supportRow} onPress={handleOpenNotifications}>
                <IconSymbol name="bell" size={22} color={colors.textSecondary} />
                <Text style={[styles.supportText, { color: colors.text }]}>Notifications</Text>
                <IconSymbol name="chevron.right" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>Support</Text>
            </View>
            <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}> 
              <TouchableOpacity style={styles.supportRow} onPress={() => router.push('/helpcenter-pro')}>
                <IconSymbol name="questionmark.circle" size={22} color={colors.textSecondary} />
                <Text style={[styles.supportText, { color: colors.text }]}>Centre d'aide</Text>
                <IconSymbol name="chevron.right" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
              <TouchableOpacity style={styles.supportRow} onPress={handleContactSupport}>
                <IconSymbol name="envelope" size={22} color={colors.textSecondary} />
                <Text style={[styles.supportText, { color: colors.text }]}>Nous contacter</Text>
                <IconSymbol name="chevron.right" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
              <TouchableOpacity style={styles.supportRow} onPress={handleRateApp}>
                <IconSymbol name="star" size={22} color={colors.textSecondary} />
                <Text style={[styles.supportText, { color: colors.text }]}>Evaluer l'application</Text>
                <IconSymbol name="chevron.right" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <IconSymbol name="arrow.right.square" size={20} color="#fff" />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>

          {/* Delete Profile Button */}
          <TouchableOpacity 
            style={[styles.deleteProfileButton]} 
            onPress={() => setShowDeleteModal(true)}
          >
            <IconSymbol name="trash.fill" size={20} color="#fff" />
            <Text style={styles.deleteProfileText}>Supprimer mon profil</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showConsentModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (hasRgpdConsent) setShowConsentModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground, padding: 24 }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 12 }]}>Consentement RGPD</Text>
            <Text style={[styles.descriptionText, { color: colors.text, marginBottom: 12 }]}>
              Avant d'accéder à votre espace professionnel, merci de valider la politique de confidentialité et l'usage de vos données.
            </Text>
            <TouchableOpacity
              style={[styles.consentRow, { marginBottom: 12 }]}
              onPress={() => setConsentChecked(!consentChecked)}
            >
              <View style={[styles.checkbox, { borderColor: accentColor, backgroundColor: consentChecked ? accentColor : 'transparent' }]}>
                {consentChecked && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
              <Text style={[styles.consentText, { color: colors.text }]}>
                J'accepte la Politique de confidentialité et les conditions RGPD (version {consentVersion}).
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL(privacyUrl)}>
              <Text style={[styles.dataActionText, { color: accentColor, textAlign: 'left' }]}>Lire la politique</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', marginTop: 18 }}>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: consentChecked ? accentColor : '#ddd' }]}
                disabled={!consentChecked || isSavingConsent}
                onPress={handleAcceptConsent}
              >
                {isSavingConsent ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Valider et continuer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Profile Modal */}
      <DeleteProfileModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        userId={auth.currentUser?.uid || ''}
      />

      {/* Edit Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editField === 'name' && 'Modifier le nom'}
                {editField === 'contact' && 'Modifier les coordonnées'}
                {editField === 'description' && 'Modifier la description'}
                {editField === 'availability' && 'Modifier les disponibilités'}
                {editField === 'type' && 'Modifier le type'}
              </Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <IconSymbol name="xmark" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {editField === 'name' && (
                <>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Prénom</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                    value={tempFirstName}
                    onChangeText={setTempFirstName}
                    placeholder="Prénom"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nom</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                    value={tempLastName}
                    onChangeText={setTempLastName}
                    placeholder="Nom"
                    placeholderTextColor={colors.textSecondary}
                  />
                </>
              )}

              {editField === 'type' && (
                <>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Type de professionnel</Text>
                  <TouchableOpacity
                    style={[styles.typeButton, { 
                      backgroundColor: tempProfessionalType === 'avocat' ? accentColor : colors.background,
                      borderColor: colors.border,
                      borderWidth: 1
                    }]}
                    onPress={() => setTempProfessionalType('avocat')}
                  >
                    <IconSymbol name="doc.text" size={24} color={tempProfessionalType === 'avocat' ? '#fff' : colors.text} />
                    <Text style={[styles.typeButtonText, { 
                      color: tempProfessionalType === 'avocat' ? '#fff' : colors.text 
                    }]}>
                      Avocat
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeButton, { 
                      backgroundColor: tempProfessionalType === 'psychologue' ? accentColor : colors.background,
                      borderColor: colors.border,
                      borderWidth: 1
                    }]}
                    onPress={() => setTempProfessionalType('psychologue')}
                  >
                    <IconSymbol name="person.fill" size={24} color={tempProfessionalType === 'psychologue' ? '#fff' : colors.text} />
                    <Text style={[styles.typeButtonText, { 
                      color: tempProfessionalType === 'psychologue' ? '#fff' : colors.text 
                    }]}>
                      Psychologue
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {editField === 'contact' && (
                <>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Adresse</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                    value={tempAddress}
                    onChangeText={setTempAddress}
                    placeholder="Ville, Code postal"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Téléphone</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                    value={tempPhone}
                    onChangeText={setTempPhone}
                    placeholder="+33 X XX XX XX XX"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="phone-pad"
                  />
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Spécialité</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                    value={tempSpecialty}
                    onChangeText={setTempSpecialty}
                    placeholder="Ex: Droit de la Famille"
                    placeholderTextColor={colors.textSecondary}
                  />
                </>
              )}

              {editField === 'description' && (
                <>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Description</Text>
                  <TextInput
                    style={[styles.textArea, { backgroundColor: colors.background, color: colors.text }]}
                    value={tempDescription}
                    onChangeText={setTempDescription}
                    placeholder="Décrivez votre parcours et vos compétences..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                  />
                </>
              )}

              {editField === 'availability' && (
                <>
                  {/* Day selector */}
                  <View style={styles.daySelector}>
                    {Object.keys(tempAvailability).map((day) => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dayTab,
                          { 
                            backgroundColor: selectedDay === day ? accentColor : colors.background,
                            borderColor: colors.border,
                          }
                        ]}
                        onPress={() => setSelectedDay(day as keyof AvailabilitySchedule)}
                      >
                        <Text style={[
                          styles.dayTabText,
                          { color: selectedDay === day ? '#fff' : colors.text }
                        ]}>
                          {day.substring(0, 3).charAt(0).toUpperCase() + day.substring(1, 3)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Selected day configuration */}
                  <View style={styles.dayConfig}>
                    <Text style={[styles.inputLabel, { color: colors.text, fontSize: 18, fontWeight: '600' }]}>
                      {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}
                    </Text>
                    
                    {/* Open/Closed toggle */}
                    <View style={styles.toggleRow}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                        Jour ouvert
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.toggleButton,
                          { backgroundColor: tempAvailability[selectedDay].isOpen ? accentColor : colors.border }
                        ]}
                        onPress={() => {
                          setTempAvailability({
                            ...tempAvailability,
                            [selectedDay]: {
                              ...tempAvailability[selectedDay],
                              isOpen: !tempAvailability[selectedDay].isOpen
                            }
                          });
                        }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '600' }}>
                          {tempAvailability[selectedDay].isOpen ? 'Ouvert' : 'Fermé'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Time slots */}
                    {tempAvailability[selectedDay].isOpen && (
                      <>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 16 }]}>
                          Créneaux horaires disponibles
                        </Text>
                        <ScrollView style={{ maxHeight: 200 }}>
                          {tempAvailability[selectedDay].slots.map((slot, index) => (
                            <TouchableOpacity
                              key={index}
                              style={[
                                styles.slotRow,
                                {
                                  backgroundColor: slot.available ? accentColor + '20' : colors.background,
                                  borderColor: slot.available ? accentColor : colors.border,
                                }
                              ]}
                              onPress={() => {
                                const newSlots = [...tempAvailability[selectedDay].slots];
                                newSlots[index] = { ...newSlots[index], available: !newSlots[index].available };
                                setTempAvailability({
                                  ...tempAvailability,
                                  [selectedDay]: {
                                    ...tempAvailability[selectedDay],
                                    slots: newSlots
                                  }
                                });
                              }}
                            >
                              <Text style={[
                                styles.slotTimeText,
                                { color: '#000' }
                              ]}>
                                {slot.start} - {slot.end}
                              </Text>
                              {slot.available && (
                                <IconSymbol name="checkmark.circle.fill" size={20} color={accentColor} />
                              )}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </>
                    )}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: accentColor }]}
                onPress={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Enregistrer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  scrollView: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 80 },
  containerCentered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 28, fontWeight: '700', color: '#FFCEB0', flex: 1, minWidth: 0, marginRight: 12 },
  headerSubtitle: { fontSize: 14, fontWeight: '400', marginTop: 6, opacity: 0.8 },
  addRoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  addRoleText: { fontWeight: '700' },
  userInfoSection: { marginBottom: 24 },
  name: { fontSize: 24, fontWeight: '600', color: '#111' },
  subtitle: { fontSize: 16, fontWeight: '500', marginTop: 4 },
  warningText: { fontSize: 14, fontWeight: '500', marginTop: 8, lineHeight: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#FFF5EE', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4 },
  photoButtonsContainer: { flexDirection: 'row', gap: 12, marginTop: 12 },
  photoButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2 },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 22, fontWeight: '600' },
  editButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2 },
  infoCard: { backgroundColor: '#E8E8E8', borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoText: { marginLeft: 16, flex: 1 },
  infoLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: '600', color: '#111' },
  descriptionText: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  availabilityRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  dayText: { fontSize: 14, fontWeight: '500' },
  hoursText: { fontSize: 14, fontWeight: '400' },
  slotsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  slotChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 4, marginBottom: 4 },
  slotText: { fontSize: 12, fontWeight: '500' },
  dataActionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  dataActionButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dataActionText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  consentText: { flex: 1, fontSize: 14, fontWeight: '500' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkboxMark: { color: '#fff', fontWeight: '700' },
  daySelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  dayTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  dayTabText: { fontSize: 13, fontWeight: '600' },
  dayConfig: { marginTop: 8 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  toggleButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  slotRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  slotTimeText: { fontSize: 15, fontWeight: '500' },
  logoutButton: { backgroundColor: '#FF6B6B', borderRadius: 20, paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 3 },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '700', marginLeft: 10 },
  deleteProfileButton: { backgroundColor: '#C0392B', borderRadius: 20, paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 3 },
  deleteProfileText: { color: '#fff', fontSize: 16, fontWeight: '700', marginLeft: 10 },
  supportRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  supportText: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '600' },
  rowDivider: { height: 1, width: '100%' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxHeight: '80%', borderRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalScroll: { maxHeight: 400 },
  inputLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8, marginTop: 12 },
  input: { borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 8 },
  textArea: { borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 8, minHeight: 120 },
  typeButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12 },
  typeButtonText: { fontSize: 16, fontWeight: '600', marginLeft: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginHorizontal: 6 },
  cancelButton: { backgroundColor: '#ddd' },
  saveButton: { backgroundColor: '#FFCEB0' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#333' },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  diplomaCard: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  diplomaInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  diplomaTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  diplomaLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  diplomaValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  diplomaButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  diplomaButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
