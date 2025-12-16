import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db, getUserFamily, signOut } from '../../constants/firebase';

export default function ProfilScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [familyCode, setFamilyCode] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
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
            const userFirstName = userDocSnap.data().firstName || 'Utilisateur';
            const userLastName = userDocSnap.data().lastName || '';
            setFirstName(userFirstName);
            setLastName(userLastName);
            setEditFirstName(userFirstName);
            setEditLastName(userLastName);
          }

          const family = await getUserFamily(uid);
          if (family) {
            setFamilyCode(family.code);
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
        message: `Rejoins ma famille sur l'application ! Utilise ce code : ${familyCode}`,
        title: 'Code famille',
      });
    } catch (error) {
      console.error('Error sharing family code:', error);
      Alert.alert('Erreur', 'Impossible de partager le code famille');
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
            <View style={[styles.avatarCircle, { backgroundColor: colors.secondaryCardBackground }]}>
              <IconSymbol name="person.fill" size={60} color={colors.tint} />
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
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 120,
  },
  containerCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  userInfoSection: {
    marginBottom: 24,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
    borderBottomWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  editButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  settingCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 16,
  },
  logoutButton: {
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  logoutText: {
    marginLeft: 10,
    fontWeight: '700',
    fontSize: 16,
    color: '#fff',
  },
  dropdownListContainer: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    marginTop: -8,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 16,
  },
});
