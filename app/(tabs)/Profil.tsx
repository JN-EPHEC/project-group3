import DeleteProfileModal from '@/components/DeleteProfileModal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BORDER_RADIUS, FONT_SIZES, hs, SAFE_BOTTOM_SPACING, SPACING, V_SPACING, vs } from '@/constants/responsive';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFocusEffect, useRouter } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { User } from 'firebase/auth';
import { arrayUnion, collection, doc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db, getUserFamilies, joinFamilyByCode, leaveFamilyById, signOut } from '../../constants/firebase';

import ChildMedicalRecord, { ChildMedicalRecordData } from '@/components/ChildMedicalRecord';
import * as ImagePicker from 'expo-image-picker';
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { Image } from 'react-native';

export default function ProfilScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [families, setFamilies] = useState<any[]>([]);
  const [selectedFamilyIndex, setSelectedFamilyIndex] = useState(0);
  const [showJoinFamily, setShowJoinFamily] = useState(false);
  const [showLeaveFamily, setShowLeaveFamily] = useState(false);
  const [joinFamilyCode, setJoinFamilyCode] = useState('');  
  const [familyMembers, setFamilyMembers] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [isChildrenDropdownOpen, setIsChildrenDropdownOpen] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [showAddChild, setShowAddChild] = useState(false);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editingChildName, setEditingChildName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userRole, setUserRole] = useState('parent');
  const [parentId, setParentId] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState('');
  const [editFamilyName, setEditFamilyName] = useState('');
  const [isEditingFamilyName, setIsEditingFamilyName] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [medicalModalVisible, setMedicalModalVisible] = useState(false);
  const [selectedChildForMedical, setSelectedChildForMedical] = useState<{ id: string; name: string } | null>(null);
  const [savingMedical, setSavingMedical] = useState(false);
  const [familyMemberCounts, setFamilyMemberCounts] = useState<{ [familyId: string]: number }>({});
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);

  const currentFamilyId = families[selectedFamilyIndex]?.id;
  const selectedChildFull = selectedChildForMedical
    ? children.find((c) => c.id === selectedChildForMedical.id) || null
    : null;

  const privacyUrl = 'https://wekid.be/politique-de-confidentialite';

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
    const mailto = 'mailto:support@wekid.be?subject=Support%20WeKid&body=Décrivez votre demande:';
    const canOpen = await Linking.canOpenURL(mailto);
    if (!canOpen) {
      Alert.alert('Info', 'Envoyez-nous un email à support@wekid.be');
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
      // fall back to store links below
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

  const handleConfirmMedicalRecord = async (updatedRecord: ChildMedicalRecordData) => {
    if (!currentFamilyId || !selectedChildForMedical) return;
    try {
      setSavingMedical(true);
      const newName = (updatedRecord?.general?.fullName || '').trim() || selectedChildForMedical.name;
      const updatedChildren = children.map((c) =>
        c.id === selectedChildForMedical.id ? { ...c, name: newName, medicalRecord: updatedRecord } : c
      );
      const familyDocRef = doc(db, 'families', currentFamilyId);
      await updateDoc(familyDocRef, { children: updatedChildren });
      setChildren(updatedChildren);
      // Also update the selected child header name in modal
      setSelectedChildForMedical(prev => (prev ? { ...prev, name: newName } : prev));
    } catch (e) {
      console.error('Error saving medical record:', e);
      Alert.alert('Erreur', 'Impossible de sauvegarder la fiche médicale');
    } finally {
      setSavingMedical(false);
    }
  };
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Force modal update when theme changes
  useEffect(() => {
    if (medicalModalVisible) {
      // Trigger a re-render of the modal content
      setSelectedChildForMedical(selectedChildForMedical);
    }
  }, [colorScheme, medicalModalVisible]);

  const handleAddMissingRole = async () => {
    const current = auth.currentUser;
    if (!current) return;

    const missingRole = parentId ? (professionalId ? null : 'professionnel') : 'parent';
    if (!missingRole) {
      Alert.alert('Info', 'Les deux rôles sont déjà actifs.');
      return;
    }

    if (missingRole === 'professionnel') {
      // Rediriger vers l'écran dédié pour remplir toutes les infos professionnelles
      router.push('/AddProfessionalRole');
    } else {
      // Pour le rôle parent, simple mise à jour
      Alert.alert(
        'Ajouter rôle Parent',
        'Ajouter le rôle Parent à votre compte ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Continuer',
            onPress: async () => {
              try {
                const userRef = doc(db, 'users', current.uid);
                await updateDoc(userRef, {
                  parent_id: current.uid,
                  roles: arrayUnion('parent'),
                });
                Alert.alert('Succès', 'Rôle Parent ajouté avec succès.');
              } catch (e) {
                console.error('Error adding parent role', e);
                Alert.alert('Erreur', 'Impossible d\'ajouter le rôle.');
              }
            },
          },
        ]
      );
    }
  };

  // Load subscription status on login
  const loadSubscriptionStatus = useCallback(async () => {
    if (!user) return;
    setLoadingSubscription(true);
    try {
      const { StripeService } = await import('../../constants/stripeService');
      const status = await StripeService.getSubscriptionStatus(user.uid);
      setSubscriptionStatus(status);
    } catch (error) {
      console.error('Error loading subscription status:', error);
    } finally {
      setLoadingSubscription(false);
    }
  }, [user]);

  // Recharger le statut quand l'écran est affiché (focus)
  useFocusEffect(
    useCallback(() => {
      loadSubscriptionStatus();
    }, [loadSubscriptionStatus])
  );

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
      setEmail(currentUser.email || '');
      // Load subscription status when user logs in
      loadSubscriptionStatus();
      const uid = currentUser.uid;

      const userDocRef = doc(db, 'users', uid);
      const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          const userFirstName = userData.firstName || 'Utilisateur';
          const userLastName = userData.lastName || '';
          setFirstName(userFirstName);
          setLastName(userLastName);
          setEditFirstName(userFirstName);
          setEditLastName(userLastName);
          if (userData.userType) {
            setUserRole(userData.userType);
          }
          setParentId(userData.parent_id ?? (userData.userType === 'parent' ? currentUser.uid : null));
          setProfessionalId(userData.professional_id ?? (userData.userType === 'professionnel' ? currentUser.uid : null));
          if (userData.profileImage) {
            setProfileImage(userData.profileImage);
          }
        }
      });

      const fetchFamilies = async () => {
        try {
          const userFamilies = await getUserFamilies(uid);
          setFamilies(userFamilies);
        } catch (error) {
          console.error("Error fetching families:", error);
        }
      };
      fetchFamilies();

      return () => unsubscribeUser();

    } else {
      router.replace('/(auth)/LoginScreen');
    }
  }, [router]);

  // Écouter toutes les familles pour mettre à jour le nombre de membres actifs en temps réel
  useEffect(() => {
    if (families.length === 0) return;

    const unsubscribers: (() => void)[] = [];

    families.forEach((family) => {
      const familyDocRef = doc(db, 'families', family.id);
      const unsubscribe = onSnapshot(familyDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const familyData = docSnapshot.data();
          const memberIds = familyData.members || [];
          
          if (memberIds.length === 0) {
            setFamilyMemberCounts(prev => ({ ...prev, [family.id]: 0 }));
            return;
          }
          
          // Compter seulement les membres qui ont encore un compte actif
          const membersQuery = query(collection(db, 'users'), where('__name__', 'in', memberIds));
          getDocs(membersQuery).then(membersSnapshot => {
            const activeMemberCount = membersSnapshot.docs.length;
            setFamilyMemberCounts(prev => ({ ...prev, [family.id]: activeMemberCount }));
          }).catch(error => {
            console.error('Error counting active members:', error);
            setFamilyMemberCounts(prev => ({ ...prev, [family.id]: memberIds.length }));
          });
        }
      });
      unsubscribers.push(unsubscribe);
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [families.map(f => f.id).join(',')]);

  useEffect(() => {
    if (families.length === 0 && !loading) {
        setChildren([]);
        setFamilyMembers([]);
        setFamilyName('');
        setEditFamilyName('');
        return;
    };

    if (families.length > 0) {
      const family = families[selectedFamilyIndex];
      if (!family) return;

      const familyDocRef = doc(db, 'families', family.id);
      
      let unsubscribeMembers = () => {};

      const unsubscribeFamily = onSnapshot(familyDocRef, (doc) => {
        unsubscribeMembers(); // Unsubscribe from previous members listener

        if (doc.exists()) {
          const familyData = doc.data();
          setChildren(familyData.children || []);
          setFamilyName(familyData.name || `Famille ${selectedFamilyIndex + 1}`);
          setEditFamilyName(familyData.name || `Famille ${selectedFamilyIndex + 1}`);
          
          if (familyData.members && familyData.members.length > 0) {
            const membersQuery = query(collection(db, 'users'), where('__name__', 'in', familyData.members));
            unsubscribeMembers = onSnapshot(membersQuery, (querySnapshot) => {
              const membersDetails = querySnapshot.docs.map(doc => ({
                id: doc.id,
                firstName: doc.data().firstName || 'Membre',
                lastName: doc.data().lastName || '',
              }));
              setFamilyMembers(membersDetails);
              if (loading) setLoading(false);
            });
          } else {
            setFamilyMembers([]);
            if (loading) setLoading(false);
          }
        } else {
          if (loading) setLoading(false);
        }
      }, (error) => {
        console.error("Error listening to family data:", error);
        if (loading) setLoading(false);
      });

      return () => {
          unsubscribeFamily();
          unsubscribeMembers();
      };
    }
  }, [selectedFamilyIndex, families, loading]);

  const uploadImage = async (uri: string) => {
    if (!user) return null;
    const response = await fetch(uri);
    const blob = await response.blob();
    const storage = getStorage();
    const storageRef = ref(storage, `profile_images/${user.uid}`);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Vous devez autoriser l\\\'accès à la galerie pour changer votre photo de profil.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;
      setIsSaving(true);
      try {
        const uploadURL = await uploadImage(imageUri);
        if (uploadURL && user) {
          const userDocRef = doc(db, 'users', user.uid);
          await updateDoc(userDocRef, { profileImage: uploadURL });
          setProfileImage(uploadURL);
          Alert.alert('Succès', 'Votre photo de profil a été mise à jour.');
        }
      } catch (error) {
        console.error("Error uploading image:", error);
        Alert.alert('Erreur', 'Impossible de mettre à jour la photo de profil.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!user) return;
  
    Alert.alert(
      "Supprimer la photo",
      "Êtes-vous sûr de vouloir supprimer votre photo de profil ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            setIsSaving(true);
            try {
              const userDocRef = doc(db, 'users', user.uid);
              await updateDoc(userDocRef, { profileImage: null });
  
              const storage = getStorage();
              const imageRef = ref(storage, `profile_images/${user.uid}`);
              try {
                await getDownloadURL(imageRef); // Check if file exists
                await deleteObject(imageRef);
              } catch (error: any) {
                if (error.code !== 'storage/object-not-found') {
                  throw error;
                }
                // If the file doesn't exist, we don't need to do anything.
              }
  
              setProfileImage(null);
              Alert.alert('Succès', 'Votre photo de profil a été supprimée.');
            } catch (error) {
              console.error("Error removing image:", error);
              Alert.alert('Erreur', 'Impossible de supprimer la photo de profil.');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };
  
  const handleSaveFamilyName = async () => {
    if (!editFamilyName.trim()) {
      Alert.alert('Erreur', 'Le nom de la famille ne peut pas être vide');
      return;
    }
    if (families.length === 0 || !families[selectedFamilyIndex]) {
      Alert.alert('Erreur', 'ID de famille introuvable.');
      return;
    }
    const familyId = families[selectedFamilyIndex].id;

    setIsSaving(true);
    try {
      const familyDocRef = doc(db, 'families', familyId);
      await updateDoc(familyDocRef, { name: editFamilyName.trim() });
      
      setFamilyName(editFamilyName.trim());
      const updatedFamilies = [...families];
      updatedFamilies[selectedFamilyIndex].name = editFamilyName.trim();
      setFamilies(updatedFamilies);

      setIsEditingFamilyName(false);
      Alert.alert('Succès', 'Le nom de la famille a été mis à jour');
    } catch (error) {
      console.error('Error updating family name:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le nom de la famille');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    if (!editFirstName.trim() || !editLastName.trim()) {
      Alert.alert('Erreur', 'Le prénom et le nom ne peuvent pas être vides');
      return;
    }

    setIsSaving(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
      });
      
      setFirstName(editFirstName.trim());
      setLastName(editLastName.trim());
      setIsEditing(false);
      Alert.alert('Succès', 'Votre profil a été mis à jour');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le profil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditFirstName(firstName);
    setEditLastName(lastName);
    setIsEditing(false);
  };

  const handleShareFamilyCode = async () => {
    if (families.length === 0 || !families[selectedFamilyIndex]) return;
    const familyCode = families[selectedFamilyIndex].code;

    try {
      await Share.share({
        message: `Rejoins ma famille sur WeKid avec le code : ${familyCode}\n\nPour télécharger l'application : https://wekid.com/app`,
        title: 'Code famille WeKid',
      });
    } catch (error) {
      console.error('Error sharing family code:', error);
      Alert.alert('Erreur', 'Impossible de partager le code famille');
    }
  };

  const handleJoinFamily = async () => {
    if (!joinFamilyCode.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un code famille');
      return;
    }
    if (!user) return;

    try {
      setIsSaving(true);
      const newFamily = await joinFamilyByCode(user.uid, joinFamilyCode.trim());
      if (!newFamily) {
        Alert.alert('Erreur', 'Code famille invalide');
        return;
      }
      
      // Recharger les familles
      const userFamilies = await getUserFamilies(user.uid);
      setFamilies(userFamilies);
      setJoinFamilyCode('');
      setShowJoinFamily(false);
      Alert.alert('Succès', 'Vous avez rejoint la famille avec succès');
    } catch (error) {
      console.error('Error joining family:', error);
      Alert.alert('Erreur', 'Impossible de rejoindre la famille');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLeaveFamily = async (familyId: string) => {
    if (!user) return;

    Alert.alert(
      "Quitter la famille",
      "Êtes-vous sûr de vouloir quitter cette famille ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Quitter",
          style: "destructive",
          onPress: async () => {
            try {
              setIsSaving(true);
              await leaveFamilyById(user.uid, familyId);
              
              // Recharger les familles
              const userFamilies = await getUserFamilies(user.uid);
              setFamilies(userFamilies);
              setShowLeaveFamily(false);
              setSelectedFamilyIndex(0);
              Alert.alert('Succès', 'Vous avez quitté la famille');
            } catch (error) {
              console.error('Error leaving family:', error);
              Alert.alert('Erreur', 'Impossible de quitter la famille');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveChild = async (childId: string) => {
    if (!editingChildName.trim()) {
      Alert.alert('Erreur', 'Le nom ne peut pas être vide.');
      return;
    }
    if (families.length === 0 || !families[selectedFamilyIndex]) {
      Alert.alert('Erreur', 'ID de famille introuvable.');
      return;
    }
    const familyId = families[selectedFamilyIndex].id;

    const updatedChildren = children.map(child => 
      child.id === childId ? { ...child, name: editingChildName.trim() } : child
    );

    try {
      const familyDocRef = doc(db, 'families', familyId);
      await updateDoc(familyDocRef, { children: updatedChildren });
      setChildren(updatedChildren);
      setEditingChildId(null);
      setEditingChildName('');
    } catch (error) {
      console.error('Error updating child:', error);
      Alert.alert('Erreur', "Impossible de modifier l'enfant.");
    }
  };

  const handleAddChild = async () => {
    if (!newChildName.trim()) {
      Alert.alert('Erreur', "Veuillez entrer un nom pour l'enfant");
      return;
    }
    if (families.length === 0 || !families[selectedFamilyIndex]) {
      Alert.alert('Erreur', 'ID de famille introuvable.');
      return;
    }
    const familyId = families[selectedFamilyIndex].id;

    const newChild = {
      id: `${Date.now()}`,
      name: newChildName.trim(),
    };

    const updatedChildren = [...children, newChild];
    
    try {
      const familyDocRef = doc(db, 'families', familyId);
      await updateDoc(familyDocRef, { children: updatedChildren });
      setChildren(updatedChildren);
      setNewChildName('');
      setShowAddChild(false);
    } catch (error) {
      console.error('Error adding child:', error);
      Alert.alert('Erreur', "Impossible d'ajouter l'enfant.");
    }
  };

  const handleDeleteChild = async (childId: string) => {
    if (families.length === 0 || !families[selectedFamilyIndex]) {
      Alert.alert('Erreur', 'ID de famille introuvable.');
      return;
    }
    const familyId = families[selectedFamilyIndex].id;

    Alert.alert(
      "Supprimer l'enfant",
      "Êtes-vous sûr de vouloir supprimer cet enfant ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            const updatedChildren = children.filter(child => child.id !== childId);
            try {
              const familyDocRef = doc(db, 'families', familyId);
              await updateDoc(familyDocRef, { children: updatedChildren });
              setChildren(updatedChildren);
            } catch (error) {
              console.error('Error deleting child:', error);
              Alert.alert('Erreur', "Impossible de supprimer l'enfant.");
            }
          },
        },
      ]
    );
  };

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

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.containerCentered}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}> 
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.tint }]}>Profil</Text>
            {(!parentId || !professionalId) && (
              <TouchableOpacity style={[styles.addRoleButton, { backgroundColor: colors.cardBackground }]} onPress={handleAddMissingRole}>
                <IconSymbol name="person.badge.plus" size={18} color={colors.tint} />
                <Text style={[styles.addRoleText, { color: colors.tint }]}>
                  {!parentId ? 'Ajouter rôle Parent' : 'Ajouter rôle Professionnel'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.userInfoSection}>
            <Text style={[styles.name, { color: colors.text }]}>{firstName} {lastName}</Text>
          </View>

          {/* Profile Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handlePickImage} style={[styles.avatarCircle, { backgroundColor: colors.secondaryCardBackground }]}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <IconSymbol name="person.fill" size={60} color={colors.tint} />
              )}
               {isSaving && (
                <View style={styles.avatarLoading}>
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.avatarActions}>
              <TouchableOpacity onPress={handlePickImage} style={[styles.avatarButton, { backgroundColor: colors.tint }]}>
                <Text style={styles.avatarButtonText}>Modifier la photo</Text>
              </TouchableOpacity>
              {profileImage && (
              <TouchableOpacity onPress={handleRemoveImage} style={[styles.avatarButton, { backgroundColor: colors.dangerButton }]}>
                <Text style={styles.avatarButtonText}>Supprimer la photo</Text>
              </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Compte Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.tint }]}>Compte</Text>
            
            <View style={styles.subSectionHeader}>
              <Text style={[styles.subSectionTitle, { color: colors.textSecondary }]}>Informations personnelles</Text>
              {!isEditing && (
                <TouchableOpacity 
                  onPress={() => setIsEditing(true)} 
                  style={[styles.editButton, { backgroundColor: colors.tint }]}>
                  <IconSymbol name="pencil" size={14} color="#fff" />
                  <Text style={styles.editButtonText}>Modifier</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.infoRow}>
                <IconSymbol name="person" size={20} color={colors.textSecondary} />
                <View style={styles.infoText}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Prénom</Text>
                  {isEditing ? (
                    <TextInput
                      style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
                      value={editFirstName}
                      onChangeText={setEditFirstName}
                      placeholder="Prénom"
                      placeholderTextColor={colors.textSecondary}
                    />
                  ) : (
                    <Text style={[styles.infoValue, { color: colors.text }]}>{firstName}</Text>
                  )}
                </View>
              </View>
              
              <View style={[styles.separator, { backgroundColor: colors.border }]} />

              <View style={styles.infoRow}>
                <IconSymbol name="person" size={20} color={colors.textSecondary} />
                <View style={styles.infoText}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Nom</Text>
                  {isEditing ? (
                    <TextInput
                      style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
                      value={editLastName}
                      onChangeText={setEditLastName}
                      placeholder="Nom"
                      placeholderTextColor={colors.textSecondary}
                    />
                  ) : (
                    <Text style={[styles.infoValue, { color: colors.text }]}>{lastName}</Text>
                  )}
                </View>
              </View>

              <View style={[styles.separator, { backgroundColor: colors.border }]} />

              <View style={styles.infoRow}>
                <IconSymbol name="envelope" size={20} color={colors.textSecondary} />
                <View style={styles.infoText}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{email}</Text>
                </View>
              </View>
            </View>

            {isEditing && (
              <View style={styles.editButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.cancelButton, { backgroundColor: colors.cardBackground }]} 
                  onPress={handleCancelEdit}
                  disabled={isSaving}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.text }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.saveButton, { backgroundColor: colors.tint }]} 
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Enregistrer</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={[styles.settingCard, { backgroundColor: colors.cardBackground }]} onPress={handleOpenPrivacy}>
              <IconSymbol name="lock" size={24} color={colors.textSecondary} />
              <Text style={[styles.settingText, { color: colors.text }]}>Sécurités et confidentialité</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.settingCard, { backgroundColor: colors.cardBackground }]} onPress={handleOpenNotifications}>
              <IconSymbol name="bell" size={24} color={colors.textSecondary} />
              <Text style={[styles.settingText, { color: colors.text }]}>Notifications</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Subscription Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.tint }]}>Abonnement</Text>
              <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
                {loadingSubscription ? (
                  <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={colors.tint} />
                  </View>
                ) : subscriptionStatus?.hasActiveSubscription ? (
                  <>
                    <View style={styles.infoRow}>
                      <IconSymbol name="checkmark.circle.fill" size={24} color="#4CAF50" />
                      <View style={styles.infoText}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Statut</Text>
                        <Text style={[styles.infoValue, { color: '#4CAF50', fontWeight: '600' }]}>
                          Abonnement {subscriptionStatus.subscription?.status === 'trialing' ? 'Essai' : 'Actif'}
                        </Text>
                      </View>
                    </View>
                    {subscriptionStatus.subscription?.trialEnd || subscriptionStatus.subscription?.currentPeriodEnd ? (
                      <>
                        <View style={[styles.separator, { backgroundColor: colors.border }]} />
                        <View style={styles.infoRow}>
                          <IconSymbol name="calendar" size={20} color={colors.textSecondary} />
                          <View style={styles.infoText}>
                            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                              {subscriptionStatus.subscription?.status === 'trialing' ? 'Essai jusqu\'au' : 'Actif jusqu\'au'}
                            </Text>
                            <Text style={[styles.infoValue, { color: colors.text }]}>
                              {new Date((subscriptionStatus.subscription?.trialEnd || subscriptionStatus.subscription?.currentPeriodEnd) * 1000).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </Text>
                          </View>
                        </View>
                      </>
                    ) : null}
                    <View style={[styles.separator, { backgroundColor: colors.border }]} />
                    <TouchableOpacity 
                      onPress={() => router.push('/manage-subscription')}
                      style={[styles.settingCard, { backgroundColor: colors.cardBackground, marginHorizontal: 0 }]}
                    >
                      <Text style={[styles.settingText, { color: colors.tint }]}>Gérer mon abonnement</Text>
                      <IconSymbol name="chevron.right" size={20} color={colors.tint} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.infoRow}>
                      <IconSymbol name="xmark.circle.fill" size={24} color="#FF6B6B" />
                      <View style={styles.infoText}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Statut</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>Pas d'abonnement actif</Text>
                      </View>
                    </View>
                    <View style={[styles.separator, { backgroundColor: colors.border }]} />
                    <TouchableOpacity onPress={() => router.push('/subscription')} style={[styles.settingCard, { backgroundColor: colors.cardBackground, marginHorizontal: 0 }]}>
                      <Text style={[styles.settingText, { color: colors.tint }]}>Découvrir nos plans</Text>
                      <IconSymbol name="chevron.right" size={20} color={colors.tint} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.tint }]}>Famille</Text>
            
            {families.length > 0 && (
              <View style={[styles.infoCard, { backgroundColor: colors.cardBackground, marginBottom: V_SPACING.medium }]}>
                <View style={styles.subSectionHeader}>
                  <Text style={[styles.subSectionTitle, { color: colors.textSecondary }]}>Nom de la famille</Text>
                  {!isEditingFamilyName && (
                    <TouchableOpacity 
                      onPress={() => setIsEditingFamilyName(true)} 
                      style={[styles.editButton, { backgroundColor: colors.tint }]}>
                      <IconSymbol name="pencil" size={14} color="#fff" />
                      <Text style={styles.editButtonText}>Modifier</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {isEditingFamilyName ? (
                  <View>
                    <TextInput
                      style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
                      value={editFamilyName}
                      onChangeText={setEditFamilyName}
                      placeholder="Nom de la famille"
                      placeholderTextColor={colors.textSecondary}
                    />
                    <View style={styles.editButtonsContainer}>
                      <TouchableOpacity 
                        style={[styles.cancelButton, { backgroundColor: colors.cardBackground }]} 
                        onPress={() => setIsEditingFamilyName(false)}
                        disabled={isSaving}
                      >
                        <Text style={[styles.cancelButtonText, { color: colors.text }]}>Annuler</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.saveButton, { backgroundColor: colors.tint }]} 
                        onPress={handleSaveFamilyName}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.saveButtonText}>Enregistrer</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.infoValue, { color: colors.text, marginTop: V_SPACING.small }]}>{familyName}</Text>
                )}
              </View>
            )}
            
            {/* Boutons Rejoindre/Quitter famille */}
            <View style={styles.familyActionsContainer}>
              <TouchableOpacity 
                style={[styles.familyActionButton, { backgroundColor: colors.tint }]}
                onPress={() => setShowJoinFamily(true)}
              >
                <IconSymbol name="plus.circle" size={20} color="#fff" />
                <Text style={styles.familyActionButtonText}>Rejoindre une famille</Text>
              </TouchableOpacity>
              
              {families.length > 0 && (
                <TouchableOpacity 
                  style={[styles.familyActionButton, { backgroundColor: colors.dangerButton }]}
                  onPress={() => setShowLeaveFamily(true)}
                >
                  <IconSymbol name="xmark.circle" size={20} color="#fff" />
                  <Text style={styles.familyActionButtonText}>Quitter une famille</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Modal Rejoindre famille */}
            {showJoinFamily && (
              <View style={[styles.modalOverlay, { backgroundColor: colors.secondaryCardBackground, padding: SPACING.large, borderRadius: BORDER_RADIUS.large, marginBottom: V_SPACING.medium }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Rejoindre une nouvelle famille</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.textSecondary, marginVertical: V_SPACING.medium, paddingVertical: vs(12), paddingHorizontal: SPACING.medium, borderWidth: 1, borderRadius: BORDER_RADIUS.medium }]}
                  value={joinFamilyCode}
                  onChangeText={setJoinFamilyCode}
                  placeholder="Entrez le code famille"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="characters"
                />
                <View style={styles.modalButtonsContainer}>
                  <TouchableOpacity 
                    style={[styles.cancelButton, { flex: 1 }]}
                    onPress={() => {
                      setShowJoinFamily(false);
                      setJoinFamilyCode('');
                    }}
                  >
                    <Text style={[styles.cancelButtonText, { color: colors.text }]}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.saveButton, { flex: 1 }]}
                    onPress={handleJoinFamily}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Rejoindre</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Modal Quitter famille */}
            {showLeaveFamily && (
              <View style={[styles.modalOverlay, { backgroundColor: colors.secondaryCardBackground, padding: SPACING.large, borderRadius: BORDER_RADIUS.large, marginBottom: V_SPACING.medium }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Sélectionnez la famille à quitter</Text>
                <View style={styles.familyLeaveList}>
                  {families.map((family, index) => (
                    <TouchableOpacity
                      key={family.id}
                      style={[styles.familyLeaveItem, { backgroundColor: colors.cardBackground }]}
                      onPress={() => handleLeaveFamily(family.id)}
                    >
                      <View>
                        <Text style={[styles.familyLeaveTitle, { color: colors.text }]}>{family.name || `Famille ${index + 1}`}</Text>
                        <Text style={[styles.familyLeaveCode, { color: colors.textSecondary }]}>Code: {family.code}</Text>
                      </View>
                      <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity 
                  style={[styles.cancelButton, { marginTop: V_SPACING.medium }]}
                  onPress={() => setShowLeaveFamily(false)}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.text }]}>Annuler</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Sélecteur de famille */}
            {families.length > 1 && (
              <View style={[styles.infoCard, { backgroundColor: colors.cardBackground, marginBottom: V_SPACING.medium }]}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary, marginBottom: V_SPACING.small }]}>Sélectionner une famille :</Text>
                <View style={styles.familySelectorContainer}>
                  {families.map((family, index) => (
                    <TouchableOpacity
                      key={family.id}
                      style={[
                        styles.familyTab,
                        { 
                          backgroundColor: selectedFamilyIndex === index ? colors.tint : colors.secondaryCardBackground,
                          borderWidth: 2,
                          borderColor: selectedFamilyIndex === index ? colors.tint : 'transparent'
                        }
                      ]}
                      onPress={() => {
                        setSelectedFamilyIndex(index);
                      }}
                    >
                      <View style={styles.familyTabContent}>
                        <Text style={[
                          styles.familyTabText,
                          { color: selectedFamilyIndex === index ? '#fff' : colors.text }
                        ]}>
                          {family.name || `Famille ${index + 1}`}
                        </Text>
                        <Text style={[
                          styles.familyTabCode,
                          { color: selectedFamilyIndex === index ? '#fff' : colors.tint }
                        ]}>
                          Code: {family.code}
                        </Text>
                        <Text style={[
                          styles.familyTabMembers,
                          { color: selectedFamilyIndex === index ? 'rgba(255,255,255,0.8)' : colors.textSecondary }
                        ]}>
                          {familyMemberCounts[family.id] ?? (family.members?.length || 0)} membre{(familyMemberCounts[family.id] ?? (family.members?.length || 0)) > 1 ? 's' : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Code de la famille active */}
            {families.length > 0 && families[selectedFamilyIndex] && (
              <View style={[styles.infoCard, { backgroundColor: colors.cardBackground, marginBottom: V_SPACING.medium }]}>
                <View style={styles.infoRow}>
                  <IconSymbol name="number" size={20} color={colors.textSecondary} />
                  <View style={styles.infoText}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                      {families.length > 1 ? `Code famille active (${families[selectedFamilyIndex].name || `Famille ${selectedFamilyIndex + 1}`})` : 'Code famille'}
                    </Text>
                    <Text style={[styles.familyCodeDisplay, { color: colors.tint }]}>{families[selectedFamilyIndex].code}</Text>
                  </View>
                </View>
              </View>
            )}

            {families.length > 0 && familyMembers.length > 0 && (
              <View>
                <TouchableOpacity 
                  style={[styles.settingCard, { backgroundColor: colors.cardBackground }]} 
                  onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                  activeOpacity={0.7}
                >
                  <IconSymbol name="person.2" size={24} color={colors.textSecondary} />
                  <Text style={[styles.settingText, { color: colors.text }]}>Membres de la famille</Text>
                  <IconSymbol name={isDropdownOpen ? "chevron.up" : "chevron.down"} size={20} color={colors.tint} />
                </TouchableOpacity>

                {isDropdownOpen && (
                  <View style={styles.dropdownListContainer}>
                    {familyMembers.map((member) => (
                      <View key={member.id} style={[styles.memberCard, { backgroundColor: colors.secondaryCardBackground }]}>
                        <IconSymbol name="person.circle" size={30} color={colors.tint} />
                        <Text style={[styles.memberName, { color: colors.text }]}>{member.firstName} {member.lastName}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Children Section */}
            {families.length > 0 && (
            <View>
              <TouchableOpacity 
                style={[styles.settingCard, { backgroundColor: colors.cardBackground }]} 
                onPress={() => setIsChildrenDropdownOpen(!isChildrenDropdownOpen)}
                activeOpacity={0.7}
              >
                <IconSymbol name="person.3" size={24} color={colors.textSecondary} />
                <Text style={[styles.settingText, { color: colors.text }]}>Enfants</Text>
                <IconSymbol name={isChildrenDropdownOpen ? "chevron.up" : "chevron.down"} size={20} color={colors.tint} />
              </TouchableOpacity>

              {isChildrenDropdownOpen && (
                <View style={styles.dropdownListContainer}>
                  {children.map((child) => (
                    <View key={child.id} style={[styles.memberCard, { backgroundColor: colors.secondaryCardBackground, justifyContent: 'space-between' }]}>
                      {editingChildId === child.id ? (
                        <View style={styles.editChildContainer}>
                          <TextInput
                            style={[styles.input, {flex: 1, paddingVertical: 8, height: '100%', borderBottomColor: colors.tint }]}
                            value={editingChildName}
                            onChangeText={setEditingChildName}
                            autoFocus={true}
                          />
                          <TouchableOpacity style={{padding: 5}} onPress={() => handleSaveChild(child.id)}>
                            <IconSymbol name="checkmark.circle" size={24} color="green" />
                          </TouchableOpacity>
                          <TouchableOpacity style={{padding: 5}} onPress={() => setEditingChildId(null)}>
                            <IconSymbol name="x.circle" size={24} color="#FF3B30" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <>
                          <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                              <IconSymbol name="person.circle" size={30} color={colors.tint} />
                              <TouchableOpacity
                                onPress={() => { setSelectedChildForMedical(child); setMedicalModalVisible(true); }}
                                style={{ marginLeft: SPACING.regular }}
                                accessibilityLabel="Ouvrir la fiche médicale"
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Text style={[styles.memberName, { color: colors.text }]}>{child.name}</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => { setSelectedChildForMedical(child); setMedicalModalVisible(true); }}
                                style={{ padding: 6, marginLeft: 8 }}
                                accessibilityLabel="Fiche médicale"
                              >
                                <IconSymbol name="cross.case.fill" size={22} color="#34C759" />
                              </TouchableOpacity>
                          </View>
                          <View style={{flexDirection: 'row', alignItems: 'center', gap: 15, marginLeft: 10}}>
                            <TouchableOpacity onPress={() => { setEditingChildId(child.id); setEditingChildName(child.name); }} style={{ padding: 4 }}>
                                <IconSymbol name="pencil" size={20} color={colors.tint} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteChild(child.id)} style={{ padding: 4 }}>
                                <IconSymbol name="trash" size={20} color={colors.dangerButton} />
                            </TouchableOpacity>
                          </View>
                        </>
                      )}
                    </View>
                  ))}
                  {!editingChildId && (
                    showAddChild ? (
                        <View style={styles.addChildContainer}>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.textSecondary, marginBottom: 10, paddingVertical: 8, borderBottomWidth: 1 }]}
                                value={newChildName}
                                onChangeText={setNewChildName}
                                placeholder="Nom de l'enfant"
                                placeholderTextColor={colors.textSecondary}
                            />
                            <TouchableOpacity style={[styles.saveButton, {flex: 0, paddingVertical: 12}]} onPress={handleAddChild}>
                                <Text style={styles.saveButtonText}>Ajouter</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.addChildButton} onPress={() => setShowAddChild(true)}>
                            <Text style={styles.addChildButtonText}>+ Ajouter un enfant</Text>
                        </TouchableOpacity>
                    )
                  )}
                </View>
              )}
            </View>
            )}

            {families.length > 0 && (
              <TouchableOpacity 
                style={[styles.settingCard, { backgroundColor: colors.cardBackground }]}
                onPress={handleShareFamilyCode}
              >
                <IconSymbol name="square.and.arrow.up" size={24} color={colors.textSecondary} />
                <Text style={[styles.settingText, { color: colors.text }]}>Inviter un membre</Text>
                <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Support Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.tint }]}>Support</Text>
            
            <TouchableOpacity style={[styles.settingCard, { backgroundColor: colors.cardBackground }]} onPress={() => router.push('/(tabs)/Aide')}>
              <IconSymbol name="questionmark.circle" size={24} color={colors.textSecondary} />
              <Text style={[styles.settingText, { color: colors.text }]}>Centre d'aide</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.settingCard, { backgroundColor: colors.cardBackground }]} onPress={handleContactSupport}>
              <IconSymbol name="envelope" size={24} color={colors.textSecondary} />
              <Text style={[styles.settingText, { color: colors.text }]}>Nous contacter</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.settingCard, { backgroundColor: colors.cardBackground }]} onPress={handleRateApp}>
              <IconSymbol name="star" size={24} color={colors.textSecondary} />
              <Text style={[styles.settingText, { color: colors.text }]}>Evaluer l'application</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: colors.dangerButton }]} 
            onPress={handleLogout}
          >
            <IconSymbol name="arrow.right.square" size={20} color="#fff" />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>

          {/* Delete Profile Button */}
          <TouchableOpacity 
            style={[styles.deleteProfileButton, { backgroundColor: '#C0392B' }]} 
            onPress={() => setShowDeleteModal(true)}
          >
            <IconSymbol name="trash.fill" size={20} color="#fff" />
            <Text style={styles.deleteProfileText}>Supprimer mon profil</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* Delete Profile Modal */}
      <DeleteProfileModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        userId={user?.uid || ''}
      />

      {/* Child Medical Record Modal */}
      <Modal
        visible={medicalModalVisible}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setMedicalModalVisible(false)}
      >
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
          <ScrollView style={styles.scrollView}>
            <View style={styles.container}>
              <View style={{ 
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: V_SPACING.large,
                paddingHorizontal: SPACING.large,
                paddingTop: V_SPACING.medium
              }}>
                <TouchableOpacity 
                  onPress={() => setMedicalModalVisible(false)} 
                  style={{ 
                    width: hs(40),
                    height: hs(40),
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                  activeOpacity={0.7}
                >
                  <IconSymbol name="chevron.left" size={hs(28)} color={colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: colors.text, fontSize: FONT_SIZES.large, fontWeight: '700' }}>
                    Fiche médicale {selectedChildForMedical ? `- ${selectedChildForMedical.name}` : ''}
                  </Text>
                </View>
                <View style={{ width: hs(40) }} />
              </View>

              <View style={{ paddingHorizontal: SPACING.large, paddingBottom: SAFE_BOTTOM_SPACING }}>
                <ChildMedicalRecord
                  childName={selectedChildForMedical?.name}
                  initialRecord={(selectedChildFull as any)?.medicalRecord}
                  onConfirm={handleConfirmMedicalRecord}
                  saving={savingMedical}
                />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: SPACING.large,
    paddingTop: V_SPACING.large,
    paddingBottom: SAFE_BOTTOM_SPACING,
  },
  containerCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: V_SPACING.regular,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: FONT_SIZES.huge,
    fontWeight: '700',
  },
  addRoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: hs(6),
    paddingHorizontal: hs(10),
    paddingVertical: vs(6),
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  addRoleText: {
    fontSize: FONT_SIZES.small,
    fontWeight: '700',
  },
  userInfoSection: {
    marginBottom: V_SPACING.xlarge,
  },
  name: {
    fontSize: FONT_SIZES.xxlarge,
    fontWeight: '600',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: V_SPACING.xxlarge,
  },
  avatarCircle: {
    width: hs(120),
    height: hs(120),
    borderRadius: hs(60),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: vs(4) },
    shadowRadius: hs(12),
    elevation: 4,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLoading: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarActions: {
    flexDirection: 'row',
    gap: SPACING.medium,
    marginTop: V_SPACING.regular,
  },
  avatarButton: {
    paddingHorizontal: SPACING.regular,
    paddingVertical: vs(8),
    borderRadius: BORDER_RADIUS.medium,
  },
  avatarButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.regular,
    fontWeight: '600',
  },
  section: {
    marginBottom: V_SPACING.xxlarge,
  },
  subSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: V_SPACING.small,
    marginTop: V_SPACING.small,
  },
  subSectionTitle: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: '600',
    marginBottom: V_SPACING.medium,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.regular,
    paddingVertical: vs(8),
    borderRadius: BORDER_RADIUS.medium,
    gap: SPACING.tiny,
  },
  editButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.regular,
    fontWeight: '600',
  },
  infoCard: {
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.regular,
    marginBottom: V_SPACING.medium,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: vs(2) },
    shadowRadius: hs(8),
    elevation: 2,
  },
  separator: {
    height: 1,
    marginVertical: V_SPACING.small,
    marginLeft: SPACING.regular + 20, // Align with text
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: SPACING.regular,
    flex: 1,
  },
  infoLabel: {
    fontSize: FONT_SIZES.small,
    marginBottom: V_SPACING.tiny,
  },
  infoValue: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  input: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    borderBottomWidth: 1,
    paddingVertical: vs(4),
    paddingHorizontal: 0,
  },
  editButtonsContainer: {
    flexDirection: 'row',
    gap: SPACING.medium,
    marginBottom: V_SPACING.medium,
  },
  cancelButton: {
    flex: 1,
    borderRadius: BORDER_RADIUS.large,
    paddingVertical: V_SPACING.medium,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: vs(2) },
    shadowRadius: hs(8),
    elevation: 2,
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    borderRadius: BORDER_RADIUS.large,
    paddingVertical: V_SPACING.medium,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: vs(4) },
    shadowRadius: hs(10),
    elevation: 3,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.medium,
    fontWeight: '700',
  },
  settingCard: {
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.large,
    marginBottom: V_SPACING.medium,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: vs(2) },
    shadowRadius: hs(8),
    elevation: 2,
  },
  settingText: {
    flex: 1,
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    marginLeft: SPACING.regular,
  },
  logoutButton: {
    borderRadius: BORDER_RADIUS.large,
    paddingVertical: V_SPACING.regular,
    paddingHorizontal: SPACING.large,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: V_SPACING.medium,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: vs(4) },
    shadowRadius: hs(10),
    elevation: 3,
  },
  logoutText: {
    marginLeft: SPACING.small,
    fontWeight: '700',
    fontSize: FONT_SIZES.medium,
    color: '#fff',
  },
  deleteProfileButton: {
    borderRadius: BORDER_RADIUS.large,
    paddingVertical: V_SPACING.regular,
    paddingHorizontal: SPACING.large,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: V_SPACING.small,
    marginBottom: SAFE_BOTTOM_SPACING,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: vs(4) },
    shadowRadius: hs(10),
    elevation: 3,
  },
  deleteProfileText: {
    marginLeft: SPACING.small,
    fontWeight: '700',
    fontSize: FONT_SIZES.medium,
    color: '#fff',
  },
  dropdownListContainer: {
    paddingHorizontal: SPACING.small,
    paddingBottom: SPACING.small,
    marginTop: vs(-8),
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(8),
    paddingHorizontal: SPACING.medium,
    borderRadius: BORDER_RADIUS.medium,
    marginBottom: V_SPACING.tiny,
  },
  memberName: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    marginLeft: SPACING.regular,
  },
  editChildContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  addChildContainer: {
    marginTop: 10,
  },
  addChildButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 5,
  },
  addChildButtonText: {
    fontSize: 16,
    color: '#87CEEB',
    fontWeight: '600',
  },
  familySelectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.medium,
  },
  familyTab: {
    paddingVertical: vs(14),
    paddingHorizontal: SPACING.large,
    borderRadius: BORDER_RADIUS.large,
    minWidth: hs(140),
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: vs(2) },
    shadowRadius: hs(8),
    elevation: 2,
  },
  familyTabContent: {
    alignItems: 'center',
  },
  familyTabText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '700',
    marginBottom: V_SPACING.tiny,
  },
  familyTabCode: {
    fontSize: FONT_SIZES.regular,
    fontWeight: '600',
    marginBottom: V_SPACING.tiny,
  },
  familyTabMembers: {
    fontSize: FONT_SIZES.small,
  },
  familyCodeText: {
    fontSize: FONT_SIZES.small,
    marginTop: V_SPACING.tiny,
  },
  familyCodeDisplay: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: '700',
    letterSpacing: 2,
  },
  familyActionsContainer: {
    flexDirection: 'row',
    gap: SPACING.medium,
    marginBottom: V_SPACING.medium,
  },
  familyActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: V_SPACING.medium,
    paddingHorizontal: SPACING.small,
    borderRadius: BORDER_RADIUS.large,
    gap: SPACING.small,
    minHeight: vs(50),
  },
  familyActionButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'center',
  },
  modalOverlay: {
    marginVertical: V_SPACING.medium,
  },
  modalTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: '600',
    marginBottom: V_SPACING.small,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    gap: SPACING.medium,
  },
  familyLeaveList: {
    marginTop: V_SPACING.medium,
    gap: SPACING.small,
  },
  familyLeaveItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.regular,
    borderRadius: BORDER_RADIUS.medium,
  },
  familyLeaveTitle: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  familyLeaveCode: {
    fontSize: FONT_SIZES.small,
    marginTop: V_SPACING.tiny,
  },
});
