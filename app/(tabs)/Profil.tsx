import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db, getUserFamily, signOut } from '../../constants/firebase';

export default function ProfilScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [familyCode, setFamilyCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();

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
            setFirstName(userDocSnap.data().firstName || 'Utilisateur');
          }

          const family = await getUserFamily(uid);
          if (family) {
            setFamilyCode(family.code);
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

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/LoginScreen');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.containerCentered}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ThemedView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Mon Profil</Text>
              <Text style={styles.name}>{firstName}</Text>
            </View>

            <TouchableOpacity onPress={() => router.push('/(tabs)')}>
              <Image 
                source={require('../../ImageAndLogo/LogoWeKid.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          {/* Profile Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <IconSymbol name="person.fill" size={60} color="#87CEEB" />
            </View>
          </View>

          {/* Account Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#87CEEB' }]}>Informations du compte</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <IconSymbol name="person" size={20} color="#666" />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Nom</Text>
                  <Text style={styles.infoValue}>{firstName}</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <IconSymbol name="envelope" size={20} color="#666" />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{email}</Text>
                </View>
              </View>
            </View>

            {familyCode && (
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <IconSymbol name="house" size={20} color="#666" />
                  <View style={styles.infoText}>
                    <Text style={styles.infoLabel}>Code famille</Text>
                    <Text style={styles.infoValue}>{familyCode}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Settings */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#87CEEB' }]}>Paramètres</Text>
            
            <TouchableOpacity style={styles.settingCard}>
              <IconSymbol name="bell" size={24} color="#666" />
              <Text style={styles.settingText}>Notifications</Text>
              <IconSymbol name="chevron.right" size={20} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingCard}>
              <IconSymbol name="lock" size={24} color="#666" />
              <Text style={styles.settingText}>Confidentialité</Text>
              <IconSymbol name="chevron.right" size={20} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingCard}>
              <IconSymbol name="questionmark.circle" size={24} color="#666" />
              <Text style={styles.settingText}>Aide</Text>
              <IconSymbol name="chevron.right" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
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
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
  },
  containerCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: '#9AA6B2',
  },
  name: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111',
    marginTop: 4,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 100,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E7F7FF',
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
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#E8E8E8',
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
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  settingCard: {
    backgroundColor: '#E8E8E8',
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
    color: '#111',
    marginLeft: 16,
  },
  logoutButton: {
    backgroundColor: '#FF6B6B',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
});
