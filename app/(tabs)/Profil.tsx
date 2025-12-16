import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BORDER_RADIUS, FONT_SIZES, hs, SAFE_BOTTOM_SPACING, SPACING, V_SPACING, vs } from '@/constants/responsive';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db, getUserFamily, signOut } from '../../constants/firebase';

import * as ImagePicker from 'expo-image-picker';
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { Image } from 'react-native';

export default function ProfilScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [familyCode, setFamilyCode] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [familyId, setFamilyId] = useState<string | null>(null);
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
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
      setEmail(currentUser.email || '');
      const uid = currentUser.uid;

      const fetchData = async () => {
        try {
          const userDocRef = doc(db, 'users', uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const userFirstName = userData.firstName || 'Utilisateur';
            const userLastName = userData.lastName || '';
            setFirstName(userFirstName);
            setLastName(userLastName);
            setEditFirstName(userFirstName);
            setEditLastName(userLastName);
            if (userData.userType) {
              setUserRole(userData.userType);
            }
            if (userData.profileImage) {
              setProfileImage(userData.profileImage);
            }
          }

          const family = await getUserFamily(uid);
          if (family) {
            setFamilyId(family.id);
            setFamilyCode(family.code);
            const familyDoc = await getDoc(doc(db, 'families', family.id));
            if (familyDoc.exists()) {
                const familyData = familyDoc.data();
                setChildren(familyData.children || []);
            }

            if (family.members && family.members.length > 0) {
              const membersDetails = await Promise.all(
                family.members.map(async (memberId: string) => {
                  const memberDocRef = doc(db, 'users', memberId);
                  const memberDocSnap = await getDoc(memberDocRef);
                  if (memberDocSnap.exists()) {
                    const memberData = memberDocSnap.data();
                    return {
                      id: memberId,
                      firstName: memberData.firstName || 'Membre',
                      lastName: memberData.lastName || '',
                    };
                  }
                  return null;
                })
              );
              setFamilyMembers(membersDetails.filter(Boolean) as { id: string; firstName: string; lastName: string }[]);
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
      Alert.alert('Permission refusée', 'Vous devez autoriser l\'accès à la galerie pour changer votre photo de profil.');
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
    if (!familyCode) return;

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

  const handleSaveChild = async (childId: string) => {
    if (!editingChildName.trim()) {
      Alert.alert('Erreur', 'Le nom ne peut pas être vide.');
      return;
    }
    if (!familyId) {
      Alert.alert('Erreur', 'ID de famille introuvable.');
      return;
    }

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
    if (!familyId) {
      Alert.alert('Erreur', 'ID de famille introuvable.');
      return;
    }

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
    if (!familyId) {
      Alert.alert('Erreur', 'ID de famille introuvable.');
      return;
    }

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
      console.log('Calling signOut directly...');
      await signOut();
      console.log('SignOut completed, navigating...');
      router.replace('/(auth)/WelcomeScreen');
      console.log('Navigation called');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.safeArea}>
        <View style={styles.containerCentered}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.tint }]}>Profil</Text>
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

          {/* Account Info */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.tint }]}>Informations du compte</Text>
              {!isEditing && (
                <TouchableOpacity 
                  onPress={() => setIsEditing(true)} 
                  style={[styles.editButton, { backgroundColor: colors.tint }]}>
                  <IconSymbol name="pencil" size={18} color="#fff" />
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
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
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

            <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.infoRow}>
                <IconSymbol name="envelope" size={20} color={colors.textSecondary} />
                <View style={styles.infoText}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{email}</Text>
                </View>
              </View>
            </View>

            {familyCode && (
              <TouchableOpacity 
                style={[styles.infoCard, { backgroundColor: colors.cardBackground }]} 
                onPress={handleShareFamilyCode}
                activeOpacity={0.7}
              >
                <View style={styles.infoRow}>
                  <IconSymbol name="house" size={20} color={colors.textSecondary} />
                  <View style={styles.infoText}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Code famille</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{familyCode}</Text>
                  </View>
                  <IconSymbol name="square.and.arrow.up" size={20} color={colors.tint} />
                </View>
              </TouchableOpacity>
            )}

            {familyMembers.length > 0 && (
              <View>
                <TouchableOpacity 
                  style={[styles.infoCard, { backgroundColor: colors.cardBackground }]} 
                  onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                  activeOpacity={0.7}
                >
                  <View style={styles.infoRow}>
                    <IconSymbol name="person.2" size={20} color={colors.textSecondary} />
                    <View style={styles.infoText}>
                      <Text style={[styles.infoValue, { color: colors.text }]}>Membres de la famille</Text>
                    </View>
                    <IconSymbol name={isDropdownOpen ? "chevron.up" : "chevron.down"} size={20} color={colors.tint} />
                  </View>
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
            <View>
              <TouchableOpacity 
                style={[styles.infoCard, { backgroundColor: colors.cardBackground }]} 
                onPress={() => setIsChildrenDropdownOpen(!isChildrenDropdownOpen)}
                activeOpacity={0.7}
              >
                <View style={styles.infoRow}>
                  <IconSymbol name="person.3" size={20} color={colors.textSecondary} />
                  <View style={styles.infoText}>
                    <Text style={[styles.infoValue, { color: colors.text }]}>Enfants</Text>
                  </View>
                  <IconSymbol name={isChildrenDropdownOpen ? "chevron.up" : "chevron.down"} size={20} color={colors.tint} />
                </View>
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
                          <View style={{flexDirection: 'row', alignItems: 'center'}}>
                              <IconSymbol name="person.circle" size={30} color={colors.tint} />
                              <Text style={[styles.memberName, { color: colors.text }]}>{child.name}</Text>
                          </View>
                          <View style={{flexDirection: 'row', alignItems: 'center', gap: 15}}>
                            <TouchableOpacity onPress={() => { setEditingChildId(child.id); setEditingChildName(child.name); }}>
                                <IconSymbol name="pencil" size={24} color={colors.tint} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteChild(child.id)}>
                                <IconSymbol name="trash" size={24} color={colors.dangerButton} />
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
          </View>

          {/* Settings */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.tint }]}>Paramètres</Text>
            
            <TouchableOpacity style={[styles.settingCard, { backgroundColor: colors.cardBackground }]}>
              <IconSymbol name="bell" size={24} color={colors.textSecondary} />
              <Text style={[styles.settingText, { color: colors.text }]}>Notifications</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.settingCard, { backgroundColor: colors.cardBackground }]}>
              <IconSymbol name="lock" size={24} color={colors.textSecondary} />
              <Text style={[styles.settingText, { color: colors.text }]}>Confidentialité</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.settingCard, { backgroundColor: colors.cardBackground }]}>
              <IconSymbol name="questionmark.circle" size={24} color={colors.textSecondary} />
              <Text style={[styles.settingText, { color: colors.text }]}>Aide</Text>
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

        </View>
      </ScrollView>
    </ThemedView>
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
  },
  title: {
    fontSize: FONT_SIZES.huge,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: V_SPACING.regular,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: '600',
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
});
