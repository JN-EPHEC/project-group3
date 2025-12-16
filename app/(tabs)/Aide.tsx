import { IconSymbol } from '@/components/ui/icon-symbol';
import { BORDER_RADIUS, FONT_SIZES, hs, SAFE_BOTTOM_SPACING, SPACING, V_SPACING, vs } from '@/constants/responsive';
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
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.tint }]}>Aide</Text>
          </View>

          {/* FAQ Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.tint }]}>Questions fréquentes</Text>
            
            <TouchableOpacity style={[styles.faqCard, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.faqQuestion, { color: colors.text }]}>Comment créer un évènement ?</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.faqCard, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.faqQuestion, { color: colors.text }]}>Comment rejoindre une famille ?</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.faqCard, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.faqQuestion, { color: colors.text }]}>Comment gérer mes notifications ?</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Contact Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.tint }]}>Nous contacter</Text>
            
            <TouchableOpacity style={[styles.contactCard, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.iconCircle, { backgroundColor: colors.tint }]}>
                <IconSymbol name="envelope.fill" size={24} color="#fff" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactTitle, { color: colors.textSecondary }]}>Email</Text>
                <Text style={[styles.contactDetail, { color: colors.text }]}>support@wekid.com</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.contactCard, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.iconCircle, { backgroundColor: colors.tint }]}>
                <IconSymbol name="phone.fill" size={24} color="#fff" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactTitle, { color: colors.textSecondary }]}>Téléphone</Text>
                <Text style={[styles.contactDetail, { color: colors.text }]}>+33 1 23 45 67 89</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Resources Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.tint }]}>Ressources utiles</Text>
            <View style={[styles.tipCard, { backgroundColor: colors.tipCardBackground }]}>
              <Text style={[styles.tipText, { color: colors.text }]}>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: V_SPACING.xlarge,
  },
  title: {
    fontSize: FONT_SIZES.huge,
    fontWeight: '700',
  },
  logo: {
    width: hs(60),
    height: hs(60),
    borderRadius: hs(100),
  },
  section: {
    marginBottom: V_SPACING.xxlarge,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: '600',
    marginBottom: V_SPACING.regular,
  },
  faqCard: {
    borderRadius: BORDER_RADIUS.large,
    paddingVertical: V_SPACING.large,
    paddingHorizontal: SPACING.large,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: V_SPACING.medium,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: vs(2) },
    shadowRadius: hs(8),
    elevation: 2,
  },
  faqQuestion: {
    fontSize: FONT_SIZES.regular,
    fontWeight: '600',
    flex: 1,
  },
  contactCard: {
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.regular,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: V_SPACING.medium,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: vs(2) },
    shadowRadius: hs(8),
    elevation: 2,
  },
  iconCircle: {
    width: hs(50),
    height: hs(50),
    borderRadius: hs(25),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.regular,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: FONT_SIZES.regular,
    marginBottom: V_SPACING.tiny,
  },
  contactDetail: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  tipCard: {
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.xlarge,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: vs(4) },
    shadowRadius: hs(10),
    elevation: 2,
  },
  tipText: {
    fontSize: FONT_SIZES.regular,
    textAlign: 'center',
    lineHeight: vs(22),
  },
});
