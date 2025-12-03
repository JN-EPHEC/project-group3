import { useRouter } from 'expo-router';
import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { auth, db } from '../../constants/firebase';
import { Colors } from '../../constants/theme';

export default function ProHomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
      const uid = currentUser.uid;

      const fetchData = async () => {
        try {
          const userDocRef = doc(db, 'users', uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setFirstName(userDocSnap.data().firstName || 'Professionnel');
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    } else {
      router.replace('/(auth)/WelcomeScreen');
    }
  }, [router]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.containerCentered}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.tint }]}>Espace Professionnel</Text>
          </View>

          <View style={styles.welcomeSection}>
            <Text style={[styles.greeting, { color: colors.textTertiary }]}>Bonjour,</Text>
            <Text style={[styles.name, { color: colors.text }]}>{firstName}</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.tint }]}>Tableau de bord</Text>
            <View style={[styles.statsCard, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.statsText, { color: colors.text }]}>Bienvenue dans votre espace professionnel</Text>
            </View>
          </View>
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
  welcomeSection: { marginBottom: 24 },
  greeting: { fontSize: 14, color: '#9AA6B2' },
  name: { fontSize: 24, fontWeight: '600', color: '#111', marginTop: 4 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 22, fontWeight: '600', marginBottom: 16 },
  statsCard: { backgroundColor: '#FFF5EE', borderRadius: 20, padding: 24 },
  statsText: { color: '#000', fontSize: 15, textAlign: 'center' },
});
