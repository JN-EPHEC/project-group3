import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../constants/firebase';

export default function AideScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? 'light'].tint;

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
            setFirstName(userDocSnap.data().firstName || 'Utilisateur');
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Aide</Text>
          </View>

          {/* FAQ Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#87CEEB' }]}>Questions fréquentes</Text>
            
            <TouchableOpacity style={styles.faqCard}>
              <Text style={styles.faqQuestion}>Comment créer un évènement ?</Text>
              <IconSymbol name="chevron.right" size={20} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.faqCard}>
              <Text style={styles.faqQuestion}>Comment rejoindre une famille ?</Text>
              <IconSymbol name="chevron.right" size={20} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.faqCard}>
              <Text style={styles.faqQuestion}>Comment gérer mes notifications ?</Text>
              <IconSymbol name="chevron.right" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Contact Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#87CEEB' }]}>Nous contacter</Text>
            
            <TouchableOpacity style={styles.contactCard}>
              <View style={[styles.iconCircle, { backgroundColor: '#87CEEB' }]}>
                <IconSymbol name="envelope.fill" size={24} color="#fff" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Email</Text>
                <Text style={styles.contactDetail}>support@wekid.com</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactCard}>
              <View style={[styles.iconCircle, { backgroundColor: '#87CEEB' }]}>
                <IconSymbol name="phone.fill" size={24} color="#fff" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Téléphone</Text>
                <Text style={styles.contactDetail}>+33 1 23 45 67 89</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Resources Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#87CEEB' }]}>Ressources utiles</Text>
            <View style={styles.tipCard}>
              <Text style={styles.tipText}>
                Consultez notre guide complet pour tirer le meilleur parti de WeKid et faciliter la communication avec votre co-parent.
              </Text>
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#87CEEB',
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 100,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
  },
  faqCard: {
    backgroundColor: '#E8E8E8',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    flex: 1,
  },
  contactCard: {
    backgroundColor: '#E8E8E8',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  contactDetail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  tipCard: {
    backgroundColor: '#FFFACD',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  tipText: {
    color: '#000',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
