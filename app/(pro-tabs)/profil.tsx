import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db, signOut } from '../../constants/firebase';

export default function ProProfilScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setEmail(currentUser.email || '');
      const uid = currentUser.uid;

      const fetchData = async () => {
        try {
          const userDocRef = doc(db, 'users', uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setFirstName(userDocSnap.data().firstName || 'Professionnel');
            setLastName(userDocSnap.data().lastName || '');
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
    try {
      await signOut();
      router.replace('/(auth)/WelcomeScreen');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.containerCentered}>
          <ActivityIndicator size="large" color="#FFCEB0" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Profil</Text>
          </View>

          <View style={styles.userInfoSection}>
            <Text style={styles.name}>{firstName} {lastName}</Text>
          </View>

          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <IconSymbol name="person.fill" size={60} color="#FFCEB0" />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#FFCEB0' }]}>Informations du compte</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <IconSymbol name="person" size={20} color="#666" />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Nom</Text>
                  <Text style={styles.infoValue}>{firstName} {lastName}</Text>
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
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <IconSymbol name="arrow.right.square" size={20} color="#fff" />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  scrollView: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32 },
  containerCentered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#FFCEB0' },
  userInfoSection: { marginBottom: 24 },
  name: { fontSize: 24, fontWeight: '600', color: '#111' },
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#FFF5EE', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 22, fontWeight: '600', marginBottom: 16 },
  infoCard: { backgroundColor: '#E8E8E8', borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoText: { marginLeft: 16, flex: 1 },
  infoLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: '600', color: '#111' },
  logoutButton: { backgroundColor: '#FF6B6B', borderRadius: 20, paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 3 },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '700', marginLeft: 10 },
});
